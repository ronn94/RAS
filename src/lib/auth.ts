/**
 * 로그인 — 아이디·비밀번호(SSM 대시보드와 같은 방식). Worker가 서명한 세션
 * 쿠키(HttpOnly)로 인증 상태를 유지한다. 비밀번호는 브라우저에 남기지 않는다.
 */
export type Identity = {
  name: string;
  authenticated: boolean;
};

/** 로그인 여부만 조용히 확인한다(실패해도 예외를 던지지 않음) */
export async function checkAuth(): Promise<Identity> {
  try {
    const res = await fetch("/api/identity", { credentials: "same-origin" });
    if (!res.ok) return { name: "", authenticated: false };
    const data = (await res.json()) as { authenticated: boolean; name?: string };
    return { authenticated: data.authenticated, name: data.name ?? "" };
  } catch {
    return { name: "", authenticated: false };
  }
}

export async function login(username: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, message: body.error || "로그인에 실패했습니다." };
    return { ok: true };
  } catch {
    return { ok: false, message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
}
