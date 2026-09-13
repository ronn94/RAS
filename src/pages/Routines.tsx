/**
 * 상시평가 — 'TBM'과 '일일교육' 두 서브탭.
 *
 * 정기평가·작업평가가 '평가표'라면 상시평가는 **작업 당일의 기록**이다. 둘 다 같은
 * 저장소(`routine_assessments`)에 `kind`로 구분해 담기지만, 서식이 달라 화면은 따로 둔다.
 * 일일교육은 아직 서식을 옮기기 전이라 자리만 잡아 두었다.
 */
import * as React from "react";
import { TbmsPage } from "@/pages/Tbms";
import { EmptyState } from "@/components/ui";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

type Sub = "tbm" | "education";

export function RoutinesPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { routines } = useStore();
  const [sub, setSub] = React.useState<Sub>("tbm");

  const tbmCount = routines.filter((v) => v.kind === "tbm").length;
  const detailOpen = !!openId && routines.some((v) => v.id === openId);

  const SUBS: { key: Sub; label: string; count: number }[] = [
    { key: "tbm", label: "TBM", count: tbmCount },
    { key: "education", label: "일일교육", count: 0 },
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
        <EmptyState icon={<GraduationCap className="size-6 text-muted-foreground" />}>
          일일교육 서식은 아직 준비 중입니다.
        </EmptyState>
      )}
    </div>
  );
}
