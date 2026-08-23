/**
 * 로그인 — Cloudflare Access(Zero Trust)로 사이트 전체를 보호하고,
 * 앱은 Access가 알려주는 신원을 읽어 표시한다. 앱에 계정 서버를 두지 않는다.
 *
 * 배포 후 Zero Trust에서 Pages 도메인에 Access 애플리케이션을 만들면 동작한다.
 * 로컬 개발처럼 Access가 없는 환경에서는 설정에 저장한 프로필로 대체한다.
 */
export type Identity = {
  name: string;
  email: string;
  role: string;
  /** Cloudflare Access로 실제 로그인된 상태인지 */
  authenticated: boolean;
};

const IDENTITY_URL = "/cdn-cgi/access/get-identity";
export const LOGOUT_URL = "/cdn-cgi/access/logout";

export async function fetchIdentity(): Promise<Identity | null> {
  try {
    const res = await fetch(IDENTITY_URL, { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; email?: string; custom?: Record<string, string> };
    if (!data.email) return null;
    return {
      name: data.name || data.email.split("@")[0],
      email: data.email,
      role: data.custom?.role || "안전관리자",
      authenticated: true,
    };
  } catch {
    return null; // Access가 없는 환경(로컬 개발 등)
  }
}
