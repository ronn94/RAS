/**
 * BP 안전포털 연계 보기 화면(2026-11-15) — /view/job?vt=보기토큰[&sign=1]
 * - 로그인 없이 작업평가 1건을 읽기 전용으로 연다(서버: worker/link.ts viewRoutes).
 * - sign=1(BP '허가서' 탭 서명 모드): 외부 참여자 칸만 강조하고, 누르면 BP 창(부모)에 알린다.
 *   저장은 BP가 연계 서명 경로(/api/link/jobs/:id/sign)로 한다.
 * - 인쇄(BP의 PDF 만들기)는 숨은 .print-root(JobAssessmentSheet)가 맡는다.
 */
import * as React from "react";
import { StoreContext } from "@/store";
import { JobAssessmentContinuousSheet, JobAssessmentSheet } from "@/print/JobAssessmentSheet";
import type { JobAssessment } from "@/lib/jobAssessment";

export function ViewJobPage() {
  const sp = new URLSearchParams(window.location.search);
  const vt = sp.get("vt") ?? "";
  const signMode = sp.get("sign") === "1";
  const [data, setData] = React.useState<{ job: JobAssessment; settings: unknown } | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    fetch(`/api/view/job?vt=${encodeURIComponent(vt)}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "열지 못했습니다."); setData(d); })
      .catch((e) => setError((e as Error).message));
  }, [vt]);
  React.useEffect(() => {
    if (!signMode) return;
    const h = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sign][data-sign-sec="외부 참여자"]');
      if (!el) return;
      window.parent.postMessage({ type: "ras-sign", target: el.dataset.sign, name: el.dataset.signAskName === "1" ? "" : el.dataset.signLabel ?? "", signed: el.dataset.signed === "1" }, "*");
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [signMode]);
  if (error) return <p className="p-6 text-center text-sm text-muted-foreground">{error}</p>;
  if (!data) return <p className="p-6 text-center text-sm text-muted-foreground">불러오는 중…</p>;
  const store = { settings: data.settings } as React.ContextType<typeof StoreContext>;
  return (
    <StoreContext.Provider value={store}>
      <div className={signMode ? "ras-bp-sign" : undefined} style={{ padding: 8 }}>
        <div className="screen-preview rounded-2xl no-print">
          <JobAssessmentContinuousSheet job={data.job} />
        </div>
      </div>
      <JobAssessmentSheet job={data.job} />
    </StoreContext.Provider>
  );
}
