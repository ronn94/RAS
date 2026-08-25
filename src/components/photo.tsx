import * as React from "react";
import { Camera, ImageOff, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { photoUrl, uploadPhoto, deletePhoto } from "@/lib/db";
import { processPhoto } from "@/lib/photo";
import { cn } from "@/lib/utils";

/** 사진 id → 서버 URL. 같은 출처 요청이라 Cloudflare Access 로그인 쿠키가 그대로 실린다. */
export function usePhotoUrl(id?: string): string | null {
  return id ? photoUrl(id) : null;
}

export function PhotoThumb({ id, className }: { id?: string; className?: string }) {
  const url = usePhotoUrl(id);
  if (!url) return <div className={cn("grid size-10 place-content-center rounded-md bg-muted text-muted-foreground", className)}><ImageOff className="size-3.5" /></div>;
  return <img src={url} alt="" className={cn("size-10 rounded-md object-cover ring-1 ring-foreground/5", className)} />;
}

/**
 * 개선 전/후 사진 1장 슬롯.
 * - 사진첩·파일에서 고르기와 바로 촬영을 **각각 다른 버튼**으로 둔다.
 *   file input 하나에 capture를 걸면 iOS가 선택 메뉴를 건너뛰고 카메라만 열어
 *   사진첩·파일 경로가 통째로 막힌다(실제로 겪은 문제) — 그래서 input을 둘로 나눴다.
 * - 터치 기기: 슬롯을 한 번 탭하면 사진첩이 열린다(더블탭은 확대 제스처와 부딪힌다)
 * - 데스크톱: 슬롯을 클릭해 선택한 뒤 Ctrl/Cmd+V 로 붙여넣기, 드래그&드롭·더블클릭도 지원
 */
export function PhotoSlot({
  label,
  photoId,
  onChange,
  disabled,
}: {
  label: string;
  photoId?: string;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
}) {
  const url = usePhotoUrl(photoId);
  /** 사진첩·파일용(capture 없음)과 촬영용(capture)을 따로 둔다 */
  const pickRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const upload = React.useCallback(
    async (file: File) => {
      if (disabled) return;
      setBusy(true);
      try {
        const blob = await processPhoto(file);
        const id = await uploadPhoto(blob);
        if (photoId) await deletePhoto(photoId);
        onChange(id);
      } catch (e) {
        alert(`사진을 저장하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [onChange, photoId, disabled],
  );

  /** 마우스가 없는 기기(휴대폰·태블릿)에서는 한 번 탭으로 바로 사진첩을 연다 */
  const touchOnly = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  const fromClipboard = (items: DataTransferItemList | null) => {
    if (!items) return false;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          void upload(file);
          return true;
        }
      }
    }
    return false;
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
            onClick={() => pickRef.current?.click()}
            aria-label={`${label} 사진첩·파일에서 선택`}
            title="사진첩·파일에서 선택"
          >
            <ImagePlus />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
            aria-label={`${label} 촬영`}
            title="카메라로 촬영"
          >
            <Camera />
          </Button>
          {photoId && (
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                await deletePhoto(photoId);
                onChange(undefined);
              }}
              aria-label={`${label} 삭제`}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
      {/* capture 없음 — iOS에서 사진첩·파일 선택 메뉴가 뜬다 */}
      <input
        ref={pickRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      {/* capture 있음 — 누르면 곧바로 카메라가 열린다 */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={`${label} — 눌러서 사진첩에서 선택하거나 클릭 후 붙여넣기`}
        onFocus={() => !disabled && setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => {
          if (!disabled && touchOnly) pickRef.current?.click();
        }}
        onDoubleClick={() => !disabled && !touchOnly && pickRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            pickRef.current?.click();
          }
        }}
        onPaste={(e) => {
          if (!disabled && fromClipboard(e.clipboardData?.items ?? null)) e.preventDefault();
        }}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f?.type.startsWith("image/")) void upload(f);
          else fromClipboard(e.dataTransfer.items);
        }}
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-input/50 ring-1 ring-foreground/5 transition-colors outline-none",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-input/70",
          (focused || dragOver) && "ring-3 ring-ring/30",
        )}
      >
        {url ? (
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-2 text-center text-xs text-muted-foreground">
            <Camera className="size-5" />
            {disabled
              ? "보기 전용 계정입니다"
              : busy
                ? "저장 중…"
                : touchOnly
                  ? "눌러서 사진첩에서 선택"
                  : focused
                    ? "Ctrl/⌘+V 로 붙여넣기"
                    : "클릭 후 붙여넣기 · 두 번 클릭 시 파일 선택"}
          </span>
        )}
      </div>
    </div>
  );
}
