/**
 * 작업 위험성평가 (JRA) — 작업 하나를 시작하기 전에 그 작업의 단계별 위험을 훑는 서식.
 *
 * 정기평가(위험성평가표)가 **공정 단위로 한 해 한 장**을 쌓는 문서라면, 작업평가는
 * **작업 한 건마다 한 장**이다. 그래서 같은 '위험성평가' 메뉴 안에 탭으로 나란히 두되
 * 저장소와 화면은 따로 간다(필드가 거의 겹치지 않는다).
 *
 * 점수 축은 정기평가와 같다 — 피해강도 = 중대성(1~4), 사고빈도 = 가능성(1~5).
 * 그래서 riskOf(p, s)와 설정의 고위험군 기준점을 그대로 쓴다. 다만 문서 머리에는
 * 작업 자체의 위험도를 미리 가늠하는 **JRA 등급**(A·B·C)이 따로 붙는다 — 역할이 다르다.
 */

/** 위험성평가 구분 — 이 문서가 어떤 평가의 일부인지 */
export const JOB_EVAL_TYPES = ["작업평가", "정기평가", "수시평가", "최초평가"] as const;
export type JobEvalType = (typeof JOB_EVAL_TYPES)[number];

/** 평가를 수행하는 부서 — 목록 화면에서 필터·구분용으로 쓴다(인쇄물에는 안 싣는다) */
export const JOB_TEAMS = ["기계팀", "전기팀", "공정팀", "실험실"] as const;
export type JobTeam = (typeof JOB_TEAMS)[number];

/* ── JRA 등급 — 작업 자체의 위험도를 셋으로 가늠한다 ────────── */
export const JRA_INTENSITY = [
  { value: 0, label: "0점 · 병원치료가 필요 없음" },
  { value: 2, label: "2점 · 휴업을 동반하지 않는 경미한 부상" },
  { value: 4, label: "4점 · 휴업재해(1개월 미만)" },
  { value: 6, label: "6점 · 중대재해·중대산업사고, 휴업재해(1개월 이상), 5천만원 이상 물적피해" },
] as const;

export const JRA_FREQUENCY = [
  { value: 1, label: "1점 · 1회/년 작업 수준" },
  { value: 2, label: "2점 · 1회/월 작업 수준" },
  { value: 3, label: "3점 · 1회/주 작업 수준" },
] as const;

export const JRA_PROBABILITY = [
  { value: -1, label: "-1점 · 손실발생 가능성 낮음" },
  { value: 0, label: "0점 · 손실발생 가능성 보통" },
  { value: 1, label: "1점 · 손실발생 가능성 높음" },
] as const;

/** JRA는 곱이 아니라 **합**이다(강도 + 빈도 + 가능성) — 매트릭스 점수와 계산 방식이 다르다 */
export function jraScore(v: { jraI: number; jraF: number; jraP: number }): number {
  return v.jraI + v.jraF + v.jraP;
}

export function jraGrade(score: number): "A(고위험)" | "B(중위험)" | "C(저위험)" {
  if (score >= 7) return "A(고위험)";
  if (score >= 4) return "B(중위험)";
  return "C(저위험)";
}

/** 목록·인쇄물에 함께 쓰는 'B(중위험) 5점' 형태 */
export function jraLabel(v: { jraI: number; jraF: number; jraP: number }): string {
  const score = jraScore(v);
  return `${jraGrade(score)} ${score}점`;
}

/* ── 보호구 ────────────────────────────────────────────────
   목록에 없는 것은 '기타 보호구'에 그때그때 적는다(현장 사정이 다양해 목록만으로 못 채운다) */
export const PPE_ITEMS = [
  "안전모",
  "안전화",
  "안전장갑",
  "보안경",
  "절연모",
  "절연장갑",
  "송기마스크",
  "방독마스크",
  "안전대",
  "에어백 조끼",
  "식수",
  "그늘막",
  "냉방장치",
  "방한화",
  "귀덮개",
  "방한복",
  "핫팩",
  "온수",
] as const;

/** 작업 전 준비 — 문서 단위로 한 번 확인한다 */
export const PRE_JOB_ITEMS = [
  "작업계획서 · 허가서 작성 및 승인 여부",
  "작업구역 지정 및 출입금지 조치",
  "해당 작업 안전보호구 · 작업공구 확인",
  "작업장소 이동동선 및 작업장소 확인",
  "작업 투입 구성원 음주/건강상태 확인",
  "안전작업 절차 숙지 상태 확인",
  "안전보호구 착용 및 작동 상태 확인",
  "주요 위험 포인트 숙지 상태 확인",
  "Tool Box Meeting 회의록 작성",
] as const;

