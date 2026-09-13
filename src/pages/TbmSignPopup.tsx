/**
 * TBM — 서명 모아보기 팝업.
 *
 * 작업평가의 서명 팝업(`JobAssessmentSignPopup`)과 같은 방식이다. 서명이 필요한 자리를
 * **TBM 리더 → 내부 참석자 → 외부업체 참석자** 순서로 모아 보여주고, 이름을 누르면
 * 그 자리에서 서명 캔버스가 펼쳐진다. 작업평가의 승인자처럼 순서를 강제하는 자리는
 * 없다 — TBM은 현장에서 누구든 먼저 서명할 수 있어야 한다.
 */
import * as React from "react";
import { Eraser, PenLine, X } from "lucide-react";
import { Button, Dialog, DialogHeader, DialogTitle } from "@/components/ui";
import { SignatureCanvas, signatureDataUrl } from "@/components/signature";
import { usePhotoUrl } from "@/components/photo";
import type { Tbm, TbmParticipant } from "@/lib/routine";
import { cn } from "@/lib/utils";

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
        <Section title="TBM 리더">
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
        </Section>

        <Section title="참석자 (우리 직원)">
          {internal.length === 0 ? <Empty /> : internal.map(participantRow)}
        </Section>

        <Section title="외부업체 참석자">{external.length === 0 ? <Empty /> : external.map(participantRow)}</Section>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      </div>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">해당 없음</p>;
}

function SignRow({
  name,
  emptyHint,
  sign,
  expanded,
  onToggle,
  onSave,
  onClear,
}: {
  name: string;
  emptyHint: string;
  sign?: string;
  expanded: boolean;
  onToggle: () => void;
  onSave: (dataUrl: string) => Promise<void>;
  onClear: () => void;
}) {
  const url = usePhotoUrl(sign);
  const blocked = !name?.trim();

  return (
    <div className="rounded-xl bg-muted/40">
      <button
        type="button"
        disabled={blocked}
        onClick={onToggle}
        title={blocked ? emptyHint : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
          blocked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted",
        )}
      >
        <span className="flex-1 truncate font-medium">{name?.trim() || "이름 없음"}</span>
        {url ? (
          <img src={url} alt="" className="h-7 w-14 rounded bg-white object-contain ring-1 ring-foreground/10" />
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <PenLine className="size-3.5" /> {blocked ? "서명 불가" : "서명"}
          </span>
        )}
      </button>

      {expanded && (
        <InlineSigner
          onCancel={onToggle}
          onSave={onSave}
          onClear={
            sign
              ? () => {
                  onClear();
                  onToggle();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

/** 목록 줄 아래에 펼쳐지는 서명 캔버스 — 저장하면 접힌다 */
function InlineSigner({
  onSave,
  onCancel,
  onClear,
}: {
  onSave: (dataUrl: string) => Promise<void>;
  onCancel: () => void;
  onClear?: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = React.useState(false);

  const eraseCanvas = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      await onSave(signatureDataUrl(canvas));
    } catch (e) {
      alert(`서명을 저장하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
      <SignatureCanvas onReady={(c) => (canvasRef.current = c)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={eraseCanvas}>
          <Eraser className="size-3.5" /> 지우기
        </Button>
        <div className="flex items-center gap-1.5">
          {onClear && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onClear}>
              <X className="size-3.5" /> 서명 삭제
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
