-- 상시평가(TBM·일일교육) — 종류가 달라도 한 테이블에 담는다.
-- 다른 컬렉션과 같이 문서 자체를 JSON 그대로 넣고, 종류는 문서 안의 kind 필드로
-- 가린다(칼럼으로 빼면 collection() 공용 저장 경로가 그 값을 쓰지 않아 실제 종류와
-- 어긋날 수 있다 — 목록은 어차피 전부 읽어 화면에서 종류별로 나눈다).

CREATE TABLE IF NOT EXISTS routine_assessments (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- Tbm 등 상시평가 객체 JSON (kind로 종류를 구분)
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routine_assessments_updated ON routine_assessments(updated_at DESC);
