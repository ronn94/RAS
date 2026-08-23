/**
 * 아이디·비밀번호 로그인 — SSM 대시보드와 같은 방식(HMAC 서명 세션 쿠키).
 * 계정을 여러 개 두지 않고, 안전팀이 공유하는 관리자 계정 하나를 Worker 시크릿으로 둔다.
 * 비밀번호 자체는 어디에도 저장하지 않고 매 요청마다 시간 상수 비교만 한다.
 */
import type { Context } from "hono";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const fromB64 = (v: string) =>
  Uint8Array.from(atob(v.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (v.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );

/** 타이밍 공격 방지 — 길이가 같을 때 전 바이트를 항상 비교한다 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function readCookie(header: string | undefined | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (decodeURIComponent(part.slice(0, i).trim()) === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

type SessionPayload = { sub: string; exp: number };
type AuthEnv = { ADMIN_USERNAME?: string; ADMIN_PASSWORD?: string; SESSION_SECRET?: string };

const SESSION_HOURS = 12;
const COOKIE_NAME = "ras_session";

export async function readSession<Env extends { Bindings: AuthEnv }>(c: Context<Env>): Promise<SessionPayload | null> {
  const secret = c.env.SESSION_SECRET;
  const token = readCookie(c.req.header("cookie"), COOKIE_NAME);
  if (!token || !secret) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!timingSafeEqual(await sign(body, secret), fromB64(signature))) return null;
  try {
    const payload = JSON.parse(decoder.decode(fromB64(body))) as SessionPayload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function login<Env extends { Bindings: AuthEnv }>(c: Context<Env>) {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET } = c.env;
  if (!ADMIN_PASSWORD || !SESSION_SECRET) {
    return c.json({ error: "관리자 계정이 아직 설정되지 않았습니다." }, 503);
  }
  const body = await c.req.json<{ username?: string; password?: string }>().catch(() => ({}) as { username?: string; password?: string });
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const expectedUser = ADMIN_USERNAME || "admin";

  if (username !== expectedUser || !timingSafeEqual(encoder.encode(password), encoder.encode(ADMIN_PASSWORD))) {
    return c.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
  }

  const payloadB64 = b64(
    encoder.encode(JSON.stringify({ sub: username, exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000 })),
  );
  const token = `${payloadB64}.${b64(await sign(payloadB64, SESSION_SECRET))}`;
  c.header(
    "set-cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`,
  );
  return c.json({ ok: true, username });
}

export async function loginGuest<Env extends { Bindings: AuthEnv }>(c: Context<Env>) {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: "서버 설정이 완료되지 않았습니다." }, 503);
  const payloadB64 = b64(
    encoder.encode(JSON.stringify({ sub: "guest", exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000 })),
  );
  const token = `${payloadB64}.${b64(await sign(payloadB64, secret))}`;
  c.header(
    "set-cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`,
  );
  return c.json({ ok: true, username: "guest" });
}

export function logout(c: Context) {
  c.header("set-cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  return c.json({ ok: true });
}
