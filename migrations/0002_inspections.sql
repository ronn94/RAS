-- 순회점검 조사표 — assessments / hazard_infos 와 같은 방식으로
-- 프런트엔드 객체(Inspection)를 JSON 그대로 담는다.

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- Inspection 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inspections_updated ON inspections(updated_at DESC);
