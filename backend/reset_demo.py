#!/usr/bin/env python3
"""운영 전 데모 데이터 정리.

사용법:
    python3 reset_demo.py            # 안내 출력 (실제 변경 없음)
    python3 reset_demo.py --confirm  # 실제 삭제 실행

정리 대상:
    - reservations 전체 삭제
    - users 중 role='customer' 전체 삭제 (관리자 계정 유지)
    - blocked_slots 전체 삭제 (옵션)

테마(themes)는 운영용 데이터이므로 보존.
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "data.db"


def summary(conn: sqlite3.Connection) -> dict:
    return {
        "reservations": conn.execute("SELECT COUNT(*) FROM reservations").fetchone()[0],
        "users_customer": conn.execute(
            "SELECT COUNT(*) FROM users WHERE role = 'customer'"
        ).fetchone()[0],
        "users_admin": conn.execute(
            "SELECT COUNT(*) FROM users WHERE role = 'admin'"
        ).fetchone()[0],
        "blocked_slots": conn.execute("SELECT COUNT(*) FROM blocked_slots").fetchone()[0],
        "themes": conn.execute("SELECT COUNT(*) FROM themes").fetchone()[0],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="운영 전 데모 데이터 정리")
    parser.add_argument("--confirm", action="store_true", help="실제 삭제 실행")
    parser.add_argument(
        "--keep-blocked",
        action="store_true",
        help="blocked_slots는 삭제하지 않음 (휴무일 등 유지)",
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"❌ DB 파일이 없습니다: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    before = summary(conn)
    print("📊 현재 데이터")
    for k, v in before.items():
        print(f"  - {k}: {v}")

    if not args.confirm:
        print("\n⚠️  Dry-run 모드입니다. --confirm 플래그로 실행하면 아래와 같이 정리됩니다:")
        print("  - reservations: 전체 삭제")
        print("  - users (customer): 전체 삭제")
        print(f"  - blocked_slots: {'유지' if args.keep_blocked else '전체 삭제'}")
        print("  - themes: 보존 (운영용)")
        print("  - admin 계정: 보존")
        return 0

    print("\n🧹 정리 시작...")
    conn.execute("DELETE FROM reservations")
    conn.execute("DELETE FROM users WHERE role = 'customer'")
    if not args.keep_blocked:
        conn.execute("DELETE FROM blocked_slots")
    conn.commit()
    after = summary(conn)
    print("✅ 완료\n📊 정리 후")
    for k, v in after.items():
        print(f"  - {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
