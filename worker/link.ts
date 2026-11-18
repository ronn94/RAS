/**
 * BP 안전포털 연계(2026-11-15) — work-permit 연계(worker/link.js)와 같은 방식.
 *  /api/link/*  : BP 서버만 부른다(머리글 x-link-key = LINK_SECRET, Cloudflare 비밀값)
 *    GET  /api/link/jobs?q=&from=&to=   등록 후보(평가자 서명까지 끝난 작업평가)
 *    GET  /api/link/jobs/:id            요약 + 문서 버전 + 보기 주소(짧은 보기 토큰)
 *    POST /api/link/jobs/:id/sign       {name, sign, version?, target?} 외부 참여자 서명
 *  /api/view/*  : 보기 토큰(작업평가 1건·읽기 전용·2시간)으로 여는 화면용
 *    GET  /api/view/job?vt=             문서 + 설정
 *    GET  /api/view/photo/:id?vt=       그 문서의 서명 그림만
 */
import type { Context } from "hono";
import { DEFAULT_SETTINGS, withDefaults } from "../src/lib/settings";
import { handSignaturesComplete, type JobAssessment, type JobParticipant } from "../src/lib/jobAssessment";
import type { Bindings } from "./bindings";

type C = Context<{ Bindings: Bindings & { LINK_SECRET?: string } }>;
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
async function hmac(v: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(v))));
}
const same = (a: string, b: string) => {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
};
const VIEW_HOURS = 2;
async function viewToken(id: string, secret: string) {
  const exp = Date.now() + VIEW_HOURS * 3600e3;
  return `${id}.${exp}.${await hmac(`view:job:${id}:${exp}`, secret)}`;
}
async function verifyView(vt: string | null | undefined, secret?: string) {
  const [id, exp, sig] = String(vt ?? "").split(".");
  if (!id || !exp || !sig || !secret || Number(exp) < Date.now()) return null;
  return same(sig, await hmac(`view:job:${id}:${exp}`, secret)) ? id : null;
}
// 서명·사람 수를 뺀 내용으로 만든 버전 — 내용이 바뀌면 달라진다(서명 뒤 내용 변경 확인용)
async function version(doc: JobAssessment) {
  const strip = { ...doc, participants: [], rows: doc.rows.map((r) => ({ ...r, ownerSign: undefined, ownerSignedAt: undefined })), evaluatorSign: undefined, evaluatorSignedAt: undefined, approvedBySign: undefined, approvedBySignedAt: undefined, locked: undefined, autoLocked: undefined, updatedAt: undefined };
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(JSON.stringify(strip))));
  return [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const loadJob = async (c: C, id: string) => {
  const row = await c.env.ras_db.prepare("SELECT data FROM job_assessments WHERE id = ?1").bind(id).first<{ data: string }>();
  return row ? (JSON.parse(row.data) as JobAssessment) : null;
};
const title = (d: JobAssessment) => d.content || [d.mainCategory, d.subCategory, d.detailCategory].filter(Boolean).join(" · ") || "(작업내용 없음)";
const summary = async (d: JobAssessment) => ({
  id: d.id, title: title(d), date: d.date, team: d.team, category: [d.mainCategory, d.subCategory, d.detailCategory].filter(Boolean).join(" · "),
  evaluator: d.evaluator, evaluated: !!d.evaluatorSign, approved: !!d.approvedBySign, locked: !!d.locked && !(d.autoLocked && !handSignaturesComplete(d)), version: await version(d),
  external: d.participants.filter((p) => p.external).map((p) => ({ name: p.undecided ? "" : p.name, signed: !!p.sign, undecided: !!p.undecided })),
});

export async function linkRoutes(c: C) {
  const secret = c.env.LINK_SECRET;
  if (!secret || !same(c.req.header("x-link-key") ?? "", secret)) return c.json({ error: "연계 인증 실패" }, 401);
  const parts = c.req.path.replace(/^\/api\/link\//, "").split("/");
  if (parts[0] !== "jobs") return c.json({ error: "없는 주소입니다." }, 404);
  const id = parts[1];
  if (!id && c.req.method === "GET") {
    const q = (c.req.query("q") ?? "").trim();
    // 작업평가는 작업 전에 미리 쓰는 경우가 많다 — 시작 30일 전부터 끝 7일 뒤까지, 검색어가 있으면 기간 무시
    const shift = (v: string | undefined, days: number, dflt: string) => { if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return dflt; const t = new Date(`${v}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + days); return t.toISOString().slice(0, 10); };
    const from = q ? "0000-00-00" : shift(c.req.query("from"), -30, "0000-00-00"), to = q ? "9999-99-99" : shift(c.req.query("to") || c.req.query("from"), 7, "9999-99-99");
    const rows = (await c.env.ras_db.prepare("SELECT data FROM job_assessments ORDER BY updated_at DESC LIMIT 400").all<{ data: string }>()).results;
    const list = rows.map((r) => JSON.parse(r.data) as JobAssessment)
      .filter((d) => !d.date || (d.date >= from && d.date <= to))
      .filter((d) => !q || [d.content, d.mainCategory, d.subCategory, d.detailCategory, d.team, d.evaluator].some((x) => (x ?? "").includes(q)))
      .sort((a, b) => Number(!!b.evaluatorSign) - Number(!!a.evaluatorSign))
      .slice(0, 50);
    return c.json(await Promise.all(list.map(summary)));
  }
  const doc = id ? await loadJob(c, id) : null;
  if (!doc) return c.json({ error: "작업평가를 찾지 못했습니다." }, 404);
  if (!parts[2] && c.req.method === "GET") {
    return c.json({ ...(await summary(doc)), view_path: `/view/job?vt=${encodeURIComponent(await viewToken(doc.id, secret))}` });
  }
  if (parts[2] === "sign" && c.req.method === "POST") {
    // 승인자 서명 전에 예전 기준으로 저절로 잠긴 문서는 풀어서 본다(2026-11-18 — 승인자까지 서명해야 잠금)
    if (doc.autoLocked && !handSignaturesComplete(doc)) { doc.locked = false; doc.autoLocked = false; }
    if (doc.locked) return c.json({ error: "잠긴(서명 완료된) 작업평가라 서명을 더 받을 수 없습니다." }, 409);
    const body = (await c.req.json().catch(() => ({}))) as { name?: string; sign?: string; version?: string; target?: string };
    const name = String(body.name ?? "").trim();
    const sign = String(body.sign ?? "");
    if (!/^[가-힣]{2,20}$/.test(name)) return c.json({ error: "이름은 한글로 입력해 주세요." }, 422);
    if (!sign.startsWith("data:image/png;base64,") || sign.length > 400000) return c.json({ error: "서명 이미지가 올바르지 않습니다." }, 422);
    if (body.version && body.version !== (await version(doc))) return c.json({ error: "작업평가 내용이 바뀌었습니다. 다시 확인해 주세요." }, 409);
    // 외부 참여자만 — 누른 칸(target) → 같은 이름 → 비어 있는 '미정' 칸 → 새 줄 순서로 찾는다
    const ext = doc.participants.filter((p) => p.external);
    let p: JobParticipant | undefined = body.target ? ext.find((x) => x.id === body.target) : undefined;
    if (p && !p.undecided && p.name.trim() && p.name.trim() !== name) p = undefined;
    // 미정 칸·새 칸을 눌렀으면 어느 칸을 눌렀든 등록된 미정 칸을 앞에서부터 차례로 채운다
    if (p?.undecided) p = undefined;
    p ??= ext.find((x) => !x.undecided && x.name.trim() === name) ?? ext.find((x) => x.undecided && !x.sign);
    let added = false;
    if (!p) { p = { id: crypto.randomUUID(), name, external: true, undecided: false }; doc.participants.push(p); added = true; }
    if (p.undecided || !p.name.trim()) { p.name = name; p.undecided = false; }
    const bin = atob(sign.slice(sign.indexOf(",") + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const signId = crypto.randomUUID();
    await c.env.ras_photos.put(signId, bytes, { httpMetadata: { contentType: "image/png" } });
    await c.env.ras_db.prepare("INSERT INTO photo_meta (id, size, content_type, created_at) VALUES (?1, ?2, ?3, ?4)").bind(signId, bytes.byteLength, "image/png", Date.now()).run();
    const previous = p.sign;
    p.sign = signId; p.signedAt = Date.now();
    if (previous) { await c.env.ras_photos.delete(previous); await c.env.ras_db.prepare("DELETE FROM photo_meta WHERE id = ?1").bind(previous).run(); }
    // 서명이 다 모이면 저절로 잠근다(worker/index.ts applyAutoLock과 같은 규칙)
    if (handSignaturesComplete(doc)) { doc.locked = true; doc.autoLocked = true; }
    doc.updatedAt = Date.now();
    await c.env.ras_db.prepare("UPDATE job_assessments SET data = ?2, updated_at = ?3 WHERE id = ?1").bind(doc.id, JSON.stringify(doc), doc.updatedAt).run();
    return c.json({ ok: true, added });
  }
  return c.json({ error: "지원하지 않는 요청입니다." }, 405);
}

export async function viewRoutes(c: C) {
  const id = await verifyView(c.req.query("vt") ?? c.req.header("x-view-token"), c.env.LINK_SECRET);
  if (!id) return c.json({ error: "보기 주소가 만료되었습니다. 다시 열어 주세요." }, 401);
  const doc = await loadJob(c, id);
  if (!doc) return c.json({ error: "작업평가를 찾지 못했습니다." }, 404);
  const path = c.req.path;
  if (path === "/api/view/job") {
    const row = await c.env.ras_db.prepare("SELECT data FROM settings WHERE id = 'app'").first<{ data: string }>();
    let settings;
    try { settings = withDefaults(row ? JSON.parse(row.data) : DEFAULT_SETTINGS); } catch { settings = withDefaults(DEFAULT_SETTINGS); }
    return c.json({ job: doc, settings, version: await version(doc) });
  }
  const m = /^\/api\/view\/photo\/([\w-]+)$/.exec(path);
  if (m) {
    const ids = new Set([doc.evaluatorSign, doc.approvedBySign, ...doc.participants.map((p) => p.sign), ...doc.rows.map((r) => r.ownerSign)].filter(Boolean) as string[]);
    if (!ids.has(m[1])) return c.json({ error: "이 문서의 그림이 아닙니다." }, 403);
    const obj = await c.env.ras_photos.get(m[1]);
    if (!obj) return c.notFound();
    return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType ?? "image/png", "cache-control": "private, max-age=3600" } });
  }
  return c.json({ error: "없는 주소입니다." }, 404);
}
