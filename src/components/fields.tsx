import * as React from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { allTypes, classNames, typesOf } from "@/lib/settings";

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
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { hazardClass: string }) {
  const { settings } = useStore();
  const value = String(props.value ?? "");
  const types = typesOf(settings, hazardClass);
  // 분류를 바꾸면 코드는 비워지지만, 목록에서 사라진 코드가 남아 있을 수도 있다
  const options = value && !types.some((t) => t.code === value) ? [...types, { code: value, label: "" }] : types;
  const disabled = props.disabled || !hazardClass;

  /* 드롭다운 목록에는 "1.4 부딪힘"을 띄우고, 칸에는 번호만 보여야 한다.
     네이티브 select는 닫혀 있을 때 선택된 option의 글자를 그대로 그리므로
     ① 선택된 글자를 칸 밖으로 밀어내고(text-indent, option은 0으로 되돌린다)
     ② 그 위에 번호만 적은 칸을 덮어씌운다.
     색을 투명하게 하는 방법은 쓰지 않는다 — 네이티브 드롭다운 화살표가 글자색을
     따라가서 같이 사라진다(실제로 겪은 문제).
     select를 직접 만들지 않고 네이티브를 유지해야 iOS·iPad에서 기본 피커가 뜬다. */
  return (
    <div className="relative">
      <CellSelect
        {...props}
        disabled={disabled}
        className={cn("indent-[-999px] [&>option]:indent-0", className)}
      >
        <option value="">-</option>
        {options.map((t) => (
          <option key={t.code} value={t.code}>
            {t.label ? `${t.code} ${t.label}` : t.code}
          </option>
        ))}
      </CellSelect>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-sm tabular-nums",
          disabled && "opacity-50",
        )}
      >
        {value || "-"}
      </span>
    </div>
  );
}

/**
 * 유해위험 유형 — 분류표 전체(1.1~7.3)를 한 드롭다운에 편다.
 * 순회점검 조사표에는 위험분류 열이 없어서 코드만 바로 고른다.
 * 표시 규칙은 HazardCodeSelect와 같다 — 목록은 "1.4 부딪힘", 칸에는 "1.4".
 */
export function HazardTypeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { settings } = useStore();
  const value = String(props.value ?? "");
  const types = allTypes(settings);
  const options = value && !types.some((t) => t.code === value) ? [...types, { code: value, label: "", className: "" }] : types;
  return (
    <div className="relative">
      <CellSelect {...props} className={cn("indent-[-999px] [&>option]:indent-0", className)}>
        <option value="">-</option>
        {options.map((t) => (
          <option key={t.code} value={t.code}>
            {t.label ? `${t.code} ${t.label}` : t.code}
          </option>
        ))}
      </CellSelect>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-sm tabular-nums",
          props.disabled && "opacity-50",
        )}
      >
        {value || "-"}
      </span>
    </div>
  );
}

export function ScoreSelect({
  kind,
  value,
  onChange,
  className,
  ...props
}: {
  kind: "p" | "s";
  value: number | null;
  onChange: (v: number | null) => void;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  const { settings } = useStore();
  const options = kind === "p" ? settings.risk.likelihood : settings.risk.severity;
  const shown = value ?? "";

  /* 드롭다운에는 "1점 · 피해가 발생할 가능성이 없음"을 띄우고 칸에는 숫자만 남긴다.
     위험코드(HazardCodeSelect)와 같은 방법 — 글자를 칸 밖으로 밀어내고 그 위에
     숫자만 덮어씌운다. 색을 투명하게 하면 네이티브 화살표까지 사라진다. */
  return (
    <div className="relative">
      <CellSelect
        value={shown}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        /* className을 props에서 따로 빼야 한다 — {...props}가 뒤에 펼쳐지면서
           호출부의 className이 이 줄을 통째로 덮어써 글자가 안 밀려나고
           덮어쓴 숫자와 겹쳐 보였다(실제로 겪은 문제) */
        className={cn("indent-[-999px] [&>option]:indent-0", className)}
        {...props}
      >
        <option value="">-</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ? `${o.value}점 · ${o.label}` : `${o.value}점`}
          </option>
        ))}
      </CellSelect>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 right-4 flex items-center justify-center text-sm tabular-nums",
          props.disabled && "opacity-50",
        )}
      >
        {shown === "" ? "-" : shown}
      </span>
    </div>
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
