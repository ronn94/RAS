-- assessments / hazard_infos / settings 는 프런트엔드가 이미 다루는 객체 구조를
-- 그대로 JSON으로 저장한다(IndexedDB 시절 스키마와 1:1). 재모델링으로 인한
-- 회귀 위험을 없애고, 프런트엔드 타입(src/lib/types.ts)이 여전히 유일한 정본이다.

CREATE TABLE assessments (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- Assessment 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE hazard_infos (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- HazardInfo 객체 JSON
  facility TEXT NOT NULL DEFAULT '',
  process TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE settings (
  id TEXT PRIMARY KEY,      -- 'app' 고정
  data TEXT NOT NULL,       -- AppSettings 객체 JSON
  updated_at INTEGER NOT NULL
);

CREATE TABLE photo_meta (
  id TEXT PRIMARY KEY,      -- R2 오브젝트 키와 동일
  size INTEGER NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_assessments_updated ON assessments(updated_at DESC);
CREATE INDEX idx_hazard_infos_updated ON hazard_infos(updated_at DESC);
