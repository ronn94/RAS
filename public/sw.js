/**
 * 서비스워커 — 오직 웹 푸시 알림을 받고 클릭을 처리하는 용도다.
 * 오프라인 캐싱은 하지 않는다(이 앱은 서버 데이터가 정본이라 캐시가 오히려 옛 자료를 보여줄 위험이 있다).
 */

// 설치되면 바로 활성화 — 사용자가 브라우저를 새로 열 때까지 기다리지 않는다
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** 알림을 받으면 화면에 띄운다. data는 워커가 JSON으로 보낸 {title, body, view, id} */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "RAS", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "RAS";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag, // 같은 tag를 다시 보내면 알림이 쌓이지 않고 덮어쓴다(매일 반복되는 기한 알림용)
    data: { view: data.view, id: data.id },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * 알림을 누르면 해당 항목으로 이동한다. 이 앱은 서버 라우팅 없는 SPA라서
 * 이미 열려 있는 창이 있으면 postMessage로 화면만 바꾸고(새로고침 없이),
 * 없으면 쿼리스트링을 붙여 새 창을 연다 — App.tsx가 시작할 때 그 쿼리스트링을 읽는다.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { view, id } = event.notification.data || {};
  const qs = view ? `?view=${encodeURIComponent(view)}${id ? `&id=${encodeURIComponent(id)}` : ""}` : "";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          client.postMessage({ type: "ras-navigate", view, id });
          return client.focus();
        }
      }
      return self.clients.openWindow(`/${qs}`);
    })(),
  );
});
