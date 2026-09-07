/** Worker 바인딩 — 여러 파일(index.ts·push.ts·digest.ts)이 같은 타입을 쓰도록 한곳에 둔다. */
export type Bindings = {
  ras_db: D1Database;
  ras_photos: R2Bucket;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  /** 웹 푸시 서명 키 — 셋 다 있어야 발송한다(없으면 조용히 건너뛴다) */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};
