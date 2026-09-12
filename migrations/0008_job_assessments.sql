-- 작업 위험성평가 — 다른 문서와 같이 프런트엔드 객체를 JSON 그대로 담는다.
-- collection() 제네릭이 공통으로 다루므로 facility/process 칼럼도 형태를 맞춰 둔다
-- (작업평가는 대분류를 process 자리에 넣어 목록에서 바로 알아볼 수 있게 한다).

CREATE TABLE IF NOT EXISTS job_assessments (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- JobAssessment 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_assessments_updated ON job_assessments(updated_at DESC);