/** '작업종료' 행에서 확인하는 항목 — 작업을 마칠 때 훑는다 */
export const FINISH_ITEMS = [
  "작업장소 정리정돈 상태",
  "작업한 구성원 체크 및 건강상태 확인",
  "작업 시 안전 조치에 대한 피드백 확인",
  "교체가 필요한 안전보호구 확인",
  "안전보호구 및 작업도구 손상 확인",
] as const;

/* ── 척도 설명 — 원본 프로그램의 안내표를 그대로 옮겼다 ──────
   설정의 척도 라벨(짧은 낱말)보다 자세해서, 작업평가 화면에서는 이 설명을 곁들인다 */
export const SEVERITY_GUIDE = [
  { value: 1, label: "휴업이 수반되지 않는 재해" },
  { value: 2, label: "휴업 1월 미만인 재해" },
  { value: 3, label: "휴업 1일 이상인 재해" },
  { value: 4, label: "사망재해" },
] as const;

export const FREQUENCY_GUIDE = [
  { value: 1, label: "피해가 발생할 가능성이 없음 — 전반적으로 안전조치가 잘 되어 있음" },
  {
    value: 2,
    label:
      "피해가 발생할 가능성이 낮음 — 가드·방호덮개 등으로 보호되어 있고 안전장치가 설치되어 있으며, 위험영역 출입이 곤란하고 안전수칙·작업표준이 정비되어 있으나 피해 가능성이 남아 있음",
  },
  {
    value: 3,
    label:
      "부주의하면 피해가 발생할 가능성이 있음 — 가드·방호덮개나 안전장치는 있으나 불비가 있고, 위험영역 접근·위험원 접촉이 있을 수 있으며 안전수칙 일부를 지키기 어려움",
  },
  {
    value: 4,
    label:
      "피해가 발생할 가능성이 높음 — 가드·방호덮개 등 안전장치가 없거나 상당한 불비가 있고, 안전수칙은 있으나 지키기 어려워 많은 주의가 필요함",
  },
  {
    value: 5,
    label: "피해가 발생할 가능성이 매우 높음 — 해당 안전대책이 없고 표시·표지도 불비가 많으며 안전수칙·작업표준도 없음",
  },
] as const;

/* ── 문서 ─────────────────────────────────────────────────── */

/** 참여자 한 명 — 내부(우리 직원)와 외부(용역업체)를 나눈다 */
export type JobParticipant = {
  id: string;
  name: string;
  /** true면 용역업체 직원 */
  external: boolean;
  /** 아직 누가 올지 모를 때 — 원본의 '미정' 토글 */
  undecided: boolean;
  /** 손 서명 이미지 id (R2) — 실시서·공람표와 같은 방식으로 게스트가 직접 남긴다 */
  sign?: string;
  signedAt?: number;
};

/**
 * 매트릭스 한 줄. 보통 줄(normal)과 '작업종료' 줄(finish) 두 가지다 —
 * 작업종료 줄은 점수를 매기지 않고 마무리 확인 항목만 담는다.
 */
export type JobRow = {
  id: string;
  kind: "normal" | "finish";
  stepName: string; // 공정/작업순서
  ppes: string[]; // 고른 보호구
  ppeEtc: string; // 목록에 없는 보호구
  hazardCode: string; // 위험코드 (설정 분류표의 번호, 예: "1.4")
  factor: string; // 위험요인
  actions: string[]; // 체크한 현재 조치사항
  customActions: string[]; // 직접 적어 넣은 조치사항
  /** 피해강도 = 중대성(1~4). 정기평가와 같은 축이라 이름도 맞춘다 */
  s: number | null;
  /** 사고빈도 = 가능성(1~5) */
  p: number | null;
  measure: string; // 감소대책
  s2: number | null; // 조치 후 강도
  p2: number | null; // 조치 후 빈도
  owner: string; // 담당자
  opinion: string; // 종사자 의견
  finishItems: string[]; // kind==="finish"일 때 체크한 마무리 항목
};

export type JobAssessment = {
  id: string;
  /* 1단계 — 기본 정보 */
  mainCategory: string; // 대분류 (설정의 공정명 목록에서 고른다)
  subCategory: string; // 중분류
  detailCategory: string; // 세분류
  content: string; // 상세 작업 내용
  evalType: JobEvalType;
  jraI: number;
  jraF: number;
  jraP: number;
  /* 2단계 — 참여자 */
  date: string; // 평가일자 (YYYY-MM-DD)
  team: string; // 구분(수행 부서) — 목록 화면용, 인쇄물에는 없음
  evaluator: string; // 위험성 평가자
  approvedBy: string; // 승인자(사업소장) — 개요표의 (인) 칸
  /** 평가자·승인자 손서명 — 참여자와 달리 명단이 아니라 이름 한 칸이라 문서에 직접 붙인다.
   * 인쇄물의 '(인)' 자리에 찍힌다(없으면 그대로 '(인)' 글자가 남는다) */
  evaluatorSign?: string;
  evaluatorSignedAt?: number;
  approvedBySign?: string;
  approvedBySignedAt?: number;
  participants: JobParticipant[];
  /* 3~4단계 */
  rows: JobRow[];
  preJobs: string[]; // 체크한 작업 전 준비사항
  /** 결재란 — 다른 인쇄물과 같은 방식(설정 기본값 + 문서별 수정) */
  approver: { charge: string; review: string; approve: string };
  /** 잠금 — 관리자가 걸면 게스트는 고치지도, 서명하지도 못한다 */
  locked?: boolean;
  /** 이 잠금이 '승인 서명 접수'로 저절로 걸린 것인가 — 관리자가 손수 건 잠금과 구별한다 */
  autoLocked?: boolean;
  updatedAt: number;
};

