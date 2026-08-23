/** 위험분류 — 공공하수처리장 확장안 (사용자 확정) */
export const HAZARD_CLASSES = [
  "기계적",
  "전기적",
  "화학적",
  "생물학적",
  "화재·폭발",
  "밀폐공간",
  "작업특성",
  "작업환경",
  "기타",
] as const;
export type HazardClass = (typeof HAZARD_CLASSES)[number];

/** 조치 상태 */
export const STATUSES = ["미조치", "조치중", "개선완료"] as const;
export type Status = (typeof STATUSES)[number];

/** 위험성 척도 — 가능성(빈도) 1~5 × 중대성(강도) 1~4 */
export const LIKELIHOOD = [
  { value: 1, label: "1 · 거의 없음" },
  { value: 2, label: "2 · 낮음" },
  { value: 3, label: "3 · 보통" },
  { value: 4, label: "4 · 높음" },
  { value: 5, label: "5 · 매우 높음" },
];
export const SEVERITY = [
  { value: 1, label: "1 · 경미" },
  { value: 2, label: "2 · 경상" },
  { value: 3, label: "3 · 중상" },
  { value: 4, label: "4 · 사망" },
];

/** 고위험군 기준 (개선 전 위험성) */
export const HIGH_RISK_THRESHOLD = 8;

export type RiskItem = {
  id: string;
  subProcess: string; // 세부공정
  hazardClass: HazardClass | "";
  hazard: string; // 유해위험요인
  currentControl: string; // 현재의 안전보건조치
  p: number | null; // 가능성
  s: number | null; // 중대성
  code: string; // 평가코드 (8점 이상 자동 부여)
  measure: string; // 개선대책
  dueDate: string; // 개선예정일 (YYYY-MM-DD)
  p2: number | null; // 개선 후 가능성
  s2: number | null; // 개선 후 중대성
  note: string; // 비고(종사자 의견 등)
  status: Status;
  owner: string; // 담당자
  // 고위험군 전용
  improveContent: string; // 개선내용
  improveDate: string; // 개선 일자 (YYYY-MM-DD)
  beforePhoto?: string; // 사진 id
  afterPhoto?: string; // 사진 id
};

export type Assessment = {
  id: string;
  facility: string; // 대상시설
  process: string; // 공정명
  processNo: number; // 공정순번 (평가코드 중간 숫자)
  date: string; // 평가일시 (YYYY-MM-DD)
  approver: { charge: string; review: string; approve: string }; // 담당·검토·승인
  rows: RiskItem[];
  updatedAt: number;
};

export function emptyRow(): RiskItem {
  return {
    id: crypto.randomUUID(),
    subProcess: "",
    hazardClass: "",
    hazard: "",
    currentControl: "",
    p: null,
    s: null,
    code: "",
    measure: "",
    dueDate: "",
    p2: null,
    s2: null,
    note: "",
    status: "미조치",
    owner: "",
    improveContent: "",
    improveDate: "",
  };
}

export function emptyAssessment(processNo = 1): Assessment {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    facility: "",
    process: "",
    processNo,
    date: today,
    approver: { charge: "", review: "", approve: "" },
    rows: [emptyRow()],
    updatedAt: Date.now(),
  };
}

/* ── 유해·위험 정보 (원본 서식: 유해·위험 정보) ─────────────── */

export type YesNo = "" | "무" | "유";

export type HazardStep = {
  id: string;
  order: string; // 공정(작업)순서
  equipName: string; // 기계·기구 및 설비명
  equipQty: string; // 수량
  chemName: string; // 화학물질명
  chemAmount: string; // 취급량/일
  chemTime: string; // 취급시간
};

/** 그 밖의 유해위험정보 — 원본 서식대로 문서 1장당 1세트 */
export type HazardExtra = {
  accident3y: { flag: YesNo; detail: string }; // 3년간 재해발생 사례
  nearMiss: { flag: YesNo; detail: string }; // 아차사고 사례
  shiftWork: "" | "유" | "무"; // 교대작업 유무
  workers: {
    female: boolean; // 여성근로자
    novice: boolean; // 1년 미만 미숙련자
    elderly: boolean; // 고령근로자
    irregular: boolean; // 비정규직 근로자
    foreign: boolean; // 외국인 근로자
    disabled: boolean; // 장애근로자
  };
  transport: { machine: boolean; machineNote: string; manual: boolean; manualNote: string }; // 운반수단
  heavyLoad: { lift: boolean; push: boolean; pull: boolean }; // 중량물 인력취급 형태
  permit: { required: boolean; none: boolean; note: string }; // 안전작업계획·허가서
  envMeasure: "" | "측정" | "미측정" | "해당없음"; // 작업환경측정
  specialEdu: { flag: YesNo; detail: string }; // 특별안전교육
};

export type HazardInfo = {
  id: string;
  assessmentId: string | null; // 연동된 위험성평가표
  facility: string; // 대상시설
  process: string; // 공정명
  date: string; // 작성일 (YYYY-MM-DD)
  steps: HazardStep[];
  extra: HazardExtra;
  updatedAt: number;
};

export function emptyStep(): HazardStep {
  return { id: crypto.randomUUID(), order: "", equipName: "", equipQty: "", chemName: "", chemAmount: "", chemTime: "" };
}

export function emptyExtra(): HazardExtra {
  return {
    accident3y: { flag: "", detail: "" },
    nearMiss: { flag: "", detail: "" },
    shiftWork: "",
    workers: { female: false, novice: false, elderly: false, irregular: false, foreign: false, disabled: false },
    transport: { machine: false, machineNote: "크레인·호이스트, 지게차", manual: false, manualNote: "인력에 의한 수작업" },
    heavyLoad: { lift: false, push: false, pull: false },
    permit: { required: false, none: false, note: "" },
    envMeasure: "",
    specialEdu: { flag: "", detail: "" },
  };
}

export function emptyHazardInfo(): HazardInfo {
  return {
    id: crypto.randomUUID(),
    assessmentId: null,
    facility: "",
    process: "",
    date: new Date().toISOString().slice(0, 10),
    steps: [emptyStep(), emptyStep(), emptyStep()],
    extra: emptyExtra(),
    updatedAt: Date.now(),
  };
}
