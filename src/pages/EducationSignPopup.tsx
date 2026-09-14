/**
 * 일일교육 — 서명 모아보기 팝업.
 *
 * 서식에서 서명칸이 있는 곳은 참석자 명단 한 곳뿐이라(TBM의 리더 같은 별도 자리가 없다)
 * 구간을 나누지 않고 명단을 그대로 펼친다. 조작법은 TBM과 같다 — 이름을 누르면 그
 * 자리에서 캔버스가 열린다.
 */
import * as React from "react";
import { Button, Dialog, DialogHeader, DialogTitle } from "@/components/ui";
import { SignEmpty, SignRow } from "@/components/signList";
import { signedEducationAttendees, type Education } from "@/lib/routine";

export function EducationSignPopup({
  education,
  open,
  onClose,
  onSign,
}: {
  education: Education;
  open: boolean;
  onClose: () => void;
  onSign: (target: string, image: string | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  const signed = signedEducationAttendees(education);

  return (
    <Dialog open={open} onClose={onClose} className="no-callout max-w-lg sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>서명하기</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        이름을 누르면 그 자리에서 손서명을 받습니다. ({signed}/{education.attendees.length}명)
      </p>

      <div className="max-h-[65vh] space-y-1.5 overflow-auto pr-0.5">
        {education.attendees.length === 0 ? (
          <SignEmpty />
        ) : (
          education.attendees.map((a) => (
            <SignRow
              key={a.id}
              name={a.name}
              emptyHint="이름이 비어 있습니다"
              sign={a.sign}
              expanded={expanded === a.id}
              onToggle={() => setExpanded((k) => (k === a.id ? null : a.id))}
              onSave={async (dataUrl) => {
                await onSign(a.id, dataUrl);
                setExpanded(null);
              }}
              onClear={() => void onSign(a.id, null)}
            />
          ))
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      </div>
    </Dialog>
  );
}
