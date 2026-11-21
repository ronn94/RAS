-- 아차사고·개선요청 제보(2026-11-21) — 근로자가 게스트로 직접 제보한다. 다른 문서처럼 객체 JSON을 담는다
CREATE TABLE IF NOT EXISTS near_misses (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_near_misses_updated ON near_misses(updated_at DESC);
