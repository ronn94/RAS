/**
 * 작업 위험성평가 — 서명 모아보기 팝업.
 *
 * 미리보기 화면의 '서명하기' 버튼을 누르면 뜬다. 문서 안에서 서명이 필요한 자리를
 * '평가자 → 내부 참여자 → 외부 참여자 → 승인자' 순서로 한 화면에 모아 보여주고,
 * 이름을 누르면 그 자리에서 서명 캔버스가 펼쳐진다(참여자 단계의 개별 서명 다이얼로그와
 * 달리 팝업 하나 안에서 목록과 서명을 오간다).
 *
 * 승인자는 설정(작업평가 서명 규칙)에 따라 평가자·내부·외부 서명이 어느 정도
 * 갖춰져야 열린다 — approverSignEnabled가 그 규칙을 판단한다.
 */
import * as React from "react";
import { Eraser, PenLine, X } from "lucide-react";
import { Button, Dialog, DialogHeader, DialogTitle } from "@/components/ui";
import { SignatureCanvas, signatureDataUrl } from "@/components/signature";
import { usePhotoUrl } from "@/components/photo";
import { approverSignEnabled, type JobAssessment, type JobParticipant } from "@/lib/jobAssessment";
import { cn } from "@/lib/utils";

export function JobAssessmentSignPopup({
  job,
  open,
  onClose,
  approverRequireAll,
  onSign,
}: {
  job: JobAssessment;
  open: boolean;
  onClose: () => void;
  approverRequireAll: boolean;
  onSign: (target: string, image: string | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  const internal = job.participants.filter((p) => !p.external);
  const external = job.participants.filter((p) => p.external);
  const approverOk = approverSignEnabled(job, approverRequireAll);

  return (
    <Dialog open={open} onClose={onClose} className="no-callout max-w-lg sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>서명하기</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">이름을 누르면 그 자리에서 손서명을 받습니다.</p>

      <div className="max-h-[65vh] space-y-4 overflow-auto pr-0.5">
        <Section title="평가자">
          <SignRow
            name={job.evaluator}
            emptyHint="2단계에서 평가자 이름부터 채워 주세요"
            sign={job.evaluatorSign}
            expanded={expanded === "evaluator"}
            onToggle={() => setExpanded((k) => (k === "evaluator" ? null : "evaluator"))}
            onSave={async (dataUrl) => {
              await onSign("evaluator", dataUrl);
              setExpanded(null);
            }}
            onClear={() => void onSign("evaluator", null)}
          />
        </Section>

        <Section title="내부 참여자">
          {internal.length === 0 ? (
            <Empty />
          ) : (
            internal.map((p) => (
              <ParticipantRow
                key={p.id}
                p={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded((k) => (k === p.id ? null : p.id))}
                onSave={async (dataUrl) => {
                  await onSign(p.id, dataUrl);
                  setExpanded(null);
                }}
                onClear={() => void onSign(p.id, null)}
              />
            ))
          )}
        </Section>

        <Section title="외부 참여자">
          {external.length === 0 ? (
            <Empty />
          ) : (
            external.map((p) => (
              <ParticipantRow
                key={p.id}
                p={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded((k) => (k === p.id ? null : p.id))}
                onSave={async (dataUrl) => {
                  await onSign(p.id, dataUrl);
                  setExpanded(null);
                }}
                onClear={() => void onSign(p.id, null)}
              />
            ))
          )}
        </Section>

        <Section title="승인자">
          <SignRow
            name={job.approvedBy}
            emptyHint="2단계에서 승인자 이름부터 채워 주세요"
            disabled={!approverOk}
            disabledHint="평가자·내부·외부 참여자 서명이 아직 다 갖춰지지 않았습니다"
            sign={job.approvedBySign}
            expanded={expanded === "approver"}
            onToggle={() => setExpanded((k) => (k === "approver" ? null : "approver"))}
            onSave={async (dataUrl) => {
              await onSign("approver", dataUrl);
              setExpanded(null);
            }}
            onClear={() => void onSign("approver", null)}
          />
        </Section>
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

function ParticipantRow({
  p,
  expanded,
  onToggle,
  onSave,
  onClear,
}: {
  p: JobParticipant;
  expanded: boolean;
  onToggle: () => void;
  onSave: (dataUrl: string) => Promise<void>;
  onClear: () => void;
}) {
  return (
    <SignRow
      name={p.undecided ? "" : p.name}
      emptyHint={p.undecided ? "아직 '미정'이라 이름이 없어 서명할 수 없습니다" : "이름이 비어 있습니다"}
      disabled={p.undecided}
      sign={p.sign}
      expanded={expanded}
      onToggle={onToggle}
      onSave={onSave}
      onClear={onClear}
    />
  );
}

function SignRow({
  name,
  emptyHint,
  disabled,
  disabledHint,
  sign,
  expanded,
  onToggle,
  onSave,
  onClear,
}: {
  name: string;
  emptyHint: string;
  disabled?: boolean;
  disabledHint?: string;
  sign?: string;
  expanded: boolean;
  onToggle: () => void;
  onSave: (dataUrl: string) => Promise<void>;
  onClear: () => void;
}) {
  const url = usePhotoUrl(sign);
  const noName = !name?.trim();
  const blocked = disabled || noName;
  const hint = noName ? emptyHint : disabledHint;

  return (
    <div className="rounded-xl bg-muted/40">
      <button
        type="button"
        disabled={blocked}
        onClick={onToggle}
        title={blocked ? hint : undefined}
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
