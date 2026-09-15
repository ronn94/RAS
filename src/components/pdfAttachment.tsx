/**
 * PDF 첨부 한 장 — 사진과 같은 R2 저장소를 그대로 쓴다(uploadPhoto는 blob 종류를
 * 가리지 않는다). 연간계획 행의 증빙 PDF에서 처음 만들었고, 정기·사후심사 등
 * '문서 한 줄에 PDF 하나를 걸어 두는' 다른 화면에서도 그대로 재사용한다.
 *
 * 편집 권한이 없을 때는 이미 붙은 파일을 열어 보는 것만 되고, 있을 때만 새로
 * 올리거나 뗄 수 있다.
 */
import * as React from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { deletePhoto, photoUrl, uploadPhoto } from "@/lib/db";

export type PdfAttachment = { id: string; name: string; size: number };

export function PdfAttachmentCell({
  attachment,
  editable,
  onChange,
}: {
  attachment?: PdfAttachment;
  editable: boolean;
  onChange: (next: PdfAttachment | undefined) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const pick = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("PDF 파일만 첨부할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      const id = await uploadPhoto(file);
      if (attachment) await deletePhoto(attachment.id).catch(() => undefined);
      onChange({ id, name: file.name, size: file.size });
    } catch (e) {
      alert(e instanceof Error ? e.message : "첨부에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!attachment) return;
    setBusy(true);
    try {
      await deletePhoto(attachment.id);
      onChange(undefined);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!editable && !attachment) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <div className="flex items-center justify-center gap-0.5">
      {attachment && (
        <a
          href={photoUrl(attachment.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex size-7 items-center justify-center rounded-md text-series-1 hover:bg-muted"
          title={attachment.name}
        >
          <FileText className="size-3.5" />
        </a>
      )}
      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pick(f);
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label={attachment ? "PDF 다시 첨부" : "PDF 첨부"}
            title={attachment ? "PDF 다시 첨부" : "PDF 첨부"}
          >
            <Paperclip className="size-3.5" />
          </Button>
          {attachment && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              className="text-destructive hover:text-destructive"
              onClick={() => void remove()}
              aria-label="첨부 삭제"
              title="첨부 삭제"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
