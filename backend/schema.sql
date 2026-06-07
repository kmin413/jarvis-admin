-- 오감몬스터 예약 시스템 — SQLite 스키마

PRAGMA foreign_keys = ON;

-- ─── users: 회원 (관리자 승인 필요) ───
CREATE TABLE IF NOT EXISTS users (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  kindergarten_name  TEXT NOT NULL,
  contact_name       TEXT NOT NULL,
  contact_phone      TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'customer'
                       CHECK (role IN ('customer', 'admin')),
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  admin_memo         TEXT,
  approved_at        TEXT,
  approved_by        INTEGER,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

CREATE TRIGGER IF NOT EXISTS trg_users_updated
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ─── themes: 체험 프로그램 마스터 ───
CREATE TABLE IF NOT EXISTS themes (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,         -- sensory / tradition / seasonal / media / roleplay
  cat_label    TEXT NOT NULL,
  emoji        TEXT,
  duration_min INTEGER NOT NULL,
  price_krw    INTEGER NOT NULL,
  img          TEXT NOT NULL,         -- /images/theme*.png
  description  TEXT,
  popular      INTEGER NOT NULL DEFAULT 0,   -- 0/1
  is_new       INTEGER NOT NULL DEFAULT 0,   -- 0/1
  badge        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── reservations: 예약 신청 ───
CREATE TABLE IF NOT EXISTS reservations (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_id           INTEGER NOT NULL,
  reservation_date   TEXT NOT NULL,          -- YYYY-MM-DD
  time_slot          TEXT NOT NULL,          -- HH:MM
  child_count        TEXT NOT NULL,          -- "25명" 같은 자유 텍스트
  class_count        TEXT NOT NULL,          -- "1개 반"
  kindergarten_name  TEXT NOT NULL,
  contact_name       TEXT NOT NULL,
  contact_phone      TEXT NOT NULL,
  note               TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','rejected','cancelled','done')),
  admin_memo         TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_res_date    ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_res_status  ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_res_theme   ON reservations(theme_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER IF NOT EXISTS trg_res_updated
AFTER UPDATE ON reservations
FOR EACH ROW
BEGIN
  UPDATE reservations SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ─── blocked_slots: 강사 부재 등으로 막힌 슬롯 (선택사항, 캘린더 가용성 계산용) ───
CREATE TABLE IF NOT EXISTS blocked_slots (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  block_date TEXT NOT NULL,                 -- YYYY-MM-DD
  time_slot  TEXT,                          -- NULL = 그날 하루 종일
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_block_date ON blocked_slots(block_date);
