import { HIGH_RISK_THRESHOLD, type Assessment, type RiskItem } from "./types";

/**
 * 고위험군 기준점은 설정에서 바꿀 수 있다.
 * 화면 곳곳에서 인자 없이 판정하므로 모듈 수준에 보관하고 설정 로드 시 갱신한다.
 */
let threshold = HIGH_RISK_THRESHOLD;
export const setRiskThreshold = (v: number) => {
  threshold = Number.isFinite(v) && v > 0 ? v : HIGH_RISK_THRESHOLD;
};
export const getRiskThreshold = () => threshold;

/** 위험성 = 가능성 × 중대성. 둘 중 하나라도 비어 있으면 null */
export function riskOf(p: number | null, s: number | null): number | null {
  if (!p || !s) return null;
  return p * s;
}

export const riskBefore = (r: RiskItem) => riskOf(r.p, r.s);
export const riskAfter = (r: RiskItem) => riskOf(r.p2, r.s2);

/** 고위험군 판정 — 개선 전 위험성이 기준점 이상 (기본 8점) */
export function isHighRisk(r: RiskItem): boolean {
  const v = riskBefore(r);
  return v !== null && v >= threshold;
}

/** 위험성 등급 — 표시용 */
export function riskLevel(v: number | null): { label: string; tone: "low" | "mid" | "high" } {
  if (v === null) return { label: "-", tone: "low" };
  if (v >= threshold * 1.5) return { label: "높음", tone: "high" };
  if (v >= threshold) return { label: "중간", tone: "mid" };
  return { label: "낮음", tone: "low" };
}

/** 위험성 배지 색 — 토큰만 사용 */
export function riskBadgeClass(v: number | null): string {
  const { tone } = riskLevel(v);
  if (tone === "high") return "bg-destructive/10 text-destructive";
  if (tone === "mid") return "bg-accent text-accent-foreground";
  return "bg-secondary text-secondary-foreground";
}

/**
 * 평가코드 자동 부여 — `YY.공정순-일련번호` (예: 25.2-1)
 * 8점 이상인 행에만 부여하고, 8점 미만이 되면 비운다.
 * 이미 사용자가 손으로 고친 코드는 형식이 맞으면 유지한다.
 */
export function reassignCodes(a: Assessment): Assessment {
  const yy = (a.date || new Date().toISOString().slice(0, 10)).slice(2, 4);
  const prefix = `${yy}.${a.processNo}-`;
  let seq = 0;
  const rows = a.rows.map((r) => {
    if (!isHighRisk(r)) return r.code ? { ...r, code: "" } : r;
    seq += 1;
    const next = `${prefix}${seq}`;
    // 사용자가 직접 입력한 다른 형식의 코드는 존중한다
    if (r.code && !/^\d{2}\.\d+-\d+$/.test(r.code)) return r;
    return r.code === next ? r : { ...r, code: next };
  });
  return { ...a, rows };
}
