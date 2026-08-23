/**
 * 대시보드 차트 — 라이브러리 없이 HTML/SVG로 그린다.
 * 규칙: 단일 계열은 한 가지 색, 두 계열은 검증된 계열색 2종 + 범례·직접 라벨,
 * 축은 하나만, 숫자·라벨은 텍스트 색을 쓰고 색만으로 구분하지 않는다.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/** 가로 막대 (단일 계열) */
export function BarList({
  data,
  max,
  emptyLabel = "표시할 자료가 없습니다",
  onSelect,
}: {
  data: { key: string; label: string; value: number; note?: string }[];
  max?: number;
  emptyLabel?: string;
  onSelect?: (key: string) => void;
}) {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div
          key={d.key}
          className={cn("group grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2", onSelect && "cursor-pointer")}
          onClick={() => onSelect?.(d.key)}
          title={`${d.label} · ${d.value}건${d.note ? ` (${d.note})` : ""}`}
        >
          <span className="truncate text-xs text-muted-foreground">{d.label}</span>
          <div className="h-3 rounded-full bg-muted">
            <div
              className="h-3 rounded-full bg-series-1 transition-[width] group-hover:opacity-80"
              style={{ width: `${Math.max(2, (d.value / peak) * 100)}%` }}
            />
          </div>
          <span className="text-right text-xs font-medium tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/** 5×4 위험성 히트맵 — 한 가지 색의 농도로 건수를 표현 */
export function RiskHeatmap({
  counts,
  likelihoodMax = 5,
  severityMax = 4,
  selected,
  onSelect,
}: {
  counts: Map<string, number>;
  likelihoodMax?: number;
  severityMax?: number;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  const peak = Math.max(1, ...counts.values());
  const severities = Array.from({ length: severityMax }, (_, i) => severityMax - i);
  const likelihoods = Array.from({ length: likelihoodMax }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-md gap-1"
        style={{ gridTemplateColumns: `2.5rem repeat(${likelihoodMax}, minmax(2.5rem, 1fr))` }}
      >
        {severities.map((s) => (
          <React.Fragment key={s}>
            <div className="flex items-center justify-end pr-1 text-xs text-muted-foreground tabular-nums">{s}</div>
            {likelihoods.map((p) => {
              const key = `${p}-${s}`;
              const n = counts.get(key) ?? 0;
              const ratio = n / peak;
              const isSel = selected === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={n === 0}
                  onClick={() => onSelect?.(isSel ? null : key)}
                  title={`가능성 ${p} × 중대성 ${s} = 위험성 ${p * s} · ${n}건`}
                  className={cn(
                    "grid h-11 place-content-center rounded-lg text-sm font-medium tabular-nums transition-all",
                    n === 0 ? "bg-muted/60 text-muted-foreground" : "text-foreground hover:opacity-80",
                    isSel && "ring-3 ring-ring/30",
                  )}
                  style={
                    n === 0
                      ? undefined
                      : {
                          backgroundColor: `color-mix(in oklch, var(--series-1) ${Math.round(
                            12 + ratio * 58,
                          )}%, var(--background))`,
                        }
                  }
                >
                  {n || ""}
                </button>
              );
            })}
          </React.Fragment>
        ))}
        <div />
        {likelihoods.map((p) => (
          <div key={p} className="pt-1 text-center text-xs text-muted-foreground tabular-nums">
            {p}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>세로: 중대성(강도)</span>
        <span>가로: 가능성(빈도)</span>
      </div>
    </div>
  );
}

/** 개선 전후 비교 — 2계열 묶은 막대 (범례 + 값 직접 표시) */
export function BeforeAfterBars({
  data,
}: {
  data: { key: string; label: string; before: number; after: number }[];
}) {
  const peak = Math.max(1, ...data.flatMap((d) => [d.before, d.after]));
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">표시할 자료가 없습니다</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-series-1" /> 개선 전
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-series-2" /> 개선 후
        </span>
      </div>
      <div className="flex items-end gap-4 overflow-x-auto pb-1">
        {data.map((d) => (
          <div key={d.key} className="flex min-w-16 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-1/3 rounded-t-[4px] bg-series-1"
                style={{ height: `${Math.max(3, (d.before / peak) * 100)}%` }}
                title={`${d.label} 개선 전 ${d.before}점`}
              />
              <div
                className="w-1/3 rounded-t-[4px] bg-series-2"
                style={{ height: `${Math.max(3, (d.after / peak) * 100)}%` }}
                title={`${d.label} 개선 후 ${d.after}점`}
              />
            </div>
            <div className="flex gap-1 text-[11px] tabular-nums">
              <span className="font-medium">{d.before}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{d.after}</span>
            </div>
            <span className="truncate text-xs text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
