/**
 * 웹 푸시 발송 — VAPID로 서명하고 aes128gcm으로 암호화해 각 구독 엔드포인트로 보낸다.
 * Cloudflare Workers는 Node의 `crypto`(web-push 패키지가 쓰는)를 온전히 지원하지 않아서
 * 대신 Web Crypto API만으로 동작하는 `@block65/webcrypto-web-push`를 쓴다.
 */
import { buildPushPayload, type PushMessage, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";
import type { Bindings } from "./bindings";

type SubRow = { endpoint: string; p256dh: string; auth: string };

async function loadSubscriptions(db: D1Database): Promise<SubRow[]> {
  const { results } = await db.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions").all<SubRow>();
  return results;
}

/**
 * 등록된 모든 기기로 알림을 보낸다. 클릭하면 이동할 화면(view/id)을 함께 담아 보내고,
 * `topic`을 주면(예: 'ras-duedate') 같은 topic의 옛 미전달 알림을 새 것이 덮어써 —
 * 기기가 며칠 오프라인이어도 오래된 알림이 쌓이지 않는다.
 *
 * 만료된 구독(404/410)은 보내는 김에 지운다 — 안 쓰는 구독이 D1에 쌓이지 않게 한다.
 */
export async function sendPush(
  env: Bindings,
  message: { title: string; body: string; view?: string; id?: string; topic?: string },
): Promise<{ sent: number; removed: number }> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return { sent: 0, removed: 0 }; // 키를 아직 설정하지 않았으면 조용히 건너뛴다
  }
  const vapid: VapidKeys = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  const subs = await loadSubscriptions(env.ras_db);
  if (subs.length === 0) return { sent: 0, removed: 0 };

  const payloadData: PushMessage["data"] = {
    title: message.title,
    body: message.body,
    view: message.view ?? null,
    id: message.id ?? null,
    tag: message.topic ?? null,
  };
  const pushMessage: PushMessage = {
    data: payloadData,
    options: { ttl: 60 * 60 * 24, ...(message.topic ? { topic: message.topic } : {}) },
  };

  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        const payload = await buildPushPayload(pushMessage, subscription, vapid);
        const res = await fetch(subscription.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
          await env.ras_db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?1").bind(row.endpoint).run();
          removed += 1;
          return;
        }
        if (res.ok) sent += 1;
      } catch {
        // 기기 하나가 실패해도 나머지 발송은 계속한다
      }
    }),
  );
  return { sent, removed };
}
