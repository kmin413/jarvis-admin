"""FastAPI 앱 — 오감몬스터 예약 시스템 백엔드 (DGX 로컬, SQLite).

인증:
  - 모든 일반 엔드포인트는 require_approved (로그인+관리자 승인 필요)
  - 관리자 전용 엔드포인트는 require_admin
  - 공개 엔드포인트: /api/auth/signup, /api/auth/login, /api/admin/auth/login, /api/health

엔드포인트:
  공개:
    POST /api/auth/signup                     → 회원가입 (pending 상태)
    POST /api/auth/login                      → 회원 로그인 (token)
    POST /api/admin/auth/login                → 관리자 로그인 (token)
    GET  /api/health
  인증 필요:
    GET  /api/auth/me                         → 현재 사용자 정보
    GET  /api/themes                          → 테마 목록 (승인된 회원만)
    GET  /api/themes/{id}                     → 단일 테마
    POST /api/reservations                    → 예약 신청
    GET  /api/reservations/mine               → 내 예약 목록
    GET  /api/availability?year&month         → 캘린더용 가용성
    GET  /api/availability/{date}             → 특정 날짜 가능 테마
  관리자 전용:
    GET  /api/admin/users?status              → 회원 목록 (status 필터)
    PATCH /api/admin/users/{id}               → 회원 승인/거절/메모
    GET  /api/admin/reservations              → 전체 예약 (필터)
    PATCH /api/admin/reservations/{id}        → 예약 상태/메모 변경
    GET  /api/admin/stats                     → 통계 (예약 건수, 매출, 인기 테마)
    GET  /api/admin/blocked-slots             → 블락 슬롯 목록
    POST /api/admin/blocked-slots             → 블락 슬롯 추가
    DELETE /api/admin/blocked-slots/{id}      → 블락 슬롯 삭제
"""
from __future__ import annotations

import sqlite3
from contextlib import asynccontextmanager
from datetime import date as DateT, datetime, timedelta
from pathlib import Path
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator

import auth as auth_mod

DB_PATH = Path(__file__).parent / "data.db"

DEFAULT_SLOTS = ["10:00", "11:30", "14:00", "16:00"]
SLOT_CAPACITY = 2


# ─── DB 헬퍼 ───
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ═══════════════════ Pydantic 모델 ═══════════════════
class ThemeOut(BaseModel):
    id: int
    name: str
    category: str
    catLabel: str = Field(alias="cat_label")
    emoji: Optional[str]
    durationMin: int = Field(alias="duration_min")
    priceKrw: int = Field(alias="price_krw")
    img: str
    description: Optional[str]
    popular: bool
    isNew: bool = Field(alias="is_new")
    badge: Optional[str]
    visible: bool = True

    model_config = {"populate_by_name": True}

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "ThemeOut":
        # visible 컬럼이 없는 경우 (마이그레이션 전) 호환성
        try:
            vis = bool(row["visible"])
        except (IndexError, KeyError):
            vis = True
        return cls(
            id=row["id"], name=row["name"], category=row["category"],
            cat_label=row["cat_label"], emoji=row["emoji"],
            duration_min=row["duration_min"], price_krw=row["price_krw"],
            img=row["img"], description=row["description"],
            popular=bool(row["popular"]), is_new=bool(row["is_new"]),
            badge=row["badge"],
            visible=vis,
        )


