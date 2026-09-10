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
  workName: string; // 작업명
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
    workName: "",
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
   * 평가표로 이관하면 자동으로 잠긴다: 의견을 낸 사람이 반영된 뒤에 마음대로 되돌리지 못하게 한다.
   * 관리자가 평가표 행이나 이 설문지 어느 쪽을 고쳐도 서로 맞춰진다(양방향 연동, store.tsx).
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

/** 설문지 사진 칸 이름 — 화면과 인쇄물이 같은 이름을 쓴다(칸 수도 이 배열이 정한다) */
export const SURVEY_PHOTO_LABELS = ["개선 전", "개선 후"] as const;
/** 설문지에 붙일 수 있는 사진 장수 */
export const SURVEY_MAX_PHOTOS = SURVEY_PHOTO_LABELS.length;

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

/* ── 작업중지권 · 우선조치권 ─────────────────────────────────
   근거: '작업중지권 활성화 및 우선조치권 운영 안내'(지속경영본부, 2025.06).
   서식 두 종류를 한 메뉴에서 다룬다.
   - 작업중지 요청서(첨부1) + 작업중지명령서(첨부2, 현장 게시물)는 **한 건**이다.
     명령서는 같은 사건의 게시용 출력물이라 따로 문서를 만들지 않는다.
   - 우선조치 요청서(Appendix 2)는 점검자·본사가 발행하는 별개 문서다. */

/**
 * 작업중지 진행 단계 — Process Flow의 2(중지)→7·8(조치)→10(재개)/11(중단)을 따른다.
 * '재개'는 작업재개 검토 승인, '중단'은 불승인(중대한 사항은 본사 지원 검토)이다.
 */
export const STOP_STATUSES = ["중지", "조치중", "재개", "중단"] as const;
export type StopStatus = (typeof STOP_STATUSES)[number];

/** 우선조치 진행 단계 — 발행 후 48시간 이내 처리가 원칙이다 */
export const PRIORITY_STATUSES = ["발행", "조치중", "완료"] as const;
export type PriorityStatus = (typeof PRIORITY_STATUSES)[number];

/** 작업중지 요청서 + 작업중지명령서 — 한 사건이 문서 한 건이다 */
export type StopWork = {
  id: string;
  no: string; // 접수번호 (YYYY-N, 자동 채번 후 수정 가능)
  receivedBy: string; // 접수자
  dept: string; // 소속(업체)
  process: string; // 공정명 — 설정의 공정명 목록에서 고른다
  subProcess: string; // 세부공정 — 평가표로 이관할 때 그대로 세부공정 칸에 들어간다
  workName: string; // 작업명 — 공정 안에서 실제로 하던 일(자유 입력)
  requesterRank: string; // 요청자 직급
  requesterName: string; // 요청자 성명
  requesterPhone: string; // 요청자 전화번호
  /** 요청자 서명 이미지 id (R2) — 화면에서 손으로 그린다. 없으면 인쇄물에 빈 칸이 남는다 */
  requesterSign?: string;
  reason: string; // 요청내용 (중지 사유)
  result: string; // 조치결과
  note: string; // 기타사항
  date: string; // 작성일 (YYYY-MM-DD)
  stoppedAt: string; // 작업중지 시각 (HH:MM)
  resumedAt: string; // 작업재개 시각 (HH:MM) — 둘을 빼서 총 중지시간을 만든다
  status: StopStatus;
  /** status가 마지막으로 바뀐 시각 — '중지'·'조치중' 상태로 24시간 넘게 머물면
      알림을 보내는 기준이 된다(updatedAt은 다른 필드만 고쳐도 같이 바뀌어 쓸 수 없다) */
  statusChangedAt?: number;
  /* 작업중지명령서(현장 게시물) 전용 항목 */
  orderScope: string; // 작업중지범위
  orderManager: string; // 담당자
  orderPhone: string; // 연락처
  photos: string[]; // 현장 사진 (최대 STOPWORK_PHOTO_LABELS.length장)
  /** 위험성평가표로 옮긴 흔적 — 순회점검·설문지와 같은 방식(inspectionMoved로 판정) */
  movedTo?: { assessmentId: string; rowId: string; at: number };
  /** 잠금 — 관리자가 걸면 게스트는 고치지도 지우지도 못한다(워커가 다시 검사한다) */
  locked?: boolean;
  updatedAt: number;
};

