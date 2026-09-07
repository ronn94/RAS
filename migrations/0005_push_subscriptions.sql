-- 웹 푸시 구독 — 관리자가 로그인한 기기(폰·태블릿)마다 하나씩 쌓인다.
-- 알림 종류별 on/off는 settings.notifications(단일 레코드)에 두고, 여기는 "어느 기기로
-- 보낼지"만 담는다. endpoint 자체가 기기+브라우저별로 유일한 값이라 기본키로 쓴다.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