export function emptyJobRow(kind: JobRow["kind"] = "normal"): JobRow {
  return {
    id: crypto.randomUUID(),
    kind,
    stepName: kind === "finish" ? "작업 완료" : "",
    ppes: [],
    ppeEtc: "",
    hazardCode: "",
    factor: "",
    actions: [],
    customActions: [],
    s: null,
    p: null,
    measure: "",
    s2: null,
    p2: null,
    owner: "",
    opinion: "",
    // 마무리 항목은 원본처럼 전부 켠 상태로 시작한다(해당 없는 것만 끈다)
    finishItems: kind === "finish" ? [...FINISH_ITEMS] : [],
  };
}

export function emptyJobParticipant(external = false, name = ""): JobParticipant {
  return { id: crypto.randomUUID(), name, external, undecided: false };
}

export function emptyJobAssessment(defaults: {
  approver?: { charge: string; review: string; approve: string };
  process?: string;
} = {}): JobAssessment {
  return {
    id: crypto.randomUUID(),
    mainCategory: defaults.process ?? "",
    subCategory: "",
    detailCategory: "",
    content: "",
    evalType: "작업평가",
    jraI: 0,
    jraF: 1,
    jraP: -1,
    date: new Date().toISOString().slice(0, 10),
    team: "",
    evaluator: "",
    approvedBy: "",
    participants: [],
    rows: [emptyJobRow()],
    // 작업 전 준비는 원본처럼 전부 켠 상태로 시작한다
    preJobs: [...PRE_JOB_ITEMS],
    approver: { ...(defaults.approver ?? { charge: "", review: "", approve: "" }) },
    updatedAt: Date.now(),
  };
}

/** 점수를 매기는 줄만 — 목록 집계와 인쇄에서 함께 쓴다 */
export const scoredRows = (v: JobAssessment) => v.rows.filter((r) => r.kind === "normal");

/** 그 문서에서 가장 높은 (조치 전) 위험점수. 없으면 null */
export function topRisk(v: JobAssessment): number | null {
  const scores = scoredRows(v)
    .map((r) => (r.p && r.s ? r.p * r.s : null))
    .filter((n): n is number => n !== null);
  return scores.length ? Math.max(...scores) : null;
}

/** 기준점 이상이라 '허용 불가능'인 줄 수 — 목록에서 위험한 문서를 골라내는 데 쓴다 */
export function overLimitCount(v: JobAssessment, threshold: number): number {
  return scoredRows(v).filter((r) => r.p && r.s && r.p * r.s >= threshold).length;
}

/** 서명을 받은 참여자 수 */
export const signedParticipants = (v: JobAssessment) => v.participants.filter((x) => x.sign).length;

/** '미정' 자리는 아직 이름이 없어 서명 자체가 불가능하므로 완료 여부를 따질 때는 뺀다 */
const signable = (list: JobParticipant[]) => list.filter((p) => !p.undecided);

/** 그 구분(내부·외부)에 서명 가능한 사람이 없거나(=0명이거나 전부 미정), 있다면 전원 서명했는가 */
export function sectionAllSigned(list: JobParticipant[]): boolean {
  const s = signable(list);
  return s.length === 0 || s.every((p) => !!p.sign);
}

/** 그 구분에 서명 가능한 사람이 없거나, 있다면 최소 1명이라도 서명했는가 */
export function sectionAnySigned(list: JobParticipant[]): boolean {
  const s = signable(list);
  return s.length === 0 || s.some((p) => !!p.sign);
}

/** 승인자 서명을 열어도 되는가 — 평가자·내부·외부 참여자가 설정된 규칙만큼 서명했는지 본다 */
export function approverSignEnabled(v: JobAssessment, requireAll: boolean): boolean {
  if (!v.evaluatorSign) return false;
  const internal = v.participants.filter((p) => !p.external);
  const external = v.participants.filter((p) => p.external);
  return requireAll
    ? sectionAllSigned(internal) && sectionAllSigned(external)
    : sectionAnySigned(internal) && sectionAnySigned(external);
}
