import * as React from "react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui";
import { InlineSigner } from "@/components/signList";
import { cn } from "@/lib/utils";

type Slot = { target: string; sec: string; label: string; signed: boolean };

/**
 * 완성본 미리보기 + 문서 위 서명(2026-11-14).
 * - 서명 칸([data-sign])을 강조하고, 누르면 서명 창이 열려 그 자리에 서명한다.
 * - PC(1024px 이상)는 오른쪽에 '서명 현황'(구역별, 서명 완료 초록·미서명 빨강)을 둔다.
 * - blocked(target)가 글을 돌려주면 그 칸은 아직 서명할 수 없다(예: 승인자 — 다른 서명이 먼저).
 */
export function SignablePreview({
  children,
  canSign,
  onSign,
  blocked,
  deps,
}: {
  children: React.ReactNode;
  canSign: boolean;
  onSign: (target: string, image: string | null) => Promise<void>;
  blocked?: (target: string) => string | null;
  /** 문서 내용이 바뀌면 서명 현황을 다시 읽는다 */
  deps: unknown;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [open, setOpen] = React.useState<Slot | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () =>
      setSlots(
        [...el.querySelectorAll<HTMLElement>("[data-sign]")].map((x) => ({
          target: x.dataset.sign!,
          sec: x.dataset.signSec || "",
          label: x.dataset.signLabel || "",
          signed: x.dataset.signed === "1",
        })),
      );
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["data-signed"], childList: true });
    return () => mo.disconnect();
  }, [deps]);

  const pick = (s: Slot) => {
    if (!canSign) return alert("서명 권한이 없거나 잠긴 문서입니다.");
    const why = blocked?.(s.target);
    if (why) return alert(why);
    setOpen(s);
  };
  const secs: [string, Slot[]][] = [];
  for (const s of slots) {
    const g = secs.find((x) => x[0] === s.sec);
    if (g) g[1].push(s);
    else secs.push([s.sec, [s]]);
  }
  const done = slots.filter((s) => s.signed).length;

  return (
    <div className="signable-split">
      <div
        ref={ref}
        className={cn("screen-preview rounded-2xl no-print", canSign && "signable")}
        onClick={(e) => {
          const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-sign]");
          if (!cell) return;
          const s = slots.find((x) => x.target === cell.dataset.sign);
          if (s) pick(s);
        }}
      >
        {children}
      </div>
      <aside className="sign-status no-print">
        <div className="flex items-center justify-between">
          <b className="text-sm">서명 현황</b>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", done === slots.length && slots.length ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
            {done} / {slots.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-emerald-500" />서명 완료 <span className="mx-1 inline-block size-2.5 rounded-sm bg-red-500" />미서명
          {canSign ? " · 누르면 서명합니다" : ""}
        </p>
        {!slots.length && <p className="mt-3 text-xs text-muted-foreground">서명 칸이 없습니다.</p>}
        {secs.map(([sec, list]) => (
          <section key={sec} className="mt-3">
            <h4 className="mb-1.5 border-b pb-1 text-xs font-semibold text-muted-foreground">{sec}</h4>
            <ul className="grid gap-1.5">
              {list.map((s) => (
                <li key={s.target}>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm",
                      s.signed ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 font-semibold text-red-800",
                    )}
                  >
                    <span className="truncate">{s.label || "이름 없음"}</span>
                    <span className="shrink-0 text-xs font-bold">{s.signed ? "✓ 서명" : "미서명"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </aside>

      <Dialog open={!!open} onClose={() => setOpen(null)} className="no-callout max-w-lg">
        <DialogHeader>
          <DialogTitle>{open ? `${open.label} 서명` : "서명"}</DialogTitle>
        </DialogHeader>
        {open && (
          <InlineSigner
            onCancel={() => setOpen(null)}
            onSave={async (dataUrl) => {
              await onSign(open.target, dataUrl);
              setOpen(null);
            }}
            onClear={
              open.signed
                ? () => {
                    void onSign(open.target, null);
                    setOpen(null);
                  }
                : undefined
            }
          />
        )}
      </Dialog>
    </div>
  );
}
