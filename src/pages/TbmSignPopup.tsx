/**
 * TBM — 서명 모아보기 팝업.
 *
 * 작업평가의 서명 팝업(`JobAssessmentSignPopup`)과 같은 방식이다. 서명이 필요한 자리를
 * **TBM 리더 → 내부 참석자 → 외부업체 참석자** 순서로 모아 보여주고, 이름을 누르면
 * 그 자리에서 서명 캔버스가 펼쳐진다. 작업평가의 승인자처럼 순서를 강제하는 자리는
 * 없다 — TBM은 현장에서 누구든 먼저 서명할 수 있어야 한다.
 */
import * as React from "react";
import { Button, Dialog, DialogHeader, DialogTitle } from "@/components/ui";
import { SignEmpty, SignRow, SignSection } from "@/components/signList";
import type { Tbm, TbmParticipant } from "@/lib/routine";

export function TbmSignPopup({
  tbm,
  open,
  onClose,
  onSign,
}: {
  tbm: Tbm;
  open: boolean;
  onClose: () => void;
  onSign: (target: string, image: string | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  const internal = tbm.participants.filter((p) => !p.external);
  const external = tbm.participants.filter((p) => p.external);
  const toggle = (key: string) => setExpanded((k) => (k === key ? null : key));

  const participantRow = (p: TbmParticipant) => (
    <SignRow
      key={p.id}
      name={p.name}
      emptyHint="이름이 비어 있습니다"
      sign={p.sign}
      expanded={expanded === p.id}
      onToggle={() => toggle(p.id)}
      onSave={async (dataUrl) => {
        await onSign(p.id, dataUrl);
        setExpanded(null);
      }}
      onClear={() => void onSign(p.id, null)}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} className="no-callout max-w-lg sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>서명하기</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">이름을 누르면 그 자리에서 손서명을 받습니다.</p>

      <div className="max-h-[65vh] space-y-4 overflow-auto pr-0.5">
        <SignSection title="TBM 리더">
          <SignRow
            name={tbm.leaderName}
            emptyHint="작성화면에서 TBM 리더부터 골라 주세요"
            sign={tbm.leaderSign}
            expanded={expanded === "leader"}
            onToggle={() => toggle("leader")}
            onSave={async (dataUrl) => {
              await onSign("leader", dataUrl);
              setExpanded(null);
            }}
            onClear={() => void onSign("leader", null)}
          />
        </SignSection>

        <SignSection title="참석자 (우리 직원)">
          {internal.length === 0 ? <SignEmpty /> : internal.map(participantRow)}
        </SignSection>

        <SignSection title="외부업체 참석자">{external.length === 0 ? <SignEmpty /> : external.map(participantRow)}</SignSection>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      </div>
    </Dialog>
  );
}
