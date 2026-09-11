/**
 * 위험성평가 연간계획표 (원본 서식: SSI-602-02)
 *
 * 서식의 15개 항목은 **코드에 고정**한다 — 절차구분·세부절차는 법정 절차의 뼈대라
 * 해마다 바뀌지 않고, 무엇보다 **실적 자동 집계가 이 항목 key에 묶여 있기 때문**이다.
 * 해마다 달라지는 대상·목표·세부내용만 문서에 담아 고칠 수 있게 했다.
 */
import type { Assessment, HazardInfo, Inspection, Survey, Training } from "./types";

/** 원본 서식의 15개 항목. 실적 자동 집계 규칙이 이 key에 붙는다 */
export type PlanItemKey =
  | "notice"
  | "eduMeeting"
  | "eduOwner"
  | "eduManager"
  | "eduWorker"
  | "hazardInfo"
  | "inspection"
  | "survey"
  | "decision"
  | "measurePlan"
  | "measureDo"
  | "record"
  | "share"
  | "adhoc"
  | "jobRisk";

export type PlanTemplateRow = {
  key: PlanItemKey;
  /** 절차구분 (B열) */
  group: string;
  /** 세부절차 (C열) */
  step: string;
  /** 세부절차 아래 단계 (D열) — 없으면 C가 D까지 차지한다 */
  sub?: string;
  /** 수시평가·작업위험성은 원본에서 절차구분이 세부절차 칸까지 먹는다 */
  wide?: boolean;
  detail: string;
  target: string;
  goal: string;
  /** 실적을 자동으로 집계할 수 있는 항목이면 그 근거를 한 줄로 적는다(화면 안내에 쓴다) */
  auto?: string;
};

/** 원본 서식 그대로의 15줄. 순서도 서식과 같다 */
export const PLAN_TEMPLATE: PlanTemplateRow[] = [
  {
    key: "notice",
    group: "사전준비",
    step: "실시공고",
    detail: "방침 및 목표 공표 및\n실시공고 알림·게시",
    target: "전 구성원",
    goal: "1회",
  },
  {
    key: "eduMeeting",
    group: "사전준비",
    step: "실시규정\n작성",
    sub: "위험성\n평가\n교육 회의",
    detail: "위험성평가 실시 교육 회의\n(평가팀 구성 · 역할)",
    target: "전 구성원",
    goal: "1회",
    auto: "실시서(사전 교육·회의) 발행일",
  },
  {
    key: "eduOwner",
    group: "사전준비",
    step: "실시규정\n작성",
    sub: "위험성평가\n교육",
    detail: "위험성평가 사업주 교육",
    target: "책 임 자",
    goal: "1명",
  },
  {
    key: "eduManager",
    group: "사전준비",
    step: "실시규정\n작성",
    sub: "위험성평가\n교육",
    detail: "위험성평가 담당자 교육",
    target: "담 당 자",
    goal: "1명",
  },
  {
    key: "eduWorker",
    group: "사전준비",
    step: "실시규정\n작성",
    sub: "위험성평가\n교육",
    detail: "위험성평가 근로자 교육",
    target: "전 구성원",
    goal: "전체",
  },
  {
    key: "hazardInfo",
    group: "사전준비",
    step: "유해위험정보 조사",
    detail: "대상공정 분류",
    target: "담 당 자",
    goal: "1회",
    auto: "유해위험정보 작성일",
  },
  {
    key: "inspection",
    group: "유해위험\n요인파악",
    step: "사업장 순회점검",
    detail: "유해위험요인 발굴",
    target: "전 직원",
    goal: "1회",
    auto: "순회점검 점검일자",
  },
  {
    key: "survey",
    group: "유해위험\n요인파악",
    step: "종사자의견청취",
    detail: "청취, 상시제안 등",
    target: "전 직원",
    goal: "10건",
    auto: "설문지 작성일자",
  },
  {
    key: "decision",
    group: "위험성 결정",
    step: "위험성 결정",
    detail: "허용가능 수준 판단",
    target: "담 당 자",
    goal: "-",
    auto: "평가표 행의 개선일자",
  },
  {
    key: "measurePlan",
    group: "감소대책\n수립이행",
    step: "감소대책 수립",
    detail: "-",
    target: "담 당 자",
    goal: "-",
    auto: "평가표 행의 개선일자",
  },
  {
    key: "measureDo",
    group: "감소대책\n수립이행",
    step: "감소대책 이행",
    detail: "-",
    target: "전 직원",
    goal: "-",
    auto: "평가표 행의 개선일자",
  },
  {
    key: "record",
    group: "결과기록\n및 공유",
    step: "결과 기록",
    detail: "",
    target: "담 당 자",
    goal: "-",
  },
  {
    key: "share",
    group: "결과기록\n및 공유",
    step: "결과 공유",
    detail: "결과 교육 및 게시",
    target: "전 직원",
    goal: "-",
    auto: "실시서(결과 교육)·공람표 발행일",
  },
  {
    key: "adhoc",
    group: "수시평가",
    step: "",
    wide: true,
    detail: "-",
    target: "-",
    goal: "-",
    auto: "평가표 행의 개선일자",
  },
  { key: "jobRisk", group: "작업위험성", step: "", wide: true, detail: "-", target: "-", goal: "-" },
];

