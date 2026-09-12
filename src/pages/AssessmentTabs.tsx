/**
 * 위험성평가 메뉴 — '정기평가'와 '작업평가' 두 탭.
 *
 * 둘은 성격이 다르다. 정기평가(위험성평가표)는 **공정 단위로 한 해 한 장**을 쌓고,
 * 작업평가는 **작업 한 건마다 한 장**을 쌓는다. 필드가 거의 겹치지 않아 저장소와 화면을
 * 따로 두되, 현장에서는 둘 다 '위험성평가'라 한 메뉴 안에 탭으로 나란히 뒀다.
 *
 * 상세 화면이 열려 있으면 탭 줄은 감춘다 — 문서를 보는 중에 탭이 남아 있으면
 * 실수로 눌러 작성 중인 내용을 잃는다.
 */
import * as React from "react";
import { AssessmentsPage } from "@/pages/Assessments";
import { JobAssessmentsPage } from "@/pages/JobAssessments";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

type Tab = "regular" | "job";

export function AssessmentTabs({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { assessments, jobAssessments } = useStore();
  const [tab, setTab] = React.useState<Tab>("regular");

  /* 알림·대시보드에서 id로 바로 들어올 수 있다 — 그 id가 어느 쪽 문서인지 보고 탭을 맞춘다 */
  React.useEffect(() => {
    if (!openId) return;
    if (jobAssessments.some((v) => v.id === openId)) setTab("job");
    else if (assessments.some((v) => v.id === openId)) setTab("regular");
  }, [openId, assessments, jobAssessments]);

  const detailOpen =
    !!openId && (assessments.some((v) => v.id === openId) || jobAssessments.some((v) => v.id === openId));

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "regular", label: "정기평가", count: assessments.length },
    { key: "job", label: "작업평가", count: jobAssessments.length },
  ];

  return (
    <div className="space-y-4">
      {!detailOpen && (
        <div className="no-print flex w-fit gap-1 rounded-2xl bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                onOpen(null); // 탭을 바꾸면 열려 있던 문서는 닫는다(다른 종류의 id가 남지 않게)
              }}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm transition-colors",
                tab === t.key ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "regular" ? (
        <AssessmentsPage openId={openId} onOpen={onOpen} />
      ) : (
        <JobAssessmentsPage openId={openId} onOpen={onOpen} />
      )}
    </div>
  );
}
