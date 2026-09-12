/**
 * 작업 위험성평가 — 목록에서 행을 클릭하면 여는 **완성본 미리보기**.
 *
 * 인쇄 서식(JobAssessmentSheet)을 화면 밖에 숨기지 않고 그대로 띄운다 — 실제로
 * 인쇄하면 어떻게 나오는지 화면에서 바로 확인할 수 있게 하려는 것이다. 다른 문서처럼
 * 곧장 작성화면(5단계 마법사)을 여는 대신, 완성본을 먼저 보여주고 고칠 게 있으면
 * '수정' 버튼으로 넘어간다 — 실수로 값을 건드릴 걱정 없이 훑어볼 수 있다.
 */
import * as React from "react";
import { ArrowLeft, Pencil, Printer, Signature } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { JobAssessmentContinuousSheet, JobAssessmentSheet } from "@/print/JobAssessmentSheet";
import { JobAssessmentSignPopup } from "@/pages/JobAssessmentSignPopup";
import { jraGrade, jraLabel, jraScore, signedParticipants, type JobAssessment } from "@/lib/jobAssessment";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

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
  const { settings, signJobAssessment, identity } = useStore();
  const grade = jraGrade(jraScore(job));
  const signed = signedParticipants(job);
  const [signOpen, setSignOpen] = React.useState(false);
  const canSign = canEdit && (!job.locked || identity.role === "admin");

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
          <Button
            onClick={() => setSignOpen(true)}
            disabled={!canSign}
            title={canSign ? "평가자·참여자·승인자 서명을 받습니다" : "서명 권한이 없거나 잠긴 문서입니다"}
          >
            <Signature className="size-3.5" /> 서명하기
          </Button>
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

      <JobAssessmentSignPopup
        job={job}
        open={signOpen}
        onClose={() => setSignOpen(false)}
        approverRequireAll={settings.jobAssessment.approverRequireAll}
        onSign={(target, image) => signJobAssessment(job.id, target, image).then(() => undefined)}
      />

      {/* 화면 미리보기는 페이지를 나누지 않고 한 장처럼 이어서 보여준다 — 실제 인쇄(A4
          여러 장)와는 모양이 다를 수 있다. 이 블록은 진짜 .print-root가 아니라서
          no-print를 붙여도 인쇄 내용에는 영향이 없다(오히려 화면 전용 프리뷰가 그대로
          찍히는 걸 막아 준다) */}
      <div className="screen-preview rounded-2xl no-print">
        <JobAssessmentContinuousSheet job={job} />
      </div>

      {/* 실제 인쇄물은 이쪽이다 — 기본적으로 화면에는 숨겨져 있고(.print-root 규칙)
          인쇄할 때만 A4 여러 장으로 나뉘어 찍힌다. */}
      <JobAssessmentSheet job={job} />
    </div>
  );
}
