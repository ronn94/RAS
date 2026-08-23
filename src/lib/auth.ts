/**
 * 로그인 — 아이디·비밀번호(SSM 대시보드와 같은 방식) 또는 비밀번호 없는 게스트.
 * Worker가 서명한 세션 쿠키(HttpOnly)로 인증 상태를 유지한다.
 * 게스트는 뷰어다 — 설정에서 켠 개별 권한(edit·delete·photo)만 쓸 수 있고
 * 관리 기능(설정 변경·백업·초기화)은 서버가 항상 막는다.
 */
export type Role = "admin" | "guest";

export type Identity = {
  name: string;
  role: Role;
  authenticated: boolean;
};

/** 로그인 여부만 조용히 확인한다(실패해도 예외를 던지지 않음) */
export async function checkAuth(): Promise<Identity> {
  try {
    const res = await fetch("/api/identity", { credentials: "same-origin" });
    if (!res.ok) return { name: "", role: "guest", authenticated: false };
    const data = (await res.json()) as { authenticated: boolean; name?: string; role?: Role };
    return { authenticated: data.authenticated, name: data.name ?? "", role: data.role ?? "guest" };
  } catch {
    return { name: "", role: "guest", authenticated: false };
  }
}

async function postAuth(path: string, body?: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, message: data.error || "로그인에 실패했습니다." };
    return { ok: true };
  } catch {
    return { ok: false, message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export const login = (username: string, password: string) => postAuth("/api/auth/login", { username, password });
export const loginGuest = () => postAuth("/api/auth/login-guest");

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
}
