/**
 * 유해위험요인 분류 — 원본 서식 `SSI-602-06` 양식4-1(유해·위험요인 파악 분류표) 기준
 * (+ 현장 실정에 맞춘 추가분 하나: 7.3 교통안전).
 * 요인구분(위험분류)과 그 아래 유해위험유형 코드를 한 벌로 들고 있다.
 *
 * 이 표가 위험분류 목록의 정본이다 — 예전에는 위험분류가 문자열 배열이었고
 * 화재·폭발/밀폐공간이 따로 있었는데, 원본 서식에서는 그 둘이 코드로 흡수돼 있다
 * (화재=3.8, 폭발/파열=3.9는 화학적 아래, 질식위험·산소결핍=5.1은 작업특성 아래).
 * 이름은 원본의 "기계적 요인"이 아니라 기존 데이터와 같은 "기계적"을 쓴다.
 */
export type HazardType = {
  code: string; // 유해위험유형 번호 (예: "1.4")
  label: string; // 유형 이름 (예: "부딪힘")
};
export type HazardFactor = {
  no: string; // 요인구분 번호 (예: "1")
  name: string; // 요인구분 이름 = 위험분류 (예: "기계적")
  types: HazardType[];
};

export const HAZARD_FACTORS: HazardFactor[] = [
  {
    no: "1",
    name: "기계적",
    types: [
      { code: "1.1", label: "끼임·감김" },
      { code: "1.2", label: "베임·긁힘·찔림" },
      { code: "1.3", label: "기계의 맞음, 뒤집힘, 무너짐, 깔림" },
      { code: "1.4", label: "부딪힘" },
      { code: "1.5", label: "넘어짐, 헛디딤, 걸림, 미끄러짐" },
      { code: "1.6", label: "떨어짐" },
    ],
  },
  { no: "2", name: "전기적", types: [{ code: "2.1", label: "감전" }] },
  {
    no: "3",
    name: "화학적",
    types: [
      { code: "3.1", label: "유해가스" },
      { code: "3.2", label: "고온증기" },
      { code: "3.3", label: "흄" },
      { code: "3.4", label: "화학물질 접촉·누출" },
      { code: "3.5", label: "분진" },
      { code: "3.6", label: "반응성물질" },
      { code: "3.7", label: "방사선" },
      { code: "3.8", label: "화재" },
      { code: "3.9", label: "폭발/파열" },
    ],
  },
  {
    no: "4",
    name: "생물학적",
    types: [
      { code: "4.1", label: "병원성 미생물, 바이러스 감염" },
      { code: "4.2", label: "알러지" },
    ],
  },
  {
    no: "5",
    name: "작업특성",
    types: [
      { code: "5.1", label: "질식위험·산소결핍" },
      { code: "5.2", label: "근로자 실수" },
      { code: "5.3", label: "압력상태" },
      { code: "5.4", label: "소음" },
      { code: "5.5", label: "진동" },
      { code: "5.6", label: "중량물취급" },
      { code: "5.7", label: "반복작업" },
      { code: "5.8", label: "이상온도·물체 접촉(화상)" },
      { code: "5.9", label: "불안정한 작업자세" },
      { code: "5.10", label: "부적절 작업도구" },
    ],
  },
  {
    no: "6",
    name: "작업환경",
    types: [
      { code: "6.1", label: "기후(고온 또는 한랭)" },
      { code: "6.2", label: "조도(조명)" },
      { code: "6.3", label: "공간 및 통로 미확보" },
      { code: "6.4", label: "주변 근로자" },
      { code: "6.5", label: "작업시간" },
    ],
  },
  {
    no: "7",
    name: "기타",
    types: [
      { code: "7.1", label: "정리정돈" },
      { code: "7.2", label: "기타사항" },
      // 7.3은 원본 서식에 없는 추가분이다 — 출퇴근 교통재해 항목이 많아
      // 전부 "기타사항"으로 뭉치면 집계가 무의미해져서 따로 뒀다
      { code: "7.3", label: "교통안전" },
    ],
  },
];

/** 위험분류 이름 목록 — 요인구분에서 뽑는다 */
export const HAZARD_CLASSES = HAZARD_FACTORS.map((f) => f.name);
/** 이미 저장된 값은 목록에 없어도 그대로 남으므로 문자열로 둔다 */
export type HazardClass = string;

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
  hazardCode: string; // 위험코드 — 유해위험유형 번호만 저장한다 (예: "1.4")
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
    hazardCode: "",
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

/* ── 순회점검 조사표 (원본 서식: SSI-602-06 양식4) ──────────── */

