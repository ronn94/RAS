/**
 * 손 서명 패드 — 아이패드·아이폰에서 손가락이나 펜으로 직접 서명한다.
 *
 * 서명은 결국 **사진과 같은 취급**이다: 캔버스를 PNG로 굳혀 R2에 올리고 id만 문서에 남긴다.
 * 그래서 백업·고아 사진 정리에서도 사진과 똑같이 세어 줘야 한다(빠뜨리면 서명이 지워진다).
 *
 * 배경은 투명하게 둔다 — 인쇄 서식의 칸 위에 그대로 얹히므로 흰 배경이 있으면
 * 표의 실선을 덮어 버린다.
 *
 * 좌표는 화면 크기가 아니라 캔버스 픽셀 기준이라, 기기 화소비(DPR)를 곱해 그린다.
 * 이렇게 안 하면 레티나 화면에서 선이 흐릿하게 뭉갠다.
 */
import * as React from "react";
import { Eraser, PenLine, Trash2 } from "lucide-react";
import { Button, Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import { usePhotoUrl } from "@/components/photo";
import { deletePhoto, uploadPhoto } from "@/lib/db";
import { cn } from "@/lib/utils";

/** 저장 크기 — 인쇄물에서 서명 칸이 대략 40×15mm라 300dpi 기준으로 넉넉하게 잡았다 */
const W = 480;
const H = 180;

function SignatureCanvas({ onReady }: { onReady: (canvas: HTMLCanvasElement | null) => void }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111";
    }
    onReady(canvas);
    return () => onReady(null);
  }, [onReady]);

  /** 화면 좌표 → 캔버스 논리 좌표(W×H). 캔버스가 축소돼 보여도 그린 위치가 맞는다 */
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  return (
    <canvas
      ref={ref}
      className="w-full touch-none rounded-xl bg-input/40 ring-1 ring-foreground/10"
      style={{ aspectRatio: `${W} / ${H}` }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        last.current = pos(e);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const ctx = e.currentTarget.getContext("2d");
        const p = pos(e);
        if (ctx && last.current) {
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        last.current = p;
      }}
      onPointerUp={() => {
        drawing.current = false;
        last.current = null;
      }}
      onPointerLeave={() => {
        drawing.current = false;
        last.current = null;
      }}
    />
  );
}

/**
 * 서명 칸 하나. 서명이 있으면 이미지를 보여주고, 없으면 '서명하기' 버튼만 둔다.
 * 인쇄물에는 이 이미지가 그대로 찍히고, 서명이 없으면 빈 칸으로 나가 수기로 받을 수 있다.
 */
export function SignatureField({
  label,
  signId,
  onChange,
  disabled,
}: {
  label: string;
  signId?: string;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
}) {
  const url = usePhotoUrl(signId);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("서명을 이미지로 만들지 못했습니다");
      const id = await uploadPhoto(blob);
      if (signId) await deletePhoto(signId); // 다시 서명하면 옛 이미지는 지운다
      onChange(id);
      setOpen(false);
    } catch (e) {
      alert(`서명을 저장하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => setOpen(true)}
            aria-label={`${label} 서명하기`}
            title={signId ? "다시 서명" : "서명하기"}
          >
            <PenLine />
          </Button>
          {signId && (
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                await deletePhoto(signId);
                onChange(undefined);
              }}
              aria-label={`${label} 서명 삭제`}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-16 w-full items-center justify-center overflow-hidden rounded-xl bg-input/50 ring-1 ring-foreground/5 transition-colors",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-input/70",
        )}
      >
        {url ? (
          <img src={url} alt={`${label} 서명`} className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-xs text-muted-foreground">
            {disabled ? "보기 전용 계정입니다" : "눌러서 서명 (없으면 인쇄 후 수기)"}
          </span>
        )}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{label} 서명</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">아래 칸에 손가락이나 펜으로 서명해 주세요.</p>
        {open && <SignatureCanvas onReady={(c) => (canvasRef.current = c)} />}
        <DialogFooter>
          <Button variant="outline" onClick={clear}>
            <Eraser className="size-3.5" /> 지우기
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
