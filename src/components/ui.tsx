/**
 * 인트라넷 디자인 시스템 프리미티브 (정본 클래스 그대로 이식)
 * 근거: ~/.claude/skills/intranet-style/reference/02-primitives.md
 * - 컨트롤 기본 높이 h-8 / 입력은 채워진 스타일 / 표면 경계는 ring-1 ring-foreground/5
 * - Radix 대신 네이티브 요소를 쓰는 곳(Select, Dialog)은 클래스만 정본을 따른다.
 */
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Button ────────────────────────────────────────────────── */
const BTN_BASE =
  "group/button inline-flex shrink-0 items-center justify-center rounded-2xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const BTN_VARIANT = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline:
    "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
  ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

const BTN_SIZE = {
  default: "h-8 gap-1.5 px-3",
  xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
  sm: "h-7 gap-1 px-3",
  lg: "h-9 gap-1.5 px-4",
  icon: "size-8",
  "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-7",
  "icon-lg": "size-9",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN_VARIANT;
  size?: keyof typeof BTN_SIZE;
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return <button className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)} {...props} />;
}

/* ── Input / Textarea ──────────────────────────────────────── */
const FIELD_BASE =
  "w-full min-w-0 rounded-2xl border border-transparent bg-input/50 text-base transition-[color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, "h-8 px-2.5 py-1", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_BASE, "flex field-sizing-content min-h-16 resize-none px-2.5 py-2", className)}
      {...props}
    />
  );
}

/* ── Select (네이티브 <select> + 정본 트리거 클래스) ────────── */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-8 items-center justify-between gap-1.5 rounded-2xl border border-transparent bg-input/50 px-2.5 text-base whitespace-nowrap transition-[color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/* ── Label ─────────────────────────────────────────────────── */
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm leading-none font-medium select-none", className)} {...props} />;
}

/* ── Badge ─────────────────────────────────────────────────── */
const BADGE_VARIANT = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border-border text-foreground",
  ghost: "hover:bg-muted hover:text-muted-foreground",
} as const;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof BADGE_VARIANT }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all [&>svg]:size-3!",
        BADGE_VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ── Card ──────────────────────────────────────────────────── */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-[min(var(--radius-4xl),24px)] bg-card py-(--card-spacing) text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 [--card-spacing:--spacing(5)]",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid auto-rows-min items-start gap-1.5 px-(--card-spacing)", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-heading text-base font-medium", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-(--card-spacing)", className)} {...props} />;
}

/* ── Table ─────────────────────────────────────────────────── */
export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative w-full overflow-x-auto", className)} {...props} />;
}
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}
export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}
export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  );
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground", className)}
      {...props}
    />
  );
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-2 align-middle whitespace-nowrap", className)} {...props} />;
}

/* ── Checkbox ──────────────────────────────────────────────── */
export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "peer relative size-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-transparent bg-input/90 transition-shadow outline-none",
        "checked:border-primary checked:bg-primary",
        "checked:after:absolute checked:after:inset-0 checked:after:grid checked:after:place-content-center checked:after:text-[11px] checked:after:leading-none checked:after:font-bold checked:after:text-primary-foreground checked:after:content-['✓']",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/* ── Dialog (네이티브 오버레이 + 정본 클래스) ───────────────── */
export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 isolate z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[88vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-[min(var(--radius-4xl),24px)] bg-popover p-6 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none [&>*]:min-w-0 sm:max-w-md",
          className,
        )}
      >
        <Button variant="ghost" size="icon-sm" className="absolute top-4 right-4 bg-secondary" onClick={onClose} aria-label="닫기">
          <X />
        </Button>
        {children}
      </div>
    </div>
  );
}
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-heading text-base leading-none font-medium", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

/* ── Empty state ───────────────────────────────────────────── */
export function EmptyState({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
