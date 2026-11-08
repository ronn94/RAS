import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* AI 도우미 화면 쪽(2026-11-08) — 서버는 worker/ai.ts. 결과는 초안: 빈 칸만 채우고 사람이 확인한다. */
export type AiHazardResult = {
  hazardClass: string; hazardCode: string; label: string; reason: string;
  currentControl?: string; currentFromList?: boolean; measure?: string;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error ?? `AI 요청에 실패했습니다 (${res.status})`);
  return data;
}

export const aiHazard = (body: { hazard: string; process?: string; subProcess?: string; withMeasures?: boolean }) =>
  post<AiHazardResult>("/ai/hazard", body);

/** 작은 ✨ 버튼 — 누르는 동안 돌고, 결과 한 줄을 버튼 옆(아래)에 남긴다 */
export function AiButton({ run, disabled, label = "AI", title, className }: {
  run: () => Promise<string>; disabled?: boolean; label?: string; title?: string; className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className={cn("inline-flex flex-col items-start gap-0.5", className)}>
      <button
        type="button"
        disabled={disabled || busy}
        title={title}
        onClick={async () => {
          setBusy(true); setNote(null);
          try { setNote({ ok: true, text: await run() }); } catch (e) { setNote({ ok: false, text: (e as Error).message }); }
          finally { setBusy(false); }
        }}
        className="inline-flex h-6 items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300"
      >
        <Sparkles className={cn("size-3", busy && "animate-spin")} />
        {busy ? "추천 중…" : label}
      </button>
      {note && <span className={cn("max-w-64 text-[11px] leading-snug", note.ok ? "text-violet-700 dark:text-violet-300" : "text-destructive")}>{note.text}</span>}
    </span>
  );
}

/** 평가표로 옮기기 전 — 고른 평가표에 비슷한 위험요인 행이 있으면 알려 준다(막지는 않는다) */
export function SimilarRowsHint({ texts, rows }: { texts: string[]; rows: Array<{ id: string; no: number; text: string }> }) {
  const [state, setState] = React.useState<{ busy: boolean; error?: string; matches?: Array<{ textIndex: number; rowId: string; score: number }> }>({ busy: false });
  const key = JSON.stringify([texts, rows.map((r) => r.id)]);
  React.useEffect(() => { setState({ busy: false }); }, [key]);
  const usable = texts.some((t) => t.trim()) && rows.some((r) => r.text.trim());
  if (!usable) return null;
  const check = async () => {
    setState({ busy: true });
    try {
      const r = await post<{ matches: Array<{ textIndex: number; rowId: string; score: number }> }>("/ai/similar", { texts, rows: rows.filter((x) => x.text.trim()).map(({ id, text }) => ({ id, text })) });
      setState({ busy: false, matches: r.matches });
    } catch (e) { setState({ busy: false, error: (e as Error).message }); }
  };
  const rowOf = (id: string) => rows.find((r) => r.id === id);
  return (
    <div className="space-y-1 rounded-xl border border-violet-200 bg-violet-50/60 p-2.5 text-xs dark:border-violet-800 dark:bg-violet-950/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">이 평가표에 비슷한 위험요인이 이미 있는지 확인합니다.</span>
        <button type="button" onClick={() => void check()} disabled={state.busy}
          className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-violet-300 bg-white px-2 font-semibold text-violet-700 disabled:opacity-50 dark:bg-transparent dark:text-violet-300">
          <Sparkles className={cn("size-3", state.busy && "animate-spin")} />{state.busy ? "확인 중…" : "중복 확인"}
        </button>
      </div>
      {state.error && <p className="text-destructive">{state.error}</p>}
      {state.matches && (state.matches.length === 0
        ? <p className="text-violet-700 dark:text-violet-300">비슷한 행이 없습니다.</p>
        : <ul className="space-y-1">{state.matches.map((m, i) => { const r = rowOf(m.rowId); return r ? (
            <li key={i} className="text-amber-800 dark:text-amber-300">
              ⚠ {texts.length > 1 ? `"${texts[m.textIndex].slice(0, 24)}…" ↔ ` : ""}기존 <b>{r.no}번 행</b>과 비슷합니다({Math.round(m.score * 100)}%): {r.text.slice(0, 60)}
            </li>) : null; })}</ul>)}
    </div>
  );
}
