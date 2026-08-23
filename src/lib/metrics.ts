/** 대시보드 집계 — 화면과 인쇄본이 같은 계산을 쓴다 */
import { isHighRisk, riskAfter, riskBefore } from "./risk";
import type { Assessment, HazardInfo, RiskItem } from "./types";

export type Entry = { assessment: Assessment; row: RiskItem };

const today = () => new Date(new Date().toDateString());

export function daysLeft(date: string): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((new Date(d.toDateString()).getTime() - today().getTime()) / 86_400_000);
}

export function buildMetrics(assessments: Assessment[], hazardInfos: HazardInfo[]) {
  const entries: Entry[] = assessments.flatMap((a) => a.rows.map((row) => ({ assessment: a, row })));
  const high = entries.filter((e) => isHighRisk(e.row));
  const open = high.filter((e) => e.row.status !== "개선완료");
  const done = high.length - open.length;

  /** 기한 — 개선 완료가 아닌 고위험군만 본다 */
  const withDue = open
    .map((e) => ({ ...e, left: daysLeft(e.row.dueDate) }))
    .filter((e): e is Entry & { left: number } => e.left !== null);
  const overdue = withDue.filter((e) => e.left < 0).sort((a, b) => a.left - b.left);
  const soon = withDue.filter((e) => e.left >= 0 && e.left <= 7).sort((a, b) => a.left - b.left);

  /** 5×4 히트맵 — 개선 전 가능성×중대성 분포 */
  const heat = new Map<string, number>();
  for (const e of entries) {
    if (!e.row.p || !e.row.s) continue;
    const key = `${e.row.p}-${e.row.s}`;
    heat.set(key, (heat.get(key) ?? 0) + 1);
  }

  /** 위험분류별 고위험군 건수 */
  const byClass = new Map<string, number>();
  for (const e of high) {
    const k = e.row.hazardClass || "미분류";
    byClass.set(k, (byClass.get(k) ?? 0) + 1);
  }

  /** 공정별 위험성 총점 (개선 전 기준) */
  const byProcess = new Map<string, { total: number; count: number }>();
  for (const e of entries) {
    const v = riskBefore(e.row);
    if (v === null) continue;
    const k = e.assessment.process || "공정 미입력";
    const cur = byProcess.get(k) ?? { total: 0, count: 0 };
    byProcess.set(k, { total: cur.total + v, count: cur.count + 1 });
  }

  /** 평가표별 개선 전후 위험성 총점 */
  const beforeAfter = assessments
    .map((a) => {
      const before = a.rows.reduce((sum, r) => sum + (riskBefore(r) ?? 0), 0);
      const after = a.rows.reduce((sum, r) => sum + (riskAfter(r) ?? riskBefore(r) ?? 0), 0);
      return { key: a.id, label: a.process || "공정 미입력", before, after };
    })
    .filter((d) => d.before > 0);

  /** 빈칸 점검 — 감사·점검 때 지적되는 미완성 항목 */
  const linkedProcesses = new Set(hazardInfos.map((h) => `${h.facility}|${h.process}`));
  const gaps = {
    noPhoto: high.filter((e) => !e.row.beforePhoto || !e.row.afterPhoto),
    noMeasure: high.filter((e) => !e.row.measure.trim()),
    noCode: high.filter((e) => !e.row.code.trim()),
    noDue: high.filter((e) => !e.row.dueDate && e.row.status !== "개선완료"),
    noHazardInfo: assessments.filter((a) => !linkedProcesses.has(`${a.facility}|${a.process}`)),
  };

  const riskTotalBefore = entries.reduce((sum, e) => sum + (riskBefore(e.row) ?? 0), 0);
  const riskTotalAfter = entries.reduce((sum, e) => sum + (riskAfter(e.row) ?? riskBefore(e.row) ?? 0), 0);

  return {
    entries,
    high,
    open,
    done,
    completionRate: high.length ? Math.round((done / high.length) * 100) : 0,
    overdue,
    soon,
    heat,
    byClass: [...byClass.entries()].map(([k, v]) => ({ key: k, label: k, value: v })).sort((a, b) => b.value - a.value),
    byProcess: [...byProcess.entries()]
      .map(([k, v]) => ({ key: k, label: k, value: v.total, note: `${v.count}건` }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    beforeAfter,
    gaps,
    riskTotalBefore,
    riskTotalAfter,
    reduction: riskTotalBefore ? Math.round(((riskTotalBefore - riskTotalAfter) / riskTotalBefore) * 100) : 0,
  };
}

export type Metrics = ReturnType<typeof buildMetrics>;