export type InspectionItem = {
  id: string;
  content: string; // 발굴 유해·위험 작업 및 요인
  hazardCode: string; // 유해위험 유형 — 분류표의 번호만 저장한다 (예: "1.4")
  photo?: string; // 사진 id (R2)
  /**
   * 위험성평가표로 옮긴 흔적. rowId는 그때 만든 평가표 행의 id다 —
   * 그 행이 아직 남아 있는지로 '이관됨' 배지를 판단하므로(inspectionMoved),
   * 평가표에서 행을 지우면 배지도 자동으로 풀린다.
   */
  movedTo?: { assessmentId: string; rowId: string; at: number };
};

export type InspectionAttendee = {
  id: string;
  dept: string; // 소속
  name: string; // 성명 (서명은 인쇄 후 수기)
};

export type Inspection = {
  id: string;
  facility: string; // 시설명
  process: string; // 공정명
  date: string; // 점검일자 (YYYY-MM-DD)
  inspector: string; // 점검자
  items: InspectionItem[];
  attendees: InspectionAttendee[];
  updatedAt: number;
};

export function emptyInspectionItem(): InspectionItem {
  return { id: crypto.randomUUID(), content: "", hazardCode: "" };
}

export function emptyAttendee(dept = ""): InspectionAttendee {
  return { id: crypto.randomUUID(), dept, name: "" };
}

export function emptyInspection(dept = ""): Inspection {
  return {
    id: crypto.randomUUID(),
    facility: "",
    process: "",
    date: new Date().toISOString().slice(0, 10),
    inspector: "",
    items: [emptyInspectionItem()],
    attendees: [emptyAttendee(dept)],
    updatedAt: Date.now(),
  };
}

/* ── 의견청취 · 설문지 ───────────────────────────────────────
   근로자가 현장에서 발굴한 위험요인을 직접 제출하는 서식.
   필드는 위험성평가표 행(RiskItem)과 거의 1:1이라 그대로 이관할 수 있다. */

/**
 * 설문지 검토 상태 — 낸 의견이 어떻게 처리됐는지 알려준다.
 * 의견청취는 피드백이 돌아가야 참여가 유지되므로 상태를 남긴다.
 * '반영'은 평가표로 이관할 때 자동으로 붙고, '반려'는 사유를 함께 적는다.
 */
export const REVIEW_STATUSES = ["접수", "검토중", "반영", "반려"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type Survey = {
  id: string;
  author: string; // 작성자 (직원 명단에서 고름)
  date: string; // 작성일자 (YYYY-MM-DD)
  process: string; // 공정명
  subProcess: string; // 세부공정
  hazardClass: HazardClass | ""; // 위험분류
  hazardCode: string; // 위험코드 — 번호만 저장 (예: "1.4")
  hazard: string; // 유해위험요인
  p: number | null; // 가능성
  s: number | null; // 중대성 (위험성 = p × s, 저장하지 않고 그때그때 계산한다)
  measure: string; // 개선대책
  dueDate: string; // 개선예정일 (YYYY-MM-DD)
  photos: string[]; // 사진 id (최대 SURVEY_MAX_PHOTOS장)
  /** 위험성평가표로 옮긴 흔적 — 순회점검과 같은 방식으로 rowId까지 남긴다 */
  movedTo?: { assessmentId: string; rowId: string; at: number };
  /**
   * 잠금 — 게스트가 고치거나 지우지 못하게 한다(관리자는 계속 가능).
   * 평가표로 이관하면 자동으로 잠긴다: 이미 반영된 건의 원본이 바뀌면 근거가 어긋난다.
   * 화면에서 버튼을 감추는 것만으로는 못 막으므로 워커가 매 요청마다 다시 검사한다.
   */
  locked?: boolean;
  /** 검토 상태 — 옛 기록에는 없을 수 있어 없으면 '접수'로 본다(reviewOf) */
  review?: ReviewStatus;
  /** 반려 사유 — '반려'일 때만 쓴다 */
  reviewNote?: string;
  updatedAt: number;
};

/** 저장된 값이 없으면 '접수'로 본다 */
export function reviewOf(v: { review?: ReviewStatus }): ReviewStatus {
  return v.review ?? "접수";
}

/** 설문지에 붙일 수 있는 사진 장수 */
export const SURVEY_MAX_PHOTOS = 2;

export function emptySurvey(): Survey {
  return {
    id: crypto.randomUUID(),
    author: "",
    date: new Date().toISOString().slice(0, 10),
    process: "",
    subProcess: "",
    hazardClass: "",
    hazardCode: "",
    hazard: "",
    p: null,
    s: null,
    measure: "",
    dueDate: "",
    photos: [],
    review: "접수",
    updatedAt: Date.now(),
  };
}
