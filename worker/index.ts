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
import { Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { login, loginGuest, logout, readSession } from "./auth";

type Bindings = {
  ras_db: D1Database;
  ras_photos: R2Bucket;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
};

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

/** 게스트는 켜진 권한만, 관리자는 항상 통과 */
async function loadPermissions(db: D1Database) {
  const row = await db.prepare("SELECT data FROM settings WHERE id = 'app'").first<{ data: string }>();
  const parsed = row ? (JSON.parse(row.data) as { permissions?: Record<string, boolean> }) : null;
  return parsed?.permissions ?? {};
}

function requirePermission(key: "edit" | "delete" | "photo"): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    if (c.get("role") !== "guest") return next();
    const permissions = await loadPermissions(c.env.ras_db);
    if (!permissions[key]) return c.json({ error: "게스트 계정에는 이 권한이 없습니다." }, 403);
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

/* ── 공용: JSON 문서 컬렉션(assessments / hazard_infos) ──────── */
function collection(table: "assessments" | "hazard_infos") {
  const r = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  r.get("/", async (c) => {
    const { results } = await c.env.ras_db
      .prepare(`SELECT data FROM ${table} ORDER BY updated_at DESC`)
      .all<{ data: string }>();
    return c.json(results.map((row) => JSON.parse(row.data)));
  });

  r.put("/:id", requirePermission("edit"), async (c) => {
    const id = c.req.param("id");
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
    return c.json(doc);
  });

  r.delete("/:id", requirePermission("delete"), async (c) => {
    const id = c.req.param("id");
    await c.env.ras_db.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run();
    return c.json({ ok: true });
  });

  return r;
}

app.route("/api/assessments", collection("assessments"));
app.route("/api/hazardinfos", collection("hazard_infos"));

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

/* ── 사진 (R2) ──────────────────────────────────────────────
   업로드 시 서버에서 새 id를 발급한다 — 클라이언트가 id를 정하지 않는다. */
app.post("/api/photos", requirePermission("photo"), async (c) => {
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

app.delete("/api/photos/:id", requirePermission("photo"), async (c) => {
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
  const [assessments, hazardInfos, settingsRow] = await Promise.all([
    c.env.ras_db.prepare("SELECT data FROM assessments").all<{ data: string }>(),
    c.env.ras_db.prepare("SELECT data FROM hazard_infos").all<{ data: string }>(),
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

  const photos: Record<string, string> = {};
  for (const id of usedPhotoIds) {
    const obj = await c.env.ras_photos.get(id);
    if (!obj) continue;
    const ct = obj.httpMetadata?.contentType ?? "image/jpeg";
    photos[id] = `data:${ct};base64,${toBase64(await obj.arrayBuffer())}`;
  }

  return c.json({
    version: 3,
    assessments: assessments.results.map((r) => JSON.parse(r.data)),
    hazardInfos: hazardInfos.results.map((r) => JSON.parse(r.data)),
    settings: settingsRow ? JSON.parse(settingsRow.data) : undefined,
    photos,
  });
});

app.post("/api/backup/restore", adminOnly, async (c) => {
  const data = await c.req.json<{
    assessments?: { id: string; facility?: string; process?: string }[];
    hazardInfos?: { id: string; facility?: string; process?: string }[];
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
    c.env.ras_db.prepare("DELETE FROM photo_meta"),
  ]);
  return c.json({ ok: true });
});

export default app;
