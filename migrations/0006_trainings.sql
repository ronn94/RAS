-- 이력 관리 · 회의·교육 실시서 — 다른 문서와 같이 프런트엔드 객체를 JSON 그대로 담는다.
-- collection() 제네릭이 공통으로 다루므로 facility/process 칼럼도 형태를 맞춰 둔다
-- (실시서는 서식 종류를 facility에, 교육·회의장소를 process에 넣는다).

CREATE TABLE IF NOT EXISTS trainings (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- Training 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trainings_updated ON trainings(updated_at DESC);
