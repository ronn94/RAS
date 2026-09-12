/**
 * 작업 위험성평가 — 목록에서 행을 클릭하면 여는 **완성본 미리보기**.
 *
 * 인쇄 서식(JobAssessmentSheet)을 화면 밖에 숨기지 않고 그대로 띄운다 — 실제로
 * 인쇄하면 어떻게 나오는지 화면에서 바로 확인할 수 있게 하려는 것이다. 다른 문서처럼
 * 곧장 작성화면(5단계 마법사)을 여는 대신, 완성본을 먼저 보여주고 고칠 게 있으면
 * '수정' 버튼으로 넘어간다 — 실수로 값을 건드릴 걱정 없이 훑어볼 수 있다.
 */
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { JobAssessmentSheet } from "@/print/JobAssessmentSheet";
import { jraGrade, jraLabel, jraScore, signedParticipants, type JobAssessment } from "@/lib/jobAssessment";
import { cn } from "@/lib/utils";

const JRA_TONE: Record<string, string> = {
  "A(고위험)": "bg-destructive/10 text-destructive",
  "B(중위험)": "bg-orange-500/10 text-orange-600",
  "C(저위험)": "text-muted-foreground",
};

export function JobAssessmentPreview({
  job,
  canEdit,
  onBack,
  onEdit,
}: {
  job: JobAssessment;
  /** 게스트도 작업평가는 직접 관리하므로 canJobAssessment를 그대로 받는다 */
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const grade = jraGrade(jraScore(job));
  const signed = signedParticipants(job);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">작업 위험성평가 미리보기</div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {job.date || "일자 미입력"} ·{" "}
              {[job.mainCategory, job.subCategory].filter(Boolean).join(" · ") || "분류 미입력"}
              <Badge variant="outline" className={cn("font-normal", JRA_TONE[grade])}>
                JRA {jraLabel(job)}
              </Badge>
              {job.participants.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  서명 {signed}/{job.participants.length}
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon-lg" onClick={() => window.print()} aria-label="인쇄" title="인쇄">
            <Printer />
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={!canEdit}
            title={canEdit ? "작성화면에서 고칩니다" : "수정 권한이 없습니다"}
          >
            <Pencil className="size-3.5" /> 수정
          </Button>
        </div>
      </div>

      {/* 아래는 인쇄 서식 그대로다 — 화면에서 보이는 것이 실제로 찍힐 내용이다.
          주의: 여기에 no-print를 붙이면 안 된다 — 안에 진짜 .print-root가 있어서,
          그러면 인쇄할 때 이 블록 전체가 함께 사라진다(실제로 겪은 실수) */}
      <div className="screen-preview rounded-2xl">
        <JobAssessmentSheet job={job} />
      </div>
    </div>
  );
}
