/**
 * 일일교육 — 목록에서 행을 클릭하면 여는 **완성본 미리보기**.
 *
 * TBM·작업평가와 같은 구성이다: 화면에는 쪽을 나누지 않은 연속 서식을 띄우고(훑어보기
 * 좋다), 실제 인쇄물은 숨은 `.print-root`가 맡는다. 고칠 게 있으면 '수정'으로 넘어간다.
 */
import * as React from "react";
import { ArrowLeft, Pencil, Printer, Signature } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { EducationContinuousSheet, EducationSheet } from "@/print/EducationSheet";
import { EducationSignPopup } from "@/pages/EducationSignPopup";
import { educationFullySigned, signedEducationAttendees, type Education } from "@/lib/routine";
import { useStore } from "@/store";

export function EducationPreview({
  education,
  canWrite,
  canSign: canSignPermission,
  onBack,
  onEdit,
}: {
  education: Education;
  /** '수정' 버튼 — canEducationWrite(기본 관리자 전용)를 받는다 */
  canWrite: boolean;
  /** '서명하기' 버튼 — canRoutine(기본 켜짐)을 받는다. 등록·수정과 무관하게
   * 참석자가 직접 서명하는 것은 그대로 열려 있다 */
  canSign: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { signRoutine, identity } = useStore();
  const [signOpen, setSignOpen] = React.useState(false);
  const canSign = canSignPermission && (!education.locked || identity.role === "admin");
  const signed = signedEducationAttendees(education);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">교육일지 미리보기</div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {education.date || "일자 미입력"} {education.startTime}~{education.endTime}
              <Badge variant="outline" className="font-normal">
                서명 {signed}/{education.attendees.length}
              </Badge>
              {educationFullySigned(education) && (
                <Badge className="bg-series-1/10 font-normal text-series-1">서명 완료</Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setSignOpen(true)}
            disabled={!canSign}
            title={canSign ? "참석자 서명을 받습니다" : "서명 권한이 없거나 잠긴 문서입니다"}
          >
            <Signature className="size-3.5" /> 서명하기
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => window.print()} aria-label="인쇄" title="인쇄">
            <Printer />
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={!canWrite}
            title={canWrite ? "작성화면에서 고칩니다" : "수정 권한이 없습니다"}
          >
            <Pencil className="size-3.5" /> 수정
          </Button>
        </div>
      </div>

      <EducationSignPopup
        education={education}
        open={signOpen}
        onClose={() => setSignOpen(false)}
        onSign={(target, image) => signRoutine(education.id, target, image).then(() => undefined)}
      />

      {/* 화면 미리보기는 쪽을 나누지 않고 이어서 보여준다 */}
      <div className="screen-preview rounded-2xl no-print">
        <EducationContinuousSheet education={education} />
      </div>

      {/* 실제 인쇄물 — 평소에는 화면 밖에 숨어 있다가 인쇄할 때만 나타난다 */}
      <EducationSheet education={education} />
    </div>
  );
}
