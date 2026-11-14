/**
 * 작업 위험성평가 — 목록에서 행을 클릭하면 여는 **완성본 미리보기**.
 *
 * 인쇄 서식(JobAssessmentSheet)을 화면 밖에 숨기지 않고 그대로 띄운다 — 실제로
 * 인쇄하면 어떻게 나오는지 화면에서 바로 확인할 수 있게 하려는 것이다. 다른 문서처럼
 * 곧장 작성화면(5단계 마법사)을 여는 대신, 완성본을 먼저 보여주고 고칠 게 있으면
 * '수정' 버튼으로 넘어간다 — 실수로 값을 건드릴 걱정 없이 훑어볼 수 있다.
 */
import * as React from "react";
import { ArrowLeft, Pencil, Printer, Signature, Plus, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { JobAssessmentContinuousSheet, JobAssessmentSheet } from "@/print/JobAssessmentSheet";
import { JobAssessmentSignPopup } from "@/pages/JobAssessmentSignPopup";
import { SignablePreview } from "@/components/signablePreview";
import { approverSignEnabled, emptyJobParticipant } from "@/lib/jobAssessment";
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
  const { settings, signJobAssessment, saveJobAssessment, identity } = useStore();
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
      {/* '미정' 칸 관리 — 이 화면에서 바로 늘리거나 지운다(이름은 서명할 때 받는다) */}
      {canSign && (
        <div className="no-print flex flex-wrap items-center gap-1.5 rounded-2xl border bg-card px-3 py-2 text-sm">
          <span className="mr-1 text-muted-foreground">미정 칸</span>
          {job.participants.filter((p) => p.undecided).map((p, i) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs">
              {p.external ? "외부" : "내부"} 미정 {i + 1}
              <button
                type="button"
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="미정 칸 삭제"
                title="이 미정 칸 삭제"
                onClick={() => {
                  if (!confirm("이 미정 칸을 삭제할까요?")) return;
                  void saveJobAssessment({ ...job, participants: job.participants.filter((x) => x.id !== p.id) }).catch((e) => alert(`삭제하지 못했습니다: ${e instanceof Error ? e.message : e}`));
                }}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {(["내부", "외부"] as const).map((t) => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              onClick={() =>
                void saveJobAssessment({ ...job, participants: [...job.participants, { ...emptyJobParticipant(t === "외부"), undecided: true }] }).catch((e) => alert(`추가하지 못했습니다: ${e instanceof Error ? e.message : e}`))
              }
            >
              <Plus className="size-3.5" /> {t} 미정
            </Button>
          ))}
        </div>
      )}

      {/* 문서 위 서명 — 서명 칸을 눌러 바로 서명, PC는 오른쪽에 서명 현황. 승인자는 다른 서명이 갖춰진 뒤에 */}
      <SignablePreview
        canSign={canSign}
        deps={job}
        sections={["평가자 · 승인자", "내부 참여자", "외부 참여자", "담당자"]}
        onSign={async (target, image, name) => {
          // '미정' 자리 — 이름을 먼저 채워 저장한 뒤 서명한다
          if (name) await saveJobAssessment({ ...job, participants: job.participants.map((p) => (p.id === target ? { ...p, name, undecided: false } : p)) });
          await signJobAssessment(job.id, target, image);
        }}
        blocked={(t) => (t === "approver" && !approverSignEnabled(job, settings.jobAssessment.approverRequireAll) ? "평가자·내부·외부 참여자 서명이 아직 다 갖춰지지 않았습니다." : null)}
      >
        <JobAssessmentContinuousSheet job={job} />
      </SignablePreview>

      {/* 실제 인쇄물은 이쪽이다 — 기본적으로 화면에는 숨겨져 있고(.print-root 규칙)
          인쇄할 때만 A4 여러 장으로 나뉘어 찍힌다. */}
      <JobAssessmentSheet job={job} />
    </div>
  );
}
