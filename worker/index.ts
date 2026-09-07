/**
 * RAS API Worker.
 *
 * 데이터 모델은 그대로 JSON 블롭으로 D1에 저장한다(IndexedDB 시절 구조와 1:1) —
 * src/lib/types.ts가 여전히 유일한 정본이며, 서버는 재모델링하지 않는다.
 * 사진은 R2에 원본 그대로 저장하고(프런트엔드가 이미 업로드 전 리사이즈함),
 * photo_meta 테이블에 크기·생성일만 별도로 남겨 저장소 화면 집계에 쓴다.
 *
 * 로그인은 아이디·비밀번호(HMAC 서명 세션 쿠키) 또는 비밀번호 없는 게스트
 * 세션(sub: "guest") 둘 중 하나다. 게스트는 설정(settings.permissions)에서
 * 켠 항목만 쓸 수 있고, 관리 기능(설정 변경·백업·초기화)은 항상 막힌다.
 */
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { login, loginGuest, logout, readSession } from "./auth";
import { DEFAULT_SETTINGS, withDefaults, type AppSettings } from "../src/lib/settings";
import type { PriorityAction, StopWork, Survey } from "../src/lib/types";
import type { Bindings } from "./bindings";
import { runDailyDigest } from "./digest";
import { sendPush } from "./push";
import { backfillSurveysFromNotes } from "./backfillSurveys";

type Variables = { role: "admin" | "guest" };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/api/*", cors());

/* ── 로그인 (SSM과 같은 방식: 아이디·비밀번호 + 서명 세션 쿠키 / 게스트) ── */
app.post("/api/auth/login", login);
app.post("/api/auth/login-guest", loginGuest);
app.post("/api/auth/logout", logout);

const PUBLIC_PATHS = new Set(["/api/auth/login", "/api/auth/login-guest", "/api/auth/logout"]);

/** 로그인·로그아웃을 제외한 모든 /api/*는 유효한 세션이 있어야 통과한다 */
app.use("/api/*", async (c, next) => {
  if (PUBLIC_PATHS.has(c.req.path)) return next();
  const session = await readSession(c);
  if (!session) return c.json({ error: "로그인이 필요합니다." }, 401);
  c.set("role", session.sub === "guest" ? "guest" : "admin");
  await next();
});

/**
 * 게스트는 켜진 권한만, 관리자는 항상 통과.
 *
 * 저장된 설정에 없는 키는 **프런트와 같은 기본값**으로 채운다(DEFAULT_SETTINGS).
 * 안 그러면 권한을 새로 추가할 때 프런트는 기본값을 보고 버튼을 열어 주는데
 * 서버는 undefined를 보고 403을 내는 불일치가 생긴다(실제로 겪은 문제).
 */
async function loadPermissions(db: D1Database): Promise<Record<string, boolean>> {
  const row = await db.prepare("SELECT data FROM settings WHERE id = 'app'").first<{ data: string }>();
  const parsed = row ? (JSON.parse(row.data) as { permissions?: Record<string, boolean> }) : null;
  return { ...DEFAULT_SETTINGS.permissions, ...(parsed?.permissions ?? {}) };
}

type PermissionKey = "edit" | "delete" | "photo" | "survey" | "stopwork";

/** 나열한 권한 중 **하나라도** 켜져 있으면 통과한다 */
function requirePermission(...keys: PermissionKey[]): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    if (c.get("role") !== "guest") return next();
    const permissions = await loadPermissions(c.env.ras_db);
    if (!keys.some((k) => permissions[k])) return c.json({ error: "게스트 계정에는 이 권한이 없습니다." }, 403);
    await next();
  };
}

/** 관리자 전용 — 게스트는 설정 변경·백업·초기화를 절대 할 수 없다 */
const adminOnly: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  if (c.get("role") !== "admin") return c.json({ error: "관리자만 사용할 수 있습니다." }, 403);
  await next();
};

app.get("/api/auth/status", async (c) => {
  const session = await readSession(c);
  return c.json({ authenticated: !!session, username: session?.sub });
});