/** 우선조치 요청서 — 점검자가 중대 이슈를 발견해 사업부문에 발행한다 */
export type PriorityAction = {
  id: string;
  no: string; // 발행번호 (YYYY-N)
  issuedBy: string; // 발행 부서 (예: 지속경영본부_안전보건팀)
  site: string; // 사업장명
  rep: string; // 대표 (현장소장)
  inspectedAt: string; // 점검일시 (YYYY-MM-DD)
  standard: string; // 관련기준 (예: 산업안전보건법 제39조)
  penalty: string; // 위반시 Penalty (벌칙·행정처분·과태료)
  finding: string; // 확인내용
  request: string; // 요청사항
  dueDate: string; // 조치기간 (YYYY-MM-DD)
  note: string; // 기타사항
  date: string; // 발행일 (YYYY-MM-DD)
  issuerName: string; // 발행자 성명 (예: 지속경영본부장 ○○○)
  issuerSign?: string; // 발행자 서명 이미지 id
  coopName: string; // 협조자 성명 (예: ○○사업부문장 ○○○)
  coopSign?: string; // 협조자 서명 이미지 id
  result: string; // 조치결과 (사업부문 회신)
  status: PriorityStatus;
  photos: string[];
  movedTo?: { assessmentId: string; rowId: string; at: number };
  locked?: boolean;
  updatedAt: number;
};

/** 작업중지 사진 칸 이름 — 설문지와 같이 화면·인쇄물이 같은 이름을 쓴다 */
export const STOPWORK_PHOTO_LABELS = ["조치 전", "조치 후"] as const;

