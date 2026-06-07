"""seed.py — themes 테이블에 24개 테마 시드 데이터 삽입.

프론트엔드 src/data/themes.ts와 동일한 데이터를 유지한다.
실행: python3 seed.py
"""
from __future__ import annotations
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = HERE / "data.db"
SCHEMA_PATH = HERE / "schema.sql"

THEMES = [
    # (id, name, category, cat_label, emoji, duration, price, img, desc, popular, is_new, badge)
    (1,  '공룡이 나타났다',    'sensory',   '감각',    '🦖', 60, 85000,  'theme1.jpg',  '알에서 부화하는 공룡과 함께하는 신비한 모험', 1, 0, '🔥 인기'),
    (2,  '바닷속으로',          'sensory',   '감각',    '🐠', 55, 90000,  'theme2.jpg',  '블루라이트와 함께 펼쳐지는 바다 여행',       1, 0, 'BEST'),
    (3,  '난타 소리로 놀아요', 'media',     '미디어',  '🥁', 50, 95000,  'theme3.jpg',  '두드리고 흔들며 만드는 우리만의 리듬',       0, 0, None),
    (4,  '노랑노랑',            'sensory',   '감각',    '💛', 50, 80000,  'theme4.jpg',  '노란색 한 가지로 만나는 오감의 세계',         0, 0, None),
    (5,  '도시 어부',           'roleplay',  '롤플레이','🎣', 60, 95000,  'theme5.jpg',  '아이들이 직접 어부가 되어보는 시간',          0, 0, None),
    (6,  '추억의 7080',         'tradition', '전래',    '📻', 55, 90000,  'theme6.png',  '엄마아빠 어릴 적 놀이로 떠나는 시간 여행',    0, 0, None),
    (7,  '모래 놀이',           'sensory',   '감각',    '🏖️',  50, 85000,  'theme7.png',  '촉촉한 모래로 펼치는 자유 놀이',              0, 0, None),
    (8,  '목공 놀이',           'sensory',   '감각',    '🪵', 60, 100000, 'theme8.jpg',  '안전한 도구로 만드는 작은 작품들',            1, 0, None),
    (9,  '비 오는 날',          'seasonal',  '계절',    '☔', 50, 85000,  'theme9.png',  '장화 신고 첨벙첨벙, 비 내리는 날의 특별함',   0, 0, None),
    (10, '가루야 놀자',         'sensory',   '감각',    '✨', 50, 90000,  'theme10.png', '다양한 가루로 만지고 느끼는 오감 체험',       1, 0, '🔥 인기'),
    (11, '글램핑',               'roleplay',  '롤플레이','🏕️',  90, 120000, 'theme11.png', '어린이집 안에서 떠나는 캠핑 여행',            1, 0, None),
    (12, '수박밭에서',          'seasonal',  '계절',    '🍉', 55, 88000,  'theme12.png', '시원한 여름, 수박과 함께하는 놀이',           0, 0, None),
    (13, '옛날 민속촌',         'tradition', '전래',    '🏯', 60, 95000,  'theme13.png', '한복 입고 떠나는 전래놀이 한마당',            0, 0, None),
    (14, '얼씨구 절씨구',       'tradition', '전래',    '🪅', 55, 90000,  'theme14.png', '전통 가락에 맞춰 신명나는 놀이',              0, 0, None),
    (15, '한양 나들이',         'tradition', '전래',    '👘', 60, 95000,  'theme15.png', '조선시대 한양으로 떠나는 시간여행',           0, 0, None),
    (16, '종이야 놀자',         'sensory',   '감각',    '📄', 50, 80000,  'theme16.png', '종이 한 장으로 펼쳐지는 무한한 상상',         0, 0, None),
    (17, '편백나무랑',          'sensory',   '감각',    '🌲', 55, 95000,  'theme17.jpg', '편백나무 향기로 가득한 힐링 타임',            0, 0, None),
    (18, '블랙라이트',          'media',     '미디어',  '🌟', 60, 100000, 'theme18.png', '어두운 방에서 빛나는 마법 같은 순간',         1, 1, '✨ 신규'),
    (19, '바닷속으로 2',        'media',     '미디어',  '🐙', 60, 105000, 'theme19.png', '몰입형 미디어아트 바다 체험',                 0, 0, None),
    (20, '엔지니어',            'roleplay',  '롤플레이','⚙️',  65, 100000, 'theme20.png', '블록과 도구로 만드는 작은 발명품',            0, 0, None),
    (21, '야광 모래',           'sensory',   '감각',    '🌙', 55, 95000,  'theme21.png', '어둠 속에서 빛나는 신비한 모래놀이',          0, 1, None),
    (22, '몬스터벅스',          'roleplay',  '롤플레이','☕', 55, 90000,  'theme22.png', '어린이 바리스타 체험, 우리만의 카페',         0, 0, None),
    (23, '알로하 와이',         'seasonal',  '계절',    '🌺', 55, 90000,  'theme23.png', '여름의 하와이로 떠나는 신나는 여행',          0, 0, None),
    (24, '파자마 파티',         'roleplay',  '롤플레이','🌙', 60, 95000,  'theme24.png', '파자마 입고 떠나는 꿈나라 모험',              0, 1, None),
]


def main() -> int:
    if not SCHEMA_PATH.exists():
        print(f"ERROR: schema.sql not found at {SCHEMA_PATH}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(DB_PATH)
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())

        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM themes")
        count = cur.fetchone()[0]
        if count > 0:
            print(f"themes 테이블에 이미 {count}건 존재 → 시드 생략")
            return 0

        cur.executemany(
            """INSERT INTO themes
                 (id, name, category, cat_label, emoji, duration_min, price_krw,
                  img, description, popular, is_new, badge)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            THEMES,
        )
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM themes")
        print(f"✓ {cur.fetchone()[0]}개 테마 시드 완료")
        print(f"  DB: {DB_PATH}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