/* ── 신원(대시보드 사이드바 표시용) ─────────────────────────── */
app.get("/api/identity", async (c) => {
  const session = await readSession(c);
  if (!session) return c.json({ authenticated: false });
  return c.json({ authenticated: true, name: session.sub, role: session.sub === "guest" ? "guest" : "admin" });
});

/**
 * 문서가 새로 등록될 때(즉 이 id가 처음 생길 때) 바로 보낼 알림.
 * 설문지 제출·작업중지·우선조치 신규 접수처럼 "일어난 즉시 아는 게 의미 있는" 것만 여기 쓴다.
 * 기한 임박처럼 시간이 지나야 판단되는 조건은 여기가 아니라 매일 08시 요약(digest.ts)이 맡는다.
 */
type NotifyOnCreate<T> = {
  /** settings.notifications의 어느 스위치를 볼지 */
  settingKey: keyof AppSettings["notifications"];
  view: string;
  title: (doc: T) => string;
  body: (doc: T) => string;
};

/* ── 공용: JSON 문서 컬렉션(assessments / hazard_infos) ──────── */
function collection<T extends { id: string } = Record<string, unknown> & { id: string }>(
  table: "assessments" | "hazard_infos" | "inspections" | "surveys" | "stop_works" | "priority_actions",
  /** 이 컬렉션을 쓰기 위해 필요한 권한. 설문지는 전역 편집권한과 분리해 survey로 연다 */
  perms: { write: PermissionKey[]; remove: PermissionKey[] } = { write: ["edit"], remove: ["delete"] },
  notifyOnCreate?: NotifyOnCreate<T>,
) {
  const r = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  r.get("/", async (c) => {
    const { results } = await c.env.ras_db
      .prepare(`SELECT data FROM ${table} ORDER BY updated_at DESC`)
      .all<{ data: string }>();
    return c.json(results.map((row) => JSON.parse(row.data)));
  });

  /**
   * 잠긴 문서는 게스트가 손대지 못한다. 화면에서 버튼을 감추는 건 편의일 뿐이고
   * 여기가 진짜 방어선이다 — 저장된 문서를 직접 읽어 판단하므로 본문에 무엇을
   * 보내든(예: locked를 false로 위조) 통하지 않는다.
   */
  const lockedForGuest = async (c: Context<{ Bindings: Bindings; Variables: Variables }>, id: string) => {
    if (c.get("role") !== "guest") return false;
    const row = await c.env.ras_db.prepare(`SELECT data FROM ${table} WHERE id = ?1`).bind(id).first<{ data: string }>();
    if (!row) return false; // 아직 없는 문서 = 새로 만드는 중
    return (JSON.parse(row.data) as { locked?: boolean }).locked === true;
  };

  r.put("/:id", requirePermission(...perms.write), async (c) => {
    const id = c.req.param("id");
    if (await lockedForGuest(c, id)) return c.json({ error: "잠긴 문서는 수정할 수 없습니다." }, 403);
    // 새로 만드는 건지(=알림 대상인지) 미리 알아야 하므로 쓰기 전에 존재 여부를 본다
    const existed = notifyOnCreate
      ? !!(await c.env.ras_db.prepare(`SELECT 1 FROM ${table} WHERE id = ?1`).bind(id).first())
      : true;
    const body = await c.req.json<Record<string, unknown>>();
    const updatedAt = Date.now();
    const doc = { ...body, id, updatedAt };
    await c.env.ras_db
      .prepare(
        `INSERT INTO ${table} (id, data, facility, process, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET data = ?2, facility = ?3, process = ?4, updated_at = ?5`,
      )
      .bind(id, JSON.stringify(doc), String(body.facility ?? ""), String(body.process ?? ""), updatedAt)
      .run();
    if (notifyOnCreate && !existed) {
      // 응답을 기다리게 하지 않는다 — 알림 발송이 늦어도 저장 자체는 이미 끝났다
      c.executionCtx.waitUntil(
        (async () => {
          const settingsRow = await c.env.ras_db.prepare("SELECT data FROM settings WHERE id = 'app'").first<{ data: string }>();
          const settings = withDefaults(settingsRow ? JSON.parse(settingsRow.data) : null);
          if (!settings.notifications[notifyOnCreate.settingKey]) return;
          const typedDoc = doc as T;
          await sendPush(c.env, {
            title: notifyOnCreate.title(typedDoc),
            body: notifyOnCreate.body(typedDoc),
            view: notifyOnCreate.view,
            id,
          });
        })(),
      );
    }
    return c.json(doc);
  });

  r.delete("/:id", requirePermission(...perms.remove), async (c) => {
    const id = c.req.param("id");
    if (await lockedForGuest(c, id)) return c.json({ error: "잠긴 문서는 삭제할 수 없습니다." }, 403);
    await c.env.ras_db.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run();
    return c.json({ ok: true });
  });

  return r;
}

