/**
 * 웹 푸시 구독 — 이 브라우저(기기)가 알림을 받도록 등록·해제한다.
 * 알림 종류별 on/off는 서버 설정(settings.notifications)이 따로 관리하고,
 * 여기는 "이 기기로 보낼지 말지"만 다룬다.
 *
 * iOS는 홈 화면에 추가한 상태(standalone)에서만, 16.4 이상에서만 동작한다.
 */
import { deletePushSubscription, getPushVapidKey, putPushSubscription } from "./db";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** iOS Safari는 홈 화면에 추가하지 않으면 알림 권한 자체를 내주지 않는다 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return true; // iOS가 아니면 이 검사는 의미 없다
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** iOS인데 홈 화면에 추가되지 않은 상태 — 이럴 땐 구독을 시도해도 항상 실패한다 */
export function needsHomeScreenOnIOS(): boolean {
  return isIOS() && !isStandalone();
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** 알림을 켠다 — 권한 요청 → 서비스워커 등록 → 구독 → 서버에 등록까지 한 번에 한다 */
export async function subscribePush(): Promise<void> {
  if (!pushSupported()) throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
  if (needsHomeScreenOnIOS()) {
    throw new Error("iOS에서는 먼저 '홈 화면에 추가'로 설치한 뒤 그 아이콘으로 열어야 알림을 켤 수 있습니다.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.");

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { publicKey } = await getPushVapidKey();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // PushManager는 ArrayBuffer 기반 뷰를 요구한다 — lib.dom의 BufferSource가
    // SharedArrayBuffer를 배제하는 타입이라 캐스팅이 필요하다(런타임엔 항상 일반 ArrayBuffer다)
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  await putPushSubscription(sub.toJSON());
}

/** 알림을 끈다 — 이 기기의 구독만 해제한다(다른 기기는 그대로 받는다) */
export async function unsubscribePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await deletePushSubscription(endpoint);
}
