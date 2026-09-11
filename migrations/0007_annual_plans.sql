-- 위험성평가 연간계획표 — 다른 문서와 같이 프런트엔드 객체를 JSON 그대로 담는다.
-- collection() 제네릭이 공통으로 다루므로 facility/process 칼럼도 형태를 맞춰 둔다
-- (연간계획표는 연도를 facility 자리에 넣어 목록에서 바로 알아볼 수 있게 한다).

CREATE TABLE IF NOT EXISTS annual_plans (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- AnnualPlan 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_annual_plans_updated ON annual_plans(updated_at DESC);