app.route("/api/assessments", collection("assessments"));
app.route("/api/hazardinfos", collection("hazard_infos"));
app.route("/api/inspections", collection("inspections"));
app.route(
  "/api/surveys",
  collection<Survey>("surveys", { write: ["survey"], remove: ["survey"] }, {
    settingKey: "newSurvey",
    view: "surveys",
    title: () => "새 설문지 제출",
    body: (v) => `${v.author || "이름 미상"} · ${v.hazard || "내용 미입력"}`,
  }),
);
// 작업중지권은 근로자가 직접 내는 서식이라 설문지처럼 전용 권한(stopwork)으로 연다.
// 우선조치 요청서는 점검자·본사가 발행하는 문서라 관리자(edit) 몫이다.
app.route(
  "/api/stopworks",
  collection<StopWork>("stop_works", { write: ["stopwork"], remove: ["stopwork"] }, {
    settingKey: "newStopwork",
    view: "stopworks",
    title: () => "작업중지 요청 접수",
    body: (v) => `${v.dept || "소속 미입력"} · ${v.workName || v.process || "작업명 미입력"}`,
  }),
);
app.route(
  "/api/priorityactions",
  collection<PriorityAction>("priority_actions", undefined, {
    settingKey: "newStopwork",
    view: "stopworks",
    title: () => "우선조치 요청 발행",
    body: (v) => `${v.site || "사업장 미입력"} · ${v.finding || "확인내용 미입력"}`,
  }),
);

/* ── 설정 (단일 레코드) ────────────────────────────────────── */
app.get("/api/settings", async (c) => {
  const row = await c.env.ras_db
    .prepare("SELECT data FROM settings WHERE id = 'app'")
    .first<{ data: string }>();
  return c.json(row ? JSON.parse(row.data) : null);
});

app.put("/api/settings", adminOnly, async (c) => {
  const body = await c.req.json();
  const updatedAt = Date.now();
  const doc = { ...body, updatedAt };
  await c.env.ras_db
    .prepare(
      `INSERT INTO settings (id, data, updated_at) VALUES ('app', ?1, ?2)
       ON CONFLICT(id) DO UPDATE SET data = ?1, updated_at = ?2`,
    )
    .bind(JSON.stringify(doc), updatedAt)
    .run();
  return c.json(doc);
});

/* ── 웹 푸시 구독 ───────────────────────────────────────────
   구독·해제는 관리자 전용이다(알림도 관리자만 받는다 — 게스트는 대상이 아니다). */
app.get("/api/push/vapid-key", adminOnly, async (c) => {
  if (!c.env.VAPID_PUBLIC_KEY) return c.json({ error: "푸시 키가 설정되지 않았습니다." }, 501);
  return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY });
});

