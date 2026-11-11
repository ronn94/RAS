import * as React from "react";
import { Timer } from "lucide-react";
import { logout as apiLogout } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * 로그인 남은 시간 + [연장] (2026-11-11, work-permit과 같은 방식) — 1시간이 지나면 자동으로 로그아웃한다.
 * 백그라운드 탭은 타이머가 늦게 돌 수 있어 화면으로 돌아올 때도 확인한다. 5분 이하면 붉게.
 */
export function SessionTimer({ initialExp }: { initialExp?: number }) {
  const [exp, setExp] = React.useState(initialExp ?? Date.now() + 60 * 60 * 1000);
  const [now, setNow] = React.useState(() => Date.now());
  const [busy, setBusy] = React.useState(false);
  const done = React.useRef(false);

  React.useEffect(() => {
    const expire = () => {
      if (done.current || Date.now() < exp) return;
      done.current = true;
      void apiLogout().finally(() => {
        alert("로그인한 지 1시간이 지나 자동으로 로그아웃되었습니다. 다시 로그인해 주세요.");
        location.reload();
      });
    };
    const tick = window.setInterval(() => { setNow(Date.now()); expire(); }, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") expire(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", expire);
    return () => { window.clearInterval(tick); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", expire); };
  }, [exp]);

  const extend = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/extend", { method: "POST", credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { exp?: number; error?: string };
      if (!res.ok || !data.exp) throw new Error(data.error || "로그인을 연장하지 못했습니다.");
      setExp(data.exp);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const left = Math.max(0, Math.floor((exp - now) / 1000));
  const text = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const warn = left <= 300;
  return (
    <span
      className={cn(
        "no-print inline-flex h-8 items-center gap-1.5 rounded-full border bg-background pl-2.5 pr-1 text-xs font-semibold tabular-nums",
        warn ? "border-destructive/40 text-destructive" : "text-foreground",
      )}
      title="로그인 유지 남은 시간"
    >
      <Timer className="size-3.5" aria-hidden />
      <span aria-label={`로그인 남은 시간 ${text}`}>{text}</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void extend()}
        className={cn("h-6 rounded-full px-2.5 text-[11px] font-bold disabled:opacity-60", warn ? "bg-destructive text-white" : "bg-muted text-foreground hover:bg-muted/70")}
      >
        연장
      </button>
    </span>
  );
}
