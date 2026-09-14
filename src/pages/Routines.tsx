/**
 * 상시평가 — 'TBM'과 '일일교육' 두 서브탭.
 *
 * 정기평가·작업평가가 '평가표'라면 상시평가는 **작업 당일의 기록**이다. 둘 다 같은
 * 저장소(`routine_assessments`)에 `kind`로 구분해 담기지만, 서식이 달라 화면은 따로 둔다.
 * 목록·서명·권한·잠금 규칙은 그대로 나눠 쓴다.
 */
import * as React from "react";
import { TbmsPage } from "@/pages/Tbms";
import { EducationsPage } from "@/pages/Educations";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

type Sub = "tbm" | "education";

export function RoutinesPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { routines } = useStore();
  const [sub, setSub] = React.useState<Sub>("tbm");

  /* 알림·대시보드에서 id로 바로 들어올 수 있다 — 그 id가 어느 종류인지 보고 서브탭을
     맞춘다(안 맞추면 교육일지를 열었는데 TBM 목록이 뜬다). */
  React.useEffect(() => {
    if (!openId) return;
    const found = routines.find((v) => v.id === openId);
    if (found) setSub(found.kind === "education" ? "education" : "tbm");
  }, [openId, routines]);

  const tbmCount = routines.filter((v) => v.kind === "tbm").length;
  const educationCount = routines.filter((v) => v.kind === "education").length;
  const detailOpen = !!openId && routines.some((v) => v.id === openId);

  const SUBS: { key: Sub; label: string; count: number }[] = [
    { key: "tbm", label: "TBM", count: tbmCount },
    { key: "education", label: "일일교육", count: educationCount },
  ];

  return (
    <div className="space-y-4">
      {!detailOpen && (
        <div className="no-print flex w-fit gap-1 rounded-xl bg-muted/60 p-0.5">
          {SUBS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSub(s.key);
                onOpen(null);
              }}
              className={cn(
                "rounded-lg px-3 py-1 text-xs transition-colors",
                sub === s.key ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {sub === "tbm" ? (
        <TbmsPage openId={openId} onOpen={onOpen} />
      ) : (
        <EducationsPage openId={openId} onOpen={onOpen} />
      )}
    </div>
  );
}