class ThemePatch(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    cat_label: Optional[str] = Field(default=None, max_length=40)
    emoji: Optional[str] = Field(default=None, max_length=10)
    duration_min: Optional[int] = Field(default=None, ge=5, le=240)
    price_krw: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    description: Optional[str] = Field(default=None, max_length=500)
    popular: Optional[bool] = None
    is_new: Optional[bool] = None
    badge: Optional[str] = Field(default=None, max_length=20)
    visible: Optional[bool] = None


class ReservationIn(BaseModel):
    theme_id: int = Field(..., ge=1)
    reservation_date: str
    time_slot: str
    child_count: str = Field(..., min_length=1, max_length=40)
    class_count: str = Field(..., min_length=1, max_length=40)
    kindergarten_name: str = Field(..., min_length=1, max_length=120)
    contact_name: str = Field(..., min_length=1, max_length=40)
    contact_phone: str = Field(..., min_length=4, max_length=30)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("reservation_date")
    @classmethod
    def _date_fmt(cls, v: str) -> str:
        try:
            d = datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValueError("reservation_date는 YYYY-MM-DD 형식이어야 합니다") from exc
        if d < DateT.today():
            raise ValueError("과거 날짜는 예약할 수 없습니다")
        return v

    @field_validator("time_slot")
    @classmethod
    def _slot_fmt(cls, v: str) -> str:
        if v not in DEFAULT_SLOTS:
            raise ValueError(f"time_slot은 {DEFAULT_SLOTS} 중 하나여야 합니다")
        return v


class ReservationOut(BaseModel):
    id: int
    theme_id: int
    theme_name: Optional[str] = None
    theme_emoji: Optional[str] = None
    theme_img: Optional[str] = None
    reservation_date: str
    time_slot: str
    child_count: str
    class_count: str
    kindergarten_name: str
    contact_name: str
    contact_phone: str
    note: Optional[str]
    status: str
    admin_memo: Optional[str]
    user_id: Optional[int] = None
    created_at: str
    updated_at: str

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "ReservationOut":
        d = dict(row)
        return cls(**d)


class ReservationPatch(BaseModel):
    status: Optional[Literal["pending", "confirmed", "rejected", "cancelled", "done"]] = None
    admin_memo: Optional[str] = Field(default=None, max_length=1000)


class AvailabilityDay(BaseModel):
    date: str
    booked_count: int
    blocked: bool
    status: Literal["available", "limited", "full"]


class DateAvailabilityTheme(BaseModel):
    theme: ThemeOut
    available_slots: list[str]


# ─── Auth Models ───
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    kindergarten_name: str = Field(..., min_length=1, max_length=120)
    contact_name: str = Field(..., min_length=1, max_length=40)
    contact_phone: str = Field(..., min_length=4, max_length=30)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    kindergarten_name: str
    contact_name: str
    contact_phone: str
    role: str
    status: str
    admin_memo: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str
    updated_at: str

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "UserOut":
        d = dict(row)
        d.pop("password_hash", None)
        d.pop("approved_by", None)
        return cls(**d)


class UserPatch(BaseModel):
    status: Optional[Literal["pending", "approved", "rejected", "suspended"]] = None
    admin_memo: Optional[str] = Field(default=None, max_length=1000)


class TokenOut(BaseModel):
    token: str
    user: UserOut


class BlockedSlotIn(BaseModel):
    block_date: str
    time_slot: Optional[str] = None
    reason: Optional[str] = Field(default=None, max_length=200)

    @field_validator("block_date")
    @classmethod
    def _date_fmt(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("block_date는 YYYY-MM-DD") from exc
        return v


class BlockedSlotOut(BaseModel):
    id: int
    block_date: str
    time_slot: Optional[str]
    reason: Optional[str]
    created_at: str


# ═══════════════════ 앱 생애주기 ═══════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    if not DB_PATH.exists():
        raise RuntimeError(f"DB 파일이 없습니다 ({DB_PATH}). 먼저 `python3 seed.py`를 실행하세요.")
    auth_mod.migrate_and_seed_admin()
    yield


app = FastAPI(title="Ogam Monster Reservation API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
    allow_credentials=False,
)


# ═══════════════════ 공개 엔드포인트 ═══════════════════
@app.get("/")
def root():
    return {"service": "ogam-reservation-api", "status": "ok"}


@app.get("/api/health")
def health():
    return {"ok": True, "db": DB_PATH.name, "ts": datetime.utcnow().isoformat() + "Z"}


# ─── 회원가입 / 로그인 ───
@app.post("/api/auth/signup", response_model=UserOut, status_code=201)
def signup(payload: SignupIn):
    email_norm = payload.email.lower().strip()
    with get_db() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email_norm,)).fetchone():
            raise HTTPException(409, "이미 가입된 이메일입니다.")
        cur = conn.execute(
            """INSERT INTO users
                 (email, password_hash, kindergarten_name, contact_name, contact_phone, role, status)
               VALUES (?, ?, ?, ?, ?, 'customer', 'pending')""",
            (
                email_norm,
                auth_mod.hash_password(payload.password),
                payload.kindergarten_name.strip(),
                payload.contact_name.strip(),
                payload.contact_phone.strip(),
            ),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute(
            "SELECT id, email, kindergarten_name, contact_name, contact_phone, role, status, "
            "admin_memo, approved_at, created_at, updated_at FROM users WHERE id = ?",
            (new_id,),
        ).fetchone()
        return UserOut.from_row(row)


def _do_login(payload: LoginIn, require_admin_role: bool = False) -> TokenOut:
    user = auth_mod.get_user_by_email(payload.email)
    if not user or not auth_mod.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")
    if require_admin_role and user["role"] != "admin":
        raise HTTPException(403, "관리자 계정이 아닙니다.")
    if user["status"] == "rejected":
        raise HTTPException(403, "가입이 거절되었습니다. 사유: " + (user.get("admin_memo") or "관리자에게 문의하세요."))
    if user["status"] == "suspended":
        raise HTTPException(403, "계정이 일시 정지되었습니다.")

    token = auth_mod.create_token(user["id"], user["role"])
    public = {k: v for k, v in user.items() if k not in ("password_hash", "approved_by")}
    return TokenOut(token=token, user=UserOut(**public))


@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginIn):
    return _do_login(payload, require_admin_role=False)


