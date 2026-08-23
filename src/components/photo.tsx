import * as React from "react";
import { Camera, ImageOff, Trash2 } from "lucide-react";
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
 * - 모바일: 카메라 바로 촬영
 * - 데스크톱: 슬롯을 클릭해 선택한 뒤 Ctrl/Cmd+V 로 붙여넣기, 드래그&드롭도 지원
 */
export function PhotoSlot({
  label,
  photoId,
  onChange,
}: {
  label: string;
  photoId?: string;
  onChange: (id: string | undefined) => void;
}) {
  const url = usePhotoUrl(photoId);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const upload = React.useCallback(
    async (file: File) => {
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
    [onChange, photoId],
  );

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
          <Button variant="ghost" size="icon-xs" onClick={() => inputRef.current?.click()} aria-label={`${label} 파일 선택`}>
            <Camera />
          </Button>
          {photoId && (
            <Button
              variant="ghost"
              size="icon-xs"
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
      <input
        ref={inputRef}
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
        tabIndex={0}
        aria-label={`${label} — 클릭 후 붙여넣기 또는 더블클릭으로 파일 선택`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onDoubleClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={(e) => {
          if (fromClipboard(e.clipboardData?.items ?? null)) e.preventDefault();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f?.type.startsWith("image/")) void upload(f);
          else fromClipboard(e.dataTransfer.items);
        }}
        className={cn(
          "flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-input/50 ring-1 ring-foreground/5 transition-colors outline-none hover:bg-input/70",
          (focused || dragOver) && "ring-3 ring-ring/30",
        )}
      >
        {url ? (
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-2 text-center text-xs text-muted-foreground">
            <Camera className="size-5" />
            {busy ? "저장 중…" : focused ? "Ctrl/⌘+V 로 붙여넣기" : "클릭 후 붙여넣기 · 두 번 클릭 시 파일 선택"}
          </span>
        )}
      </div>
    </div>
  );
}