/** 문서에 저장되는 한 줄 — 해마다 달라지는 값만 담는다(뼈대는 PLAN_TEMPLATE에 있다) */
export type PlanRow = {
  key: PlanItemKey;
  detail: string;
  target: string;
  goal: string;
  /** 계획으로 표시한 달 (1~12) */
  plan: number[];
  /** 손으로 켠 실적 달 — 자동 집계와 합쳐서 본다(자동에 안 잡히는 외부 교육 등) */
  actual: number[];
  note: string;
};

export type AnnualPlan = {
  id: string;
  year: number;
  approver: { charge: string; review: string; approve: string };
  rows: PlanRow[];
  updatedAt: number;
};

export function emptyPlanRows(): PlanRow[] {
  return PLAN_TEMPLATE.map((t) => ({
    key: t.key,
    detail: t.detail,
    target: t.target,
    goal: t.goal,
    plan: [],
    actual: [],
    note: "",
  }));
}

export function emptyAnnualPlan(
  year: number,
  approver: { charge: string; review: string; approve: string } = { charge: "", review: "", approve: "" },
): AnnualPlan {
  return { id: crypto.randomUUID(), year, approver: { ...approver }, rows: emptyPlanRows(), updatedAt: Date.now() };
}

/** 지난해 계획을 그대로 가져오고 실적만 비운다 — 해마다 계획이 크게 바뀌지 않기 때문 */
export function copyPlanForYear(prev: AnnualPlan, year: number): AnnualPlan {
  const byKey = new Map(prev.rows.map((r) => [r.key, r]));
  return {
    id: crypto.randomUUID(),
    year,
    approver: { ...prev.approver },
    // 서식 항목이 늘어난 뒤에 옛 문서를 복사해도 빠진 줄이 생기지 않게 템플릿을 기준으로 돈다
    rows: emptyPlanRows().map((base) => {
      const old = byKey.get(base.key);
      return old ? { ...base, detail: old.detail, target: old.target, goal: old.goal, plan: [...old.plan] } : base;
    }),
    updatedAt: Date.now(),
  };
}

/* ── 실적 자동 집계 ───────────────────────────────────────────
   이미 시스템에 쌓인 기록에서 "그 일을 실제로 한 달"을 뽑는다. 판단 근거가
   분명한 9개 항목만 자동으로 채우고, 나머지(실시공고·사업주/담당자/근로자 교육·
   결과 기록·작업위험성)는 사람이 손으로 표시한다 — 시스템에 판단할 근거가 없다. */