@app.post("/api/admin/auth/login", response_model=TokenOut)
def admin_login(payload: AdminLoginIn):
    return _do_login(LoginIn(email=payload.email, password=payload.password), require_admin_role=True)


# ═══════════════════ 인증 필요 (사용자) ═══════════════════
@app.get("/api/auth/me", response_model=UserOut)
def me(user=Depends(auth_mod.current_user)):
    return UserOut(**user)


# ─── Themes ───
@app.get("/api/themes", response_model=list[ThemeOut])
def list_themes(
    category: Optional[str] = None,
    popular: Optional[bool] = None,
    user=Depends(auth_mod.require_approved),
):
    with get_db() as conn:
        # 관리자는 비공개 테마도 볼 수 있음 (편의)
        show_hidden = user["role"] == "admin"
        q = "SELECT * FROM themes WHERE 1=1"
        args: list = []
        if not show_hidden:
            q += " AND visible = 1"
        if category:
            q += " AND category = ?"
            args.append(category)
        if popular is not None:
            q += " AND popular = ?"
            args.append(1 if popular else 0)
        q += " ORDER BY id"
        rows = conn.execute(q, args).fetchall()
        return [ThemeOut.from_row(r) for r in rows]


@app.get("/api/themes/{theme_id}", response_model=ThemeOut)
def get_theme(theme_id: int, user=Depends(auth_mod.require_approved)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM themes WHERE id = ?", (theme_id,)).fetchone()
        if not row:
            raise HTTPException(404, f"theme {theme_id} not found")
        return ThemeOut.from_row(row)


# ─── Reservations (고객) ───
def _slot_capacity_remaining(conn: sqlite3.Connection, date_str: str, slot: str) -> int:
    booked = conn.execute(
        """SELECT COUNT(*) FROM reservations
            WHERE reservation_date = ? AND time_slot = ?
              AND status IN ('pending','confirmed','done')""",
        (date_str, slot),
    ).fetchone()[0]
    return SLOT_CAPACITY - booked


@app.post("/api/reservations", response_model=ReservationOut, status_code=201)
def create_reservation(payload: ReservationIn, user=Depends(auth_mod.require_approved)):
    with get_db() as conn:
        theme = conn.execute(
            "SELECT id, name, emoji, img FROM themes WHERE id = ?", (payload.theme_id,)
        ).fetchone()
        if not theme:
            raise HTTPException(404, f"theme {payload.theme_id} not found")

        remaining = _slot_capacity_remaining(conn, payload.reservation_date, payload.time_slot)
        if remaining <= 0:
            raise HTTPException(409, "해당 시간대는 마감되었습니다. 다른 시간을 선택해주세요.")

        blocked = conn.execute(
            """SELECT 1 FROM blocked_slots
                WHERE block_date = ? AND (time_slot IS NULL OR time_slot = ?)
                LIMIT 1""",
            (payload.reservation_date, payload.time_slot),
        ).fetchone()
        if blocked:
            raise HTTPException(409, "해당 시간대는 예약을 받지 않습니다.")

        cur = conn.execute(
            """INSERT INTO reservations
                  (theme_id, reservation_date, time_slot, child_count, class_count,
                   kindergarten_name, contact_name, contact_phone, note, user_id)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                payload.theme_id, payload.reservation_date, payload.time_slot,
                payload.child_count, payload.class_count,
                payload.kindergarten_name, payload.contact_name, payload.contact_phone,
                payload.note, user["id"],
            ),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute(
            """SELECT r.*, t.name AS theme_name, t.emoji AS theme_emoji, t.img AS theme_img
                 FROM reservations r JOIN themes t ON t.id = r.theme_id
                WHERE r.id = ?""",
            (new_id,),
        ).fetchone()
        return ReservationOut.from_row(row)


@app.get("/api/reservations/mine", response_model=list[ReservationOut])
def my_reservations(user=Depends(auth_mod.require_approved), limit: int = Query(default=100, le=500)):
    """내 예약 목록 (고객 본인 또는 관리자도 사용 가능)."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT r.*, t.name AS theme_name, t.emoji AS theme_emoji, t.img AS theme_img
                 FROM reservations r JOIN themes t ON t.id = r.theme_id
                WHERE r.user_id = ?
                ORDER BY r.reservation_date DESC, r.time_slot ASC, r.id DESC
                LIMIT ?""",
            (user["id"], limit),
        ).fetchall()
        return [ReservationOut.from_row(r) for r in rows]


@app.patch("/api/reservations/mine/{res_id}", response_model=ReservationOut)
def cancel_my_reservation(res_id: int, user=Depends(auth_mod.require_approved)):
    """본인 예약 취소 (pending/confirmed → cancelled)."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT user_id, status FROM reservations WHERE id = ?", (res_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "예약을 찾을 수 없습니다.")
        if row["user_id"] != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "본인 예약만 취소할 수 있습니다.")
        if row["status"] not in ("pending", "confirmed"):
            raise HTTPException(409, "이미 처리된 예약은 취소할 수 없습니다.")
        conn.execute("UPDATE reservations SET status = 'cancelled' WHERE id = ?", (res_id,))
        conn.commit()
        out = conn.execute(
            """SELECT r.*, t.name AS theme_name, t.emoji AS theme_emoji, t.img AS theme_img
                 FROM reservations r JOIN themes t ON t.id = r.theme_id
                WHERE r.id = ?""",
            (res_id,),
        ).fetchone()
        return ReservationOut.from_row(out)


# ─── Availability ───
@app.get("/api/availability", response_model=list[AvailabilityDay])
def availability_month(
    year: int = Query(..., ge=2025, le=2030),
    month: int = Query(..., ge=1, le=12),
    user=Depends(auth_mod.require_approved),
):
    from calendar import monthrange
    days = monthrange(year, month)[1]
    today = DateT.today()
    out: list[AvailabilityDay] = []
    with get_db() as conn:
        total_capacity = len(DEFAULT_SLOTS) * SLOT_CAPACITY
        for d in range(1, days + 1):
            ds = f"{year:04d}-{month:02d}-{d:02d}"
            booked = conn.execute(
                """SELECT COUNT(*) FROM reservations
                    WHERE reservation_date = ?
                      AND status IN ('pending','confirmed','done')""",
                (ds,),
            ).fetchone()[0]
            blocked = (
                conn.execute(
                    "SELECT 1 FROM blocked_slots WHERE block_date = ? AND time_slot IS NULL LIMIT 1",
                    (ds,),
                ).fetchone() is not None
            )
            day_date = DateT(year, month, d)
            if day_date < today or blocked or booked >= total_capacity:
                st = "full"
            elif booked >= total_capacity * 0.6:
                st = "limited"
            else:
                st = "available"
            out.append(AvailabilityDay(date=ds, booked_count=booked, blocked=blocked, status=st))
    return out


@app.get("/api/availability/{date_str}", response_model=list[DateAvailabilityTheme])
def availability_date(date_str: str, user=Depends(auth_mod.require_approved)):
    try:
        DateT.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(400, "date는 YYYY-MM-DD 형식이어야 합니다")
    with get_db() as conn:
        blocked_rows = conn.execute(
            "SELECT time_slot FROM blocked_slots WHERE block_date = ?", (date_str,)
        ).fetchall()
        blocked_full_day = any(r["time_slot"] is None for r in blocked_rows)
        blocked_slots = {r["time_slot"] for r in blocked_rows if r["time_slot"]}
        if blocked_full_day:
            return []
        slot_remaining: dict[str, int] = {}
        for s in DEFAULT_SLOTS:
            slot_remaining[s] = 0 if s in blocked_slots else _slot_capacity_remaining(conn, date_str, s)
        themes = conn.execute("SELECT * FROM themes WHERE visible = 1 ORDER BY popular DESC, id").fetchall()
        result: list[DateAvailabilityTheme] = []
        for t in themes:
            avail = [s for s, r in slot_remaining.items() if r > 0]
            if avail:
                result.append(DateAvailabilityTheme(theme=ThemeOut.from_row(t), available_slots=avail))
        return result


# ═══════════════════ 관리자 전용 ═══════════════════
# ─── 회원 관리 ───
@app.get("/api/admin/users", response_model=list[UserOut])
def admin_list_users(
    status: Optional[str] = None,
    q: Optional[str] = None,
    admin=Depends(auth_mod.require_admin),
):
    with get_db() as conn:
        sql = ("SELECT id, email, kindergarten_name, contact_name, contact_phone, role, "
               "status, admin_memo, approved_at, created_at, updated_at "
               "FROM users WHERE 1=1")
        args: list = []
        if status:
            sql += " AND status = ?"
            args.append(status)
        if q:
            sql += (" AND (email LIKE ? OR kindergarten_name LIKE ? "
                    "     OR contact_name LIKE ? OR contact_phone LIKE ?)")
            kw = f"%{q}%"
            args.extend([kw, kw, kw, kw])
        sql += " ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC"
        rows = conn.execute(sql, args).fetchall()
        return [UserOut.from_row(r) for r in rows]


@app.patch("/api/admin/users/{user_id}", response_model=UserOut)
def admin_patch_user(user_id: int, payload: UserPatch, admin=Depends(auth_mod.require_admin)):
    sets, args = [], []
    if payload.status is not None:
        sets.append("status = ?")
        args.append(payload.status)
        if payload.status == "approved":
            sets.append("approved_at = datetime('now')")
            sets.append("approved_by = ?")
            args.append(admin["id"])
    if payload.admin_memo is not None:
        sets.append("admin_memo = ?")
        args.append(payload.admin_memo)
    if not sets:
        raise HTTPException(400, "변경할 필드가 없습니다.")
    args.append(user_id)
    with get_db() as conn:
        target = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(404, "사용자를 찾을 수 없습니다.")
        if target["role"] == "admin":
            raise HTTPException(403, "관리자 계정은 수정할 수 없습니다.")
        conn.execute(f"UPDATE users SET {', '.join(sets)} WHERE id = ?", args)
        conn.commit()
        row = conn.execute(
            "SELECT id, email, kindergarten_name, contact_name, contact_phone, role, status, "
            "admin_memo, approved_at, created_at, updated_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return UserOut.from_row(row)


# ─── 테마 관리 (CMS) ───
@app.get("/api/admin/themes", response_model=list[ThemeOut])
def admin_list_themes(admin=Depends(auth_mod.require_admin)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM themes ORDER BY id").fetchall()
        return [ThemeOut.from_row(r) for r in rows]


@app.patch("/api/admin/themes/{theme_id}", response_model=ThemeOut)
def admin_patch_theme(theme_id: int, payload: ThemePatch, admin=Depends(auth_mod.require_admin)):
    sets, args = [], []
    data = payload.model_dump(exclude_unset=True)
    bool_cols = {"popular", "is_new", "visible"}
    for k, v in data.items():
        sets.append(f"{k} = ?")
        if k in bool_cols:
            args.append(1 if v else 0)
        else:
            args.append(v)
    if not sets:
        raise HTTPException(400, "변경할 필드가 없습니다.")
    args.append(theme_id)
    with get_db() as conn:
        cur = conn.execute(f"UPDATE themes SET {', '.join(sets)} WHERE id = ?", args)
        if cur.rowcount == 0:
            raise HTTPException(404, f"theme {theme_id} not found")
        conn.commit()
        row = conn.execute("SELECT * FROM themes WHERE id = ?", (theme_id,)).fetchone()
        return ThemeOut.from_row(row)


# ─── 예약 관리 ───
@app.get("/api/admin/reservations", response_model=list[ReservationOut])
def admin_list_reservations(
    date: Optional[str] = Query(default=None),
    status: Optional[str] = None,
    q: Optional[str] = Query(default=None, description="유치원/연락자/연락처 검색"),
    limit: int = Query(default=200, le=1000),
    admin=Depends(auth_mod.require_admin),
):
    with get_db() as conn:
        sql = """SELECT r.*, t.name AS theme_name, t.emoji AS theme_emoji, t.img AS theme_img
                   FROM reservations r JOIN themes t ON t.id = r.theme_id
                  WHERE 1=1"""
        args: list = []
        if date:
            sql += " AND r.reservation_date = ?"
            args.append(date)
        if status:
            sql += " AND r.status = ?"
            args.append(status)
        if q:
            sql += (" AND (r.kindergarten_name LIKE ? OR r.contact_name LIKE ? "
                    "     OR r.contact_phone LIKE ? OR r.note LIKE ?)")
            kw = f"%{q}%"
            args.extend([kw, kw, kw, kw])
        sql += " ORDER BY r.reservation_date DESC, r.time_slot ASC, r.id DESC LIMIT ?"
        args.append(limit)
        rows = conn.execute(sql, args).fetchall()
        return [ReservationOut.from_row(r) for r in rows]


@app.get("/api/admin/reservations/{res_id}", response_model=ReservationOut)
def admin_get_reservation(res_id: int, admin=Depends(auth_mod.require_admin)):
    with get_db() as conn:
        row = conn.execute(
            """SELECT r.*, t.name AS theme_name, t.emoji AS theme_emoji, t.img AS theme_img
                 FROM reservations r JOIN themes t ON t.id = r.theme_id
                WHERE r.id = ?""",
            (res_id,),
        ).fetchone()
        if not row:
            raise HTTPException(404, f"reservation {res_id} not found")
        return ReservationOut.from_row(row)


@app.patch("/api/admin/reservations/{res_id}", response_model=ReservationOut)
def admin_patch_reservation(res_id: int, payload: ReservationPatch, admin=Depends(auth_mod.require_admin)):
    sets, args = [], []
    if payload.status is not None:
        sets.append("status = ?")
        args.append(payload.status)
    if payload.admin_memo is not None:
        sets.append("admin_memo = ?")
        args.append(payload.admin_memo)
    if not sets:
        raise HTTPException(400, "변경할 필드가 없습니다")
    args.append(res_id)
    with get_db() as conn:
        cur = conn.execute(f"UPDATE reservations SET {', '.join(sets)} WHERE id = ?", args)
        if cur.rowcount == 0:
            raise HTTPException(404, f"reservation {res_id} not found")
        conn.commit()
        row = conn.execute(
            """SELECT r.*, t.name AS theme_name, t.emoji AS theme_emoji, t.img AS theme_img
                 FROM reservations r JOIN themes t ON t.id = r.theme_id
                WHERE r.id = ?""",
            (res_id,),
        ).fetchone()
        return ReservationOut.from_row(row)


# ─── 통계 ───
@app.get("/api/admin/stats")
def admin_stats(admin=Depends(auth_mod.require_admin)):
    today = DateT.today().isoformat()
    week_ago = (DateT.today() - timedelta(days=7)).isoformat()
    month_start = DateT.today().replace(day=1).isoformat()
    month_end = (DateT.today().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()

    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM reservations").fetchone()[0]
        by_status: dict[str, int] = {}
        for r in conn.execute("SELECT status, COUNT(*) c FROM reservations GROUP BY status").fetchall():
            by_status[r["status"]] = r["c"]

        # 이번 주 (오늘 포함 -7일)
        week_count = conn.execute(
            "SELECT COUNT(*) FROM reservations WHERE reservation_date >= ?", (week_ago,)
        ).fetchone()[0]
        # 이번 달
        month_count = conn.execute(
            "SELECT COUNT(*) FROM reservations WHERE reservation_date >= ? AND reservation_date < ?",
            (month_start, month_end),
        ).fetchone()[0]
        # 매출 (confirmed/done만 집계)
        revenue_row = conn.execute(
            """SELECT COALESCE(SUM(t.price_krw), 0) as revenue
                 FROM reservations r JOIN themes t ON t.id = r.theme_id
                WHERE r.status IN ('confirmed','done')
                  AND r.reservation_date >= ? AND r.reservation_date < ?""",
            (month_start, month_end),
        ).fetchone()
        month_revenue = revenue_row["revenue"] if revenue_row else 0

        # 인기 테마 TOP 5 (이번 달)
        top_themes = conn.execute(
            """SELECT t.id, t.name, t.emoji, COUNT(*) AS cnt
                 FROM reservations r JOIN themes t ON t.id = r.theme_id
                WHERE r.reservation_date >= ? AND r.reservation_date < ?
                  AND r.status IN ('pending','confirmed','done')
                GROUP BY t.id
                ORDER BY cnt DESC
                LIMIT 5""",
            (month_start, month_end),
        ).fetchall()

        # 회원 통계
        pending_users = conn.execute(
            "SELECT COUNT(*) FROM users WHERE status='pending' AND role='customer'"
        ).fetchone()[0]
        approved_users = conn.execute(
            "SELECT COUNT(*) FROM users WHERE status='approved' AND role='customer'"
        ).fetchone()[0]

        return {
            "today": today,
            "totals": {
                "all_reservations": total,
                "this_week": week_count,
                "this_month": month_count,
                "this_month_revenue_krw": month_revenue,
            },
            "by_status": by_status,
            "top_themes": [dict(r) for r in top_themes],
            "users": {
                "pending": pending_users,
                "approved": approved_users,
            },
        }


# ─── 블락 슬롯 ───
@app.get("/api/admin/blocked-slots", response_model=list[BlockedSlotOut])
def admin_list_blocked(
    year: Optional[int] = None,
    month: Optional[int] = None,
    admin=Depends(auth_mod.require_admin),
):
    with get_db() as conn:
        sql = "SELECT id, block_date, time_slot, reason, created_at FROM blocked_slots WHERE 1=1"
        args: list = []
        if year and month:
            from calendar import monthrange
            last = monthrange(year, month)[1]
            sql += " AND block_date >= ? AND block_date <= ?"
            args.extend([f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"])
        sql += " ORDER BY block_date ASC, time_slot ASC"
        rows = conn.execute(sql, args).fetchall()
        return [BlockedSlotOut(**dict(r)) for r in rows]


@app.post("/api/admin/blocked-slots", response_model=BlockedSlotOut, status_code=201)
def admin_add_blocked(payload: BlockedSlotIn, admin=Depends(auth_mod.require_admin)):
    if payload.time_slot is not None and payload.time_slot not in DEFAULT_SLOTS:
        raise HTTPException(400, f"time_slot은 {DEFAULT_SLOTS} 또는 null이어야 합니다.")
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM blocked_slots WHERE block_date = ? AND IFNULL(time_slot,'') = IFNULL(?, '')",
            (payload.block_date, payload.time_slot),
        ).fetchone()
        if existing:
            raise HTTPException(409, "이미 차단된 슬롯입니다.")
        cur = conn.execute(
            "INSERT INTO blocked_slots (block_date, time_slot, reason) VALUES (?, ?, ?)",
            (payload.block_date, payload.time_slot, payload.reason),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, block_date, time_slot, reason, created_at FROM blocked_slots WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()
        return BlockedSlotOut(**dict(row))


@app.delete("/api/admin/blocked-slots/{slot_id}", status_code=204)
def admin_delete_blocked(slot_id: int, admin=Depends(auth_mod.require_admin)):
    with get_db() as conn:
        cur = conn.execute("DELETE FROM blocked_slots WHERE id = ?", (slot_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "차단 슬롯을 찾을 수 없습니다.")
        conn.commit()
        return None
