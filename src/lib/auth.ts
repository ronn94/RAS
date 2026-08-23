/**
 * 로그인 — Cloudflare Access(Zero Trust)로 사이트 전체를 보호하고,
 * Worker(worker/index.ts의 /api/identity)가 Access의 인증 헤더를 읽어 알려준다.
 * Access는 이 헤더를 엣지에서 항상 덮어쓰므로 클라이언트가 위조할 수 없다.
 *
 * 배포 후 Zero Trust에서 이 Worker 도메인에 Access 애플리케이션을 만들면 동작한다.
 * Access가 없는 환경(로컬 개발 등)에서는 설정에 저장한 프로필로 대체한다.
 */
export type Identity = {
  name: string;
  email: string;
  role: string;
  /** Cloudflare Access로 실제 로그인된 상태인지 */
  authenticated: boolean;
};

export const LOGOUT_URL = "/cdn-cgi/access/logout";

export async function fetchIdentity(): Promise<Identity | null> {
  try {
    const res = await fetch("/api/identity");
    if (!res.ok) return null;
    const data = (await res.json()) as { authenticated: boolean; email?: string; name?: string };
    if (!data.authenticated || !data.email) return null;
    return {
      name: data.name || data.email.split("@")[0],
      email: data.email,
      role: "안전관리자",
      authenticated: true,
    };
  } catch {
    return null; // Access가 없는 환경(로컬 개발 등)
  }
}
