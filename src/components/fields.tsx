import * as React from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { classNames, typesOf } from "@/lib/settings";

/** 표 안에서 쓰는 인라인 입력 — 평소엔 선이 없고, 포커스 시에만 채워진 필드가 된다 */
export const cellBase =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-[color,box-shadow,background-color] duration-200 hover:bg-input/40 focus:bg-input/50 focus:border-ring focus:ring-3 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";

export function CellInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(cellBase, "h-8", className)} {...props} />;
}

export function CellTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} className={cn(cellBase, "field-sizing-content min-h-8 resize-none", className)} {...props} />;
}

export function CellSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(cellBase, "h-8 cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

export function HazardClassSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { settings } = useStore();
  const value = String(props.value ?? "");
  const classes = classNames(settings);
  // 목록에서 뺀 값이라도 이미 입력돼 있으면 유지한다
  const options = value && !classes.includes(value) ? [...classes, value] : classes;
  return (
    <CellSelect {...props}>
      <option value="">-</option>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </CellSelect>
  );
}

/**
 * 위험코드 — 고른 위험분류에 속한 유해위험유형만 보여준다.
 * 드롭다운에는 "1.4 부딪힘"처럼 번호+이름을 띄우고, 저장되는 값은 번호("1.4")뿐이다.
 */
export function HazardCodeSelect({
  hazardClass,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { hazardClass: string }) {
  const { settings } = useStore();
  const value = String(props.value ?? "");
  const types = typesOf(settings, hazardClass);
  // 분류를 바꾸면 코드는 비워지지만, 목록에서 사라진 코드가 남아 있을 수도 있다
  const options = value && !types.some((t) => t.code === value) ? [...types, { code: value, label: "" }] : types;
  return (
    <CellSelect {...props} disabled={props.disabled || !hazardClass}>
      <option value="">-</option>
      {options.map((t) => (
        <option key={t.code} value={t.code}>
          {t.label ? `${t.code} ${t.label}` : t.code}
        </option>
      ))}
    </CellSelect>
  );
}

export function ScoreSelect({
  kind,
  value,
  onChange,
  ...props
}: {
  kind: "p" | "s";
  value: number | null;
  onChange: (v: number | null) => void;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  const { settings } = useStore();
  const options = kind === "p" ? settings.risk.likelihood : settings.risk.severity;
  return (
    <CellSelect
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="text-center"
      {...props}
    >
      <option value="">-</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} title={o.label}>
          {o.value}
        </option>
      ))}
    </CellSelect>
  );
}

export function StatusSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { settings } = useStore();
  const value = String(props.value ?? "");
  const options = value && !settings.statuses.includes(value) ? [...settings.statuses, value] : settings.statuses;
  return (
    <CellSelect {...props}>
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </CellSelect>
  );
}

/** 공정명 — 설정에서 관리하는 목록에서 고른다. 목록에 없는 기존 값은 그대로 유지된다. */
export function ProcessSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const { settings } = useStore();
  const options = value && !settings.processes.includes(value) ? [...settings.processes, value] : settings.processes;

  return (
    <select
      disabled={disabled}
      className={cn(
        "flex h-8 w-full items-center rounded-2xl border border-transparent bg-input/50 px-2.5 text-base transition-[color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">공정명 선택</option>
      {options.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

/** 담당자 — 설정에 등록된 후보를 datalist로 제안하되 자유 입력도 허용 */
export function OwnerInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { settings } = useStore();
  const listId = React.useId();
  return (
    <>
      <CellInput list={settings.owners.length ? listId : undefined} {...props} />
      {settings.owners.length > 0 && (
        <datalist id={listId}>
          {settings.owners.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </>
  );
}
