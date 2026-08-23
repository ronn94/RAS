import * as React from "react";
import { Eye, LogIn, TriangleAlert } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@/components/ui";
import { login, loginGuest } from "@/lib/auth";

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"login" | "guest" | null>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("login");
    setError(null);
    const res = await login(username, password);
    setBusy(null);
    if (!res.ok) {
      setError(res.message);
      setPassword("");
      passwordRef.current?.focus();
      return;
    }
    onSuccess();
  };

  const guest = async () => {
    setBusy("guest");
    setError(null);
    const res = await loginGuest();
    setBusy(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onSuccess();
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-content-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            R
          </div>
          <div>
            <h1 className="font-heading text-base font-semibold">RAS</h1>
            <p className="text-sm text-muted-foreground">위험성평가 시스템</p>
          </div>
        </div>

        <Card className="shadow-xs">
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="username">아이디</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  ref={passwordRef}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  required
                />
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">{error}</span>
                </div>
              )}

              <Button type="submit" size="lg" disabled={!!busy || !password || !username}>
                <LogIn className="size-3.5" />
                {busy === "login" ? "확인 중…" : "로그인"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              또는
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" size="lg" className="w-full" disabled={!!busy} onClick={() => void guest()}>
              <Eye className="size-3.5" />
              {busy === "guest" ? "접속 중…" : "게스트로 보기"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          게스트는 조회만 가능합니다. 편집 권한은 관리자가 설정에서 켤 수 있습니다.
        </p>
      </div>
    </div>
  );
}
