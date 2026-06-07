"""인증 모듈 — bcrypt 해싱 + JWT 토큰 + 의존성 주입.

환경변수:
  OGAM_SECRET_KEY    : JWT 서명 키 (기본값: 개발용 고정 키, 운영 시 반드시 교체)
  OGAM_TOKEN_TTL_SEC : 토큰 유효기간 초 (기본 7일)
  OGAM_ADMIN_EMAIL   : 초기 관리자 이메일 (기본 admin@ogam.local)
  OGAM_ADMIN_PASSWORD: 초기 관리자 비밀번호 (기본 ogam-admin-2026)
"""
from __future__ import annotations

import os
import sqlite3
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, status

# ─── 설정 ───
SECRET_KEY = os.environ.get("OGAM_SECRET_KEY") or "dev-secret-CHANGE-IN-PROD-" + secrets.token_hex(8)
ALGORITHM = "HS256"
TOKEN_TTL_SEC = int(os.environ.get("OGAM_TOKEN_TTL_SEC", str(7 * 24 * 3600)))

ADMIN_EMAIL = os.environ.get("OGAM_ADMIN_EMAIL", "admin@ogammonster.kr")
ADMIN_PASSWORD = os.environ.get("OGAM_ADMIN_PASSWORD", "ogam-admin-2026")
ADMIN_KG_NAME = os.environ.get("OGAM_ADMIN_KG_NAME", "오감몬스터 본사")


# ─── 비밀번호 해싱 ───
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ─── JWT ───
def create_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=TOKEN_TTL_SEC)).timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "토큰이 만료되었습니다. 다시 로그인해주세요.")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "유효하지 않은 토큰입니다.")


# ─── DB 헬퍼 (main.py와 동일) ───
def _get_db() -> sqlite3.Connection:
    from pathlib import Path
    db_path = Path(__file__).parent / "data.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ─── 마이그레이션 (FK 추가, admin 시드) ───
def migrate_and_seed_admin() -> None:
    with _get_db() as conn:
        # reservations.user_id 컬럼 (있으면 무시)
        cols = [r[1] for r in conn.execute("PRAGMA table_info(reservations)").fetchall()]
        if "user_id" not in cols:
            conn.execute(
                "ALTER TABLE reservations ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
            )
        # themes.visible (공개 여부) 컬럼
        theme_cols = [r[1] for r in conn.execute("PRAGMA table_info(themes)").fetchall()]
        if "visible" not in theme_cols:
            conn.execute("ALTER TABLE themes ADD COLUMN visible INTEGER NOT NULL DEFAULT 1")

        # 관리자 시드 (없으면 생성)
        existing = conn.execute(
            "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
        ).fetchone()
        if not existing:
            conn.execute(
                """INSERT INTO users
                     (email, password_hash, kindergarten_name, contact_name, contact_phone,
                      role, status, approved_at)
                   VALUES (?, ?, ?, ?, ?, 'admin', 'approved', datetime('now'))""",
                (
                    ADMIN_EMAIL,
                    hash_password(ADMIN_PASSWORD),
                    ADMIN_KG_NAME,
                    "관리자",
                    "000-0000-0000",
                ),
            )
            print(f"[auth] 기본 관리자 생성: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        conn.commit()


# ─── 사용자 조회 ───
def get_user_by_id(user_id: int) -> Optional[dict]:
    with _get_db() as conn:
        row = conn.execute(
            "SELECT id, email, kindergarten_name, contact_name, contact_phone, "
            "role, status, admin_memo, approved_at, created_at, updated_at "
            "FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[dict]:
    with _get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
        ).fetchone()
        return dict(row) if row else None


# ─── FastAPI 의존성 ───
def _extract_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "로그인이 필요합니다.")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "잘못된 인증 헤더입니다.")
    return parts[1]


def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """JWT를 디코드하고 사용자 정보를 반환. 토큰만 검증 (status 무관)."""
    token = _extract_token(authorization)
    payload = decode_token(token)
    user_id = int(payload.get("sub", 0))
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "사용자를 찾을 수 없습니다.")
    return user


def require_approved(user: dict = Depends(current_user)) -> dict:
    """승인된 회원만 통과 (예약 등 기능 사용 가능)."""
    if user["role"] == "admin":
        return user  # 관리자는 자동 통과
    if user["status"] != "approved":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "아직 관리자 승인 전입니다. 승인이 완료되면 알려드립니다.",
        )
    return user


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "관리자 권한이 필요합니다.")
    return user