export type PlanSources = {
  assessments: Assessment[];
  hazardInfos: HazardInfo[];
  inspections: Inspection[];
  surveys: Survey[];
  trainings: Training[];
};

/** 자동 집계 결과 — 그 일이 있었던 달과 건수 */
export type AutoActual = { months: number[]; count: number };

/** 'YYYY-MM-DD'가 그 해의 날짜면 월(1~12)을, 아니면 null */
function monthOf(year: number, date?: string): number | null {
  if (!date) return null;
  const [y, m] = date.split("-");
  if (Number(y) !== year) return null;
  const month = Number(m);
  return month >= 1 && month <= 12 ? month : null;
}

function collect(year: number, dates: (string | undefined)[]): AutoActual {
  const months = new Set<number>();
  let count = 0;
  for (const d of dates) {
    const m = monthOf(year, d);
    if (m === null) continue;
    months.add(m);
    count += 1;
  }
  return { months: [...months].sort((a, b) => a - b), count };
}

export function autoActual(year: number, src: PlanSources): Partial<Record<PlanItemKey, AutoActual>> {
  /* 평가표 행의 **개선일자** — 실제로 개선이 끝난 달이다.
     위험성 결정 → 감소대책 수립 → 이행 → 수시평가는 한 건의 개선에서 잇따라 일어나는
     일이라, 넷 모두 이 날짜를 실적의 근거로 삼는다(같은 달에 같은 표시가 찍힌다). */
  const improved = collect(year, src.assessments.flatMap((a) => a.rows.map((r) => r.improveDate)));

  return {
    eduMeeting: collect(
      year,
      src.trainings.filter((t) => t.kind === "사전 교육·회의").map((t) => t.date),
    ),
    hazardInfo: collect(year, src.hazardInfos.map((h) => h.date)),
    inspection: collect(year, src.inspections.map((i) => i.date)),
    survey: collect(year, src.surveys.map((v) => v.date)),
    decision: improved,
    measurePlan: improved,
    measureDo: improved,
    adhoc: improved,
    share: collect(
      year,
      src.trainings.filter((t) => t.kind === "결과 교육" || t.kind === "공람표").map((t) => t.date),
    ),
  };
}

/** 화면·인쇄가 함께 쓰는 한 줄의 최종 실적 — 자동 집계와 손으로 켠 달을 합친다 */
export function actualMonths(row: PlanRow, auto?: AutoActual): number[] {
  return [...new Set([...(auto?.months ?? []), ...row.actual])].sort((a, b) => a - b);
}

/**
 * 이행률 — 계획한 달 수 대비 실제로 한 달 수(100% 상한).
 *
 * 달이 서로 맞는지까지는 보지 않는다. 3월 계획을 4월에 했다고 0%가 되면
 * 숫자가 실제 이행 정도를 못 나타내기 때문이다. 계획이 없는 줄은 계산하지 않는다.
 */
export function progressOf(row: PlanRow, auto?: AutoActual): number | null {
  if (row.plan.length === 0) return null;
  const done = actualMonths(row, auto).length;
  return Math.round((Math.min(done, row.plan.length) / row.plan.length) * 100);
}

/** 계획이 있는 줄만 평균 낸 전체 이행률 */
export function overallProgress(plan: AnnualPlan, auto: Partial<Record<PlanItemKey, AutoActual>>): number | null {
  const values = plan.rows.map((r) => progressOf(r, auto[r.key])).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** 같은 값이 연달아 나오는 구간을 묶는다 — 인쇄물의 세로 병합(rowSpan)에 쓴다 */
export function spanRuns<T>(items: T[], value: (t: T) => string): { value: string; start: number; len: number }[] {
  const runs: { value: string; start: number; len: number }[] = [];
  items.forEach((item, i) => {
    const v = value(item);
    const last = runs[runs.length - 1];
    if (last && last.value === v) last.len += 1;
    else runs.push({ value: v, start: i, len: 1 });
  });
  return runs;
}