app.post("/api/push/subscribe", adminOnly, async (c) => {
  const body = await c.req.json<{ endpoint: string; keys: { p256dh: string; auth: string } }>();
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: "구독 정보가 올바르지 않습니다." }, 400);
  }
  await c.env.ras_db
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = ?2, auth = ?3`,
    )
    .bind(body.endpoint, body.keys.p256dh, body.keys.auth, Date.now())
    .run();
  return c.json({ ok: true });
});

app.delete("/api/push/subscribe", adminOnly, async (c) => {
  const { endpoint } = await c.req.json<{ endpoint: string }>();
  await c.env.ras_db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?1").bind(endpoint).run();
  return c.json({ ok: true });
});

/** 설정 화면의 '테스트 알림 보내기' — 이 기기가 실제로 알림을 받는지 바로 확인할 수 있다 */
app.post("/api/push/test", adminOnly, async (c) => {
  const result = await sendPush(c.env, {
    title: "RAS 테스트 알림",
    body: "이 알림이 보이면 설정이 정상입니다.",
    view: "settings",
  });
  return c.json(result);
});

/** 매일 08시를 안 기다리고 지금 바로 기한·장기미해제를 검사해서 보낸다(운영·점검용) */
app.post("/api/push/run-digest", adminOnly, async (c) => {
  await runDailyDigest(c.env);
  return c.json({ ok: true });
});

/**
 * 위험성평가표에 엑셀로 일괄 입력되면서 비고에 '설문'이라고만 남고 실제 설문지로는
 * 등록되지 않았던 옛 행을 지금 [의견청취 → 설문지]로 등록한다(설정 화면 버튼).
 * 몇 번을 다시 눌러도 안전하다 — 이미 등록된 행은 자동으로 건너뛴다.
 */
app.post("/api/admin/backfill-surveys", adminOnly, async (c) => {
  const result = await backfillSurveysFromNotes(c.env);
  return c.json(result);
});

/* ── 사진 (R2) ──────────────────────────────────────────────
   업로드 시 서버에서 새 id를 발급한다 — 클라이언트가 id를 정하지 않는다. */
app.post("/api/photos", requirePermission("photo", "survey", "stopwork"), async (c) => {
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: "빈 파일입니다" }, 400);
  const id = crypto.randomUUID();
  const contentType = c.req.header("content-type") || "image/jpeg";
  await c.env.ras_photos.put(id, body, { httpMetadata: { contentType } });
  await c.env.ras_db
    .prepare("INSERT INTO photo_meta (id, size, content_type, created_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(id, body.byteLength, contentType, Date.now())
    .run();
  return c.json({ id, size: body.byteLength });
});

app.get("/api/photos/:id", async (c) => {
  const obj = await c.env.ras_photos.get(c.req.param("id"));
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
});

app.delete("/api/photos/:id", requirePermission("photo", "survey", "stopwork"), async (c) => {
  const id = c.req.param("id");
  await c.env.ras_photos.delete(id);
  await c.env.ras_db.prepare("DELETE FROM photo_meta WHERE id = ?1").bind(id).run();
  return c.json({ ok: true });
});

/** 사용 중인(참조된) 사진 id 목록을 받아 그 외의 것을 정리한다 */
app.post("/api/photos/cleanup", adminOnly, async (c) => {
  const { used } = await c.req.json<{ used: string[] }>();
  const usedSet = new Set(used);
  const { results } = await c.env.ras_db.prepare("SELECT id FROM photo_meta").all<{ id: string }>();
  let removed = 0;
  for (const row of results) {
    if (!usedSet.has(row.id)) {
      await c.env.ras_photos.delete(row.id);
      await c.env.ras_db.prepare("DELETE FROM photo_meta WHERE id = ?1").bind(row.id).run();
      removed += 1;
    }
  }
  return c.json({ removed });
});

/* ── 저장소 사용량 ──────────────────────────────────────────── */
app.get("/api/storage", adminOnly, async (c) => {
  const row = await c.env.ras_db
    .prepare("SELECT COUNT(*) as n, COALESCE(SUM(size), 0) as bytes FROM photo_meta")
    .first<{ n: number; bytes: number }>();
  return c.json({ photoCount: row?.n ?? 0, photoBytes: row?.bytes ?? 0 });
});

/** 큰 바이너리를 base64로 — String.fromCharCode(...전체배열)은 인자 개수 한도를 넘겨
    사진 한 장(수십~수백 KB)만 돼도 터진다. 그래서 조각내서 이어 붙인다. */
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000; // 32KB씩
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/* ── 전체 백업 · 복원 ───────────────────────────────────────── */
app.get("/api/backup", adminOnly, async (c) => {
  const [assessments, hazardInfos, inspections, surveys, stopWorks, priorityActions, settingsRow] = await Promise.all([
    c.env.ras_db.prepare("SELECT data FROM assessments").all<{ data: string }>(),
    c.env.ras_db.prepare("SELECT data FROM hazard_infos").all<{ data: string }>(),
    c.env.ras_db.prepare("SELECT data FROM inspections").all<{ data: string }>(),
    c.env.ras_db.prepare("SELECT data FROM surveys").all<{ data: string }>(),
    c.env.ras_db.prepare("SELECT data FROM stop_works").all<{ data: string }>(),
    c.env.ras_db.prepare("SELECT data FROM priority_actions").all<{ data: string }>(),
    c.env.ras_db.prepare("SELECT data FROM settings WHERE id = 'app'").first<{ data: string }>(),
  ]);

  const usedPhotoIds = new Set<string>();
  for (const row of assessments.results) {
    const a = JSON.parse(row.data) as { rows?: { beforePhoto?: string; afterPhoto?: string }[] };
    for (const r of a.rows ?? []) {
      if (r.beforePhoto) usedPhotoIds.add(r.beforePhoto);
      if (r.afterPhoto) usedPhotoIds.add(r.afterPhoto);
    }
  }
  for (const row of inspections.results) {
    const i = JSON.parse(row.data) as { items?: { photo?: string }[] };
    for (const it of i.items ?? []) if (it.photo) usedPhotoIds.add(it.photo);
  }
  for (const row of surveys.results) {
    const v = JSON.parse(row.data) as { photos?: string[] };
    for (const id of v.photos ?? []) usedPhotoIds.add(id);
  }
  // 작업중지·우선조치는 사진뿐 아니라 **서명 이미지**도 R2에 있다 — 빠뜨리면 정리 때 지워진다
  for (const row of stopWorks.results) {
    const v = JSON.parse(row.data) as { photos?: string[]; requesterSign?: string };
    for (const id of v.photos ?? []) usedPhotoIds.add(id);
    if (v.requesterSign) usedPhotoIds.add(v.requesterSign);
  }
  for (const row of priorityActions.results) {
    const v = JSON.parse(row.data) as { photos?: string[]; issuerSign?: string; coopSign?: string };
    for (const id of v.photos ?? []) usedPhotoIds.add(id);
    if (v.issuerSign) usedPhotoIds.add(v.issuerSign);
    if (v.coopSign) usedPhotoIds.add(v.coopSign);
  }

  const photos: Record<string, string> = {};
  for (const id of usedPhotoIds) {
    const obj = await c.env.ras_photos.get(id);
    if (!obj) continue;
    const ct = obj.httpMetadata?.contentType ?? "image/jpeg";
    photos[id] = `data:${ct};base64,${toBase64(await obj.arrayBuffer())}`;
  }

  return c.json({
    version: 4,
    assessments: assessments.results.map((r) => JSON.parse(r.data)),
    hazardInfos: hazardInfos.results.map((r) => JSON.parse(r.data)),
    inspections: inspections.results.map((r) => JSON.parse(r.data)),
    surveys: surveys.results.map((r) => JSON.parse(r.data)),
    stopWorks: stopWorks.results.map((r) => JSON.parse(r.data)),
    priorityActions: priorityActions.results.map((r) => JSON.parse(r.data)),
    settings: settingsRow ? JSON.parse(settingsRow.data) : undefined,
    photos,
  });
});

app.post("/api/backup/restore", adminOnly, async (c) => {
  const data = await c.req.json<{
    assessments?: { id: string; facility?: string; process?: string }[];
    hazardInfos?: { id: string; facility?: string; process?: string }[];
    inspections?: { id: string; facility?: string; process?: string }[];
    surveys?: { id: string; process?: string }[];
    stopWorks?: { id: string; dept?: string; workName?: string }[];
    priorityActions?: { id: string; site?: string }[];
    settings?: Record<string, unknown>;
    photos?: Record<string, string>;
  }>();

  const now = Date.now();

  for (const a of data.assessments ?? []) {
    await c.env.ras_db
      .prepare(
        `INSERT INTO assessments (id, data, facility, process, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET data = ?2, facility = ?3, process = ?4, updated_at = ?5`,
      )
      .bind(a.id, JSON.stringify(a), a.facility ?? "", a.process ?? "", now)
      .run();
  }

  for (const h of data.hazardInfos ?? []) {
    await c.env.ras_db
      .prepare(
        `INSERT INTO hazard_infos (id, data, facility, process, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET data = ?2, facility = ?3, process = ?4, updated_at = ?5`,
      )
      .bind(h.id, JSON.stringify(h), h.facility ?? "", h.process ?? "", now)
      .run();
  }

  for (const i of data.inspections ?? []) {
    await c.env.ras_db
      .prepare(
        `INSERT INTO inspections (id, data, facility, process, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET data = ?2, facility = ?3, process = ?4, updated_at = ?5`,
      )
      .bind(i.id, JSON.stringify(i), i.facility ?? "", i.process ?? "", now)
      .run();
  }

  for (const v of data.surveys ?? []) {
    await c.env.ras_db
      .prepare(
        `INSERT INTO surveys (id, data, facility, process, updated_at) VALUES (?1, ?2, '', ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET data = ?2, process = ?3, updated_at = ?4`,
      )
      .bind(v.id, JSON.stringify(v), v.process ?? "", now)
      .run();
  }

  for (const v of data.stopWorks ?? []) {
    await c.env.ras_db
      .prepare(
        `INSERT INTO stop_works (id, data, facility, process, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET data = ?2, facility = ?3, process = ?4, updated_at = ?5`,
      )
      .bind(v.id, JSON.stringify(v), v.dept ?? "", v.workName ?? "", now)
      .run();
  }

  for (const v of data.priorityActions ?? []) {
    await c.env.ras_db
      .prepare(
        `INSERT INTO priority_actions (id, data, facility, process, updated_at) VALUES (?1, ?2, ?3, '', ?4)
         ON CONFLICT(id) DO UPDATE SET data = ?2, facility = ?3, updated_at = ?4`,
      )
      .bind(v.id, JSON.stringify(v), v.site ?? "", now)
      .run();
  }

  if (data.settings) {
    await c.env.ras_db
      .prepare(
        `INSERT INTO settings (id, data, updated_at) VALUES ('app', ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET data = ?1, updated_at = ?2`,
      )
      .bind(JSON.stringify(data.settings), now)
      .run();
  }

  for (const [id, dataUrl] of Object.entries(data.photos ?? {})) {
    const existing = await c.env.ras_photos.head(id);
    if (existing) continue; // 이미 있으면 건너뛴다(같은 사진 재업로드 방지)
    const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!m) continue;
    const [, contentType, b64] = m;
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    await c.env.ras_photos.put(id, bytes, { httpMetadata: { contentType } });
    await c.env.ras_db
      .prepare(
        "INSERT INTO photo_meta (id, size, content_type, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO NOTHING",
      )
      .bind(id, bytes.byteLength, contentType, now)
      .run();
  }

  return c.json({ assessments: data.assessments?.length ?? 0 });
});

/* ── 전체 초기화 ────────────────────────────────────────────── */
app.post("/api/wipe", adminOnly, async (c) => {
  const { results } = await c.env.ras_db.prepare("SELECT id FROM photo_meta").all<{ id: string }>();
  for (const row of results) await c.env.ras_photos.delete(row.id);
  await c.env.ras_db.batch([
    c.env.ras_db.prepare("DELETE FROM assessments"),
    c.env.ras_db.prepare("DELETE FROM hazard_infos"),
    c.env.ras_db.prepare("DELETE FROM inspections"),
    c.env.ras_db.prepare("DELETE FROM surveys"),
    c.env.ras_db.prepare("DELETE FROM stop_works"),
    c.env.ras_db.prepare("DELETE FROM priority_actions"),
    c.env.ras_db.prepare("DELETE FROM photo_meta"),
    c.env.ras_db.prepare("DELETE FROM push_subscriptions"),
  ]);
  return c.json({ ok: true });
});

export default {
  fetch: app.fetch,
  /** wrangler.toml의 [triggers] crons가 매일 08:00(KST)에 부른다 */
  scheduled: async (_event: ScheduledEvent, env: Bindings) => {
    await runDailyDigest(env);
  },
};
