-- 작업중지권 · 우선조치권 — 다른 문서와 같이 프런트엔드 객체를 JSON 그대로 담는다.
-- collection() 제네릭이 공통으로 다루므로 facility/process 칼럼도 형태를 맞춰 둔다
-- (작업중지는 소속(업체)을 facility에, 작업명을 process에 넣는다).

CREATE TABLE IF NOT EXISTS stop_works (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- StopWork 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stop_works_updated ON stop_works(updated_at DESC);

CREATE TABLE IF NOT EXISTS priority_actions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- PriorityAction 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_priority_actions_updated ON priority_actions(updated_at DESC);