/** 접수번호·발행번호는 `연도-일련번호` — 그 해에 이미 쓴 번호 다음을 준다 */
export function nextDocNo(docs: { no?: string }[], year = new Date().getFullYear()): string {
  const prefix = `${year}-`;
  const used = docs
    .map((d) => d.no ?? "")
    .filter((no) => no.startsWith(prefix))
    .map((no) => Number(no.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  return `${prefix}${used.length ? Math.max(...used) + 1 : 1}`;
}

/** 총 작업중지 시간 — 서식의 '기타사항'에 자동으로 들어간다. 재개 전이면 null */
export function stopMinutes(v: { stoppedAt: string; resumedAt: string }): number | null {
  const toMin = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const a = toMin(v.stoppedAt);
  const b = toMin(v.resumedAt);
  if (a === null || b === null) return null;
  return b >= a ? b - a : b + 24 * 60 - a; // 자정을 넘긴 경우
}

export function emptyStopWork(no = "", dept = ""): StopWork {
  return {
    id: crypto.randomUUID(),
    no,
    receivedBy: "",
    dept,
    process: "",
    subProcess: "",
    workName: "",
    requesterRank: "",
    requesterName: "",
    requesterPhone: "",
    reason: "",
    result: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
    stoppedAt: "",
    resumedAt: "",
    status: "중지",
    statusChangedAt: Date.now(),
    orderScope: "",
    orderManager: "",
    orderPhone: "",
    photos: [],
    updatedAt: Date.now(),
  };
}

export function emptyPriorityAction(no = "", issuedBy = "", site = ""): PriorityAction {
  return {
    id: crypto.randomUUID(),
    no,
    issuedBy,
    site,
    rep: "",
    inspectedAt: new Date().toISOString().slice(0, 10),
    standard: "",
    penalty: "",
    finding: "",
    request: "",
    dueDate: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
    issuerName: "",
    coopName: "",
    result: "",
    status: "발행",
    photos: [],
    updatedAt: Date.now(),
  };
}

/* ── 이력 관리 · 회의·교육 실시서 ────────────────────────────
   원본 서식 두 종류를 **한 목록**에서 다룬다(표의 '구분' 칸으로 나뉜다).
   - 사전 교육·회의 실시서(SSI-602-03): 교육내용 + 회의내용 + 비고, 사진 2장
   - 결과 교육 실시서(SSI-602-04): 교육내용만, 사진 1장
   나머지(결재란·일시·장소·강사·참석자 명단)는 두 서식이 똑같아 한 타입으로 묶었다. */

export const TRAINING_KINDS = ["사전 교육·회의", "결과 교육"] as const;
export type TrainingKind = (typeof TRAINING_KINDS)[number];

/** 사진 칸 이름 — 서식마다 칸 수가 다르다(원본 그대로). 칸 수도 이 배열이 정한다 */
export const TRAINING_PHOTO_LABELS: Record<TrainingKind, readonly string[]> = {
  "사전 교육·회의": ["교육·회의 사진 1", "교육·회의 사진 2"],
  "결과 교육": ["교육 실시 사진"],
};

/**
 * 참석자 한 명. 서명은 **게스트가 직접 손으로 그린다** — 이미지 id만 남기고
 * 실제 그림은 R2에 있다(사진과 같은 취급이라 백업·고아 정리에서 함께 세어야 한다).
 */
export type TrainingAttendee = {
  id: string;
  dept: string; // 소속
  name: string; // 성명
  sign?: string; // 서명 이미지 id (R2)
  signedAt?: number; // 서명한 시각 — 언제 받았는지 알 수 있게 남긴다
};

export type Training = {
  id: string;
  kind: TrainingKind;
  date: string; // 교육·회의일자 (YYYY-MM-DD)
  startAt: string; // 시작 시각 (HH:MM)
  endAt: string; // 종료 시각 (HH:MM) — 둘을 빼서 '(○○분)'을 만든다
  place: string; // 교육·회의장소
  instructor: string; // 교육강사(회의주관자)
  /** 교육인원 — 비워 두면 참석자 수가 그대로 쓰인다(headcountOf) */
  headcount: number | null;
  eduContent: string; // 교육내용
  meetContent: string; // 회의내용 — '사전 교육·회의'에만 쓴다
  note: string; // 비고 — '사전 교육·회의'에만 있는 칸이다
  photos: string[]; // 사진 id (칸 수는 TRAINING_PHOTO_LABELS가 정한다)
  attendees: TrainingAttendee[];
  approver: { charge: string; review: string; approve: string }; // 결재란 (설정 기본값에서 채운다)
  /** 잠금 — 관리자가 걸면 게스트는 고치지도, **서명하지도** 못한다(워커가 다시 검사한다) */
  locked?: boolean;
  updatedAt: number;
};

/* 원본 서식에 인쇄돼 있는 표준문구. 새 문서에 기본값으로 들어가고 그날 실제
   다룬 내용에 맞게 고칠 수 있다 — 매번 다시 적지 않게 하려는 것이다. */
export const TRAINING_EDU_TEXT: Record<TrainingKind, string> = {
  "사전 교육·회의": `○ 위험성평가 사전교육에 대한 사항
  - 전반적인 위험성평가에 대한 내용 교육
  ① 「위험성평가」를 위한 사업주의 방침과 추진목표
  ② 「위험성평가」를 위한 사전준비 및 유해ㆍ위험요인 파악방법
  ③ 유해ㆍ위험요인에 대한 위험성 결정방법
     (허용가능/불가능한 위험등급 결정)
  ④ 위험성 감소대책 수립 및 실행의 절차와 기록유지 방법`,
  "결과 교육": `○ 위험성평가 결과 교육에 대한 사항
  - 위험성평가 결과에 대한 내용 공유
   ① 「위험성평가」 결과 발굴된 유해ㆍ위험요인에 대한 위험등급 결과 공유
      - 사업장 내 허용가능/허용불가능한 주요 유해·위험 요인

   ② 「위험성평가」 결과 허용불가능한 사항에 대한 감소대책 이행 결과 공유
      - 이행된 감소대책에 대해 근로자가 준수하거나 주의하여야 할 사항
      - 감소대책 이행 결과에 대한 FEED BACK 의견 청취

   ③ 「위험성평가」 결과 개선 예정 사항 공유`,
};

/** 회의내용 표준문구 — '사전 교육·회의'에만 있다 */
export const TRAINING_MEET_TEXT = `○ 위험성평가 대상 선정에 관한 사항
  - 평가대상 추가 및 확정
○ 위험성평가 참여 방법 및 인원에 대한 사항
  - 대상공정별 참여 관리감독자, 근로자 선정
  - 위험성평가 참여 방법(순회점검 외 기타 방법)
○ 위험성평가 추진을 위한 계획에 대한 사항
  - 실시 일정 확정(대상 공정별 순회점검 일정)
○ 위험성평가 역할 및 책임(권한)에 대한 사항
  - 참여 인원에 대한 역할 및 책임(권한) 확정
  - 근로자 대표 선정 관련 논의 (선정 또는 미선정)
    ※근로자대표 선정 시 선정방법 논의 (거수법, 투표법 등)
○ 위험성평가 공유방법
  - 결과에 대한 게시 및 교육 방법
  - 이행된 감소대책 유효성에 대한
    FEEDBACK 청취 방법 및 청취 안내`;

export function emptyTrainingAttendee(dept = "", name = ""): TrainingAttendee {
  return { id: crypto.randomUUID(), dept, name };
}

export function emptyTraining(
  kind: TrainingKind,
  approver: { charge: string; review: string; approve: string } = { charge: "", review: "", approve: "" },
): Training {
  return {
    id: crypto.randomUUID(),
    kind,
    date: new Date().toISOString().slice(0, 10),
    startAt: "",
    endAt: "",
    place: "",
    instructor: "",
    headcount: null,
    eduContent: TRAINING_EDU_TEXT[kind],
    meetContent: kind === "사전 교육·회의" ? TRAINING_MEET_TEXT : "",
    note: "",
    photos: [],
    attendees: [],
    approver: { ...approver },
    updatedAt: Date.now(),
  };
}

/** 소요시간(분) — 시작·종료가 다 있어야 계산된다. 작업중지권의 stopMinutes와 같은 규칙 */
export function trainingMinutes(v: Training): number | null {
  if (!v.startAt || !v.endAt) return null;
  const [sh, sm] = v.startAt.split(":").map(Number);
  const [eh, em] = v.endAt.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff < 0 ? diff + 24 * 60 : diff; // 자정을 넘긴 경우
}

/** 교육인원 — 직접 적은 숫자가 있으면 그것을, 없으면 참석자 수를 쓴다 */
export function headcountOf(v: Training): number {
  return v.headcount ?? v.attendees.length;
}

/** 서명 현황 — 목록의 '서명' 칸과 상세 화면 안내에 함께 쓴다 */
export function signedCount(v: Training): number {
  return v.attendees.filter((a) => a.sign).length;
}
