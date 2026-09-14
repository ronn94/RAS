/**
 * 서명 모아보기 팝업의 공용 부품 — 목록 한 줄과 그 자리에서 펼쳐지는 서명 캔버스.
 *
 * TBM(리더·참석자)과 일일교육(참석자 명단)이 같은 조작법을 써야 해서 한 곳에 둔다 —
 * 현장에서는 둘 다 '이름을 누르고 손으로 서명하는' 같은 동작이다.
 */
import * as React from "react";
import { Eraser, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui";
import { SignatureCanvas, signatureDataUrl } from "@/components/signature";
import { usePhotoUrl } from "@/components/photo";
import { cn } from "@/lib/utils";

export function SignSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function SignEmpty() {
  return <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">해당 없음</p>;
}

export function SignRow({
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
