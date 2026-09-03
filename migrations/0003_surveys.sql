-- 의견청취 설문지 — 다른 문서와 같이 프런트엔드 객체(Survey)를 JSON 그대로 담는다.
-- facility 칼럼은 쓰지 않지만(설문지는 공정명만 받는다) collection() 제네릭이
-- 공통으로 다루므로 스키마는 맞춰 둔다.

CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- Survey 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_surveys_updated ON surveys(updated_at DESC);
