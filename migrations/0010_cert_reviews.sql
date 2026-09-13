-- 정기·사후심사 — 위험성평가 인정심사(최초·재인정·사후) 이력.
-- 다른 컬렉션과 같이 문서를 JSON 그대로 담는다. 게스트는 손대지 않는 관리자 전용
-- 기록이라 별도 권한 없이 공용 edit/delete 권한을 그대로 쓴다.

CREATE TABLE IF NOT EXISTS cert_reviews (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- CertReview 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cert_reviews_updated ON cert_reviews(updated_at DESC);
