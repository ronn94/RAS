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

/**
 * 위험코드별 '현재 조치사항' 후보.
 *
 * 원본 프로그램은 위험분류 30종을 자체 목록으로 들고 있었지만, 그 30종은 우리 분류표의
 * **위험코드(유해위험유형)** 층에 그대로 대응한다. 그래서 코드 번호로 키를 옮겨
 * 정기평가·설문지·순회점검과 같은 분류 체계를 쓰도록 했다(설정에서 함께 관리된다).
 *
 * 여기 없는 코드(방사선·진동·압력상태 등)는 후보가 뜨지 않고 직접 적는다 — 원본도
 * '기타사항'에서 그렇게 동작했다.
 */
export const ACTIONS_BY_CODE: Record<string, string[]> = {
  "1.1": [
    "회전부 방호조치 확인",
    "비상정지(버튼, 와이어 등) 확인",
    "기계.기구 정지 시 LOTO 설치 유무",
    "고장/이상 발생시 절차 수립 확인",
    "자율안전확인신고/안전검사 실시 확인",
  ],
  "1.2": [
    "칼, 바늘 등 저장용기 외관상태 확인",
    "베임·긁힘·찔림 방지 안전보호구 착용 유무",
    "신체접촉 방호 장치 유무",
    "회전하는 날카로운 물체 방호덮개 확인 유무",
    "날카로운 도구 사용 방향 확인 유무",
  ],
  "1.3": [
    "지반/건물 균열 상태 확인 유무",
    "구조물, 화물 무너짐위험장소 출입금지 유무",
    "화물(중량물) 결속 상태 확인 유무",
    "배관 등 부식/변형등 이상상태 확인 유무",
    "중량물 보관 구역 적재, 지지상태 확인 유무",
    "바닥면 침하, 연약지반 상태 확인",
  ],
  "1.4": [
    "작업장소 구획 및 출입금지 조치 유무",
    "충돌 간섭 시설물 확인 유무",
    "충돌 위험설비 안전조치 유무",
    "작업 중 표시 조치 유무",
    "이동하는 중량물 등 주변 접근 통제 유무",
  ],
  "1.5": [
    "작업장소 구획 및 출입금지 조치 유무",
    "작업장소 정리정돈 유무",
    "이동동선 정리정돈 유무",
    "바닥 미끄럼 위험 상태 확인 유무",
    "현장 적정 조도 상태 확인 유무",
    "전도 기인 시설물 확인 유무",
  ],
  "1.6": [
    "추락/낙하 위험장소 출입금지 조치 유무",
    "안전난간, 덮개 등 상태 확인 유무",
    "안전대 부착설비 이상유무",
    "비계(달비계 등) 이상유무",
    "허용 중량 확인",
    "크레인/호이스트 훅, 와이어로프 관리",
    "중량물 인양시 보조로프, 두줄걸이 유무",
  ],
  "2.1": [
    "전기기구 취급시 작업공간 70cm이상 확보 유무",
    "설치, 해체, 정비, 점검 등 유자격자 작업 유무",
    "전선피복, 콘센트 등 손상 확인 유무",
    "절연용 안전보호구 착용 유무",
    "충전부 접촉 방호장치 설치 유무",
  ],
  "3.1": ["작업장소 유해가스 발생 유무 확인", "방독마스크 비치 및 상태 확인", "탈취설비 정상가동 유무 확인"],
  "3.2": ["고온증기 배관 접촉방지 유무", "고온증기 누기 상태 확인"],
  "3.3": [
    "용접마스크 등 안전보호구 착용 유무",
    "작업장소 환기상태 및 환기장치 유무",
    "MSDS 비치 및 경고표시 등 내용 확인 유무",
  ],
  "3.4": ["MSDS 비치 및 경고표시 등 내용 확인 유무", "유해화학물질 누액 상태 확인", "내화학용 보호구 착용 유무"],
  "3.5": [
    "방진마스크 등 방진보호구 비치 및 착용 유무",
    "탈취(집진)설비 정상가동 유무 확인",
    "작업환경측정 내 유해인자 분진 해당 유무 확인",
  ],
  "3.6": [
    "반응성물질 저장장소 온습도 상태 확인",
    "반응성물질 보관용기 밀폐 여부 확인",
    "장갑, 보안경 등 안전보호구 착용 유무",
  ],
  "3.8": [
    "소화기/소화전 점검 유무",
    "용접/용단/연마기기 작업 시 화재예방 조치 유무",
    "가연성/인화성 물질 보양 유무",
    "케이블/호스 손상유무 확인 유무",
    "피난/소화 절차 수령 유무",
  ],
  "3.9": ["방폭형 작업도구 사용 유무", "인화성물질 및 가스 누출 유무", "설비 내부 인화성물질 제거 유무"],
  "4.1": ["응급의료체계 숙지 여부"],
  "5.1": [
    "공기호흡기, 송기마스크 등 확인 유무",
    "배풍기 적정 환기 유무",
    "밀폐공간 허가서, 계획서 작성 유무",
    "복합가스측정기 측정 유무",
    "비상연락체계 구축 유무",
  ],
  "5.2": [
    "작업 투입 구성원 음주/건강상태 확인",
    "안전작업 절차 숙지 상태 확인",
    "안전보호구 착용 및 작동 상태 확인",
    "주요 위험 포인트 숙지 상태 확인",
  ],
  "5.4": ["귀마개 등 청력보호구 비치 및 착용 확인", "작업환경측정결과 내 유해인자 소음 유무 확인"],
  "5.6": ["올바른 중량물 취급자세 숙지 유무", "중량물 무게중심 확인", "중량물 운반대차 상태 확인"],
  "5.7": ["구성원 근골격계질환 유무 확인", "충분한 휴게시간 부여"],
  "5.8": [
    "고온설비 작업 절차에 대한 숙지 유무",
    "고온설비 방호조치 점검 유무",
    "방열보호구 구비/착용 유무",
    "보안면/보안경 구비/착용 유무",
    "고온 경보 표시 관리 상태 유무",
  ],
  "5.9": ["충분한 작업공간 확보 여부"],
  "5.10": ["사용 작업도구 외관 상태 점검 유무", "해당 작업에 필요한 적절한 도구 확인"],
  "6.2": [
    "초정밀작업 750럭스 이상 확인",
    "정밀작업 300럭스 이상 확인",
    "보통작업 150럭스 이상 확인",
    "그밖의 작업 75럭스 이상 확인",
    "작업동선 및 통로 조도 상태 확인",
  ],
  "6.3": ["통로의 부식 등 외관상태 점검 유무", "기계 설비 등 접근이 가능한 통로 확보 유무"],
  // 6.6·6.7은 원본에만 있던 폭염·한파다 — 분류표에 항목을 더해 그대로 살렸다
  "6.6": [
    "시원하고 깨끗한 물 제공 및 아이스팩 등 보냉장구 지급 유무",
    "냉방, 통풍장치 가동 및 옥외 작업장 그늘막 설치 유무",
    "폭염 집중 시간대 작업 자제 및 작업시간 조정 유무",
    "체감온도 31도 이상 시 적정 휴식시간 부여",
    "체감온도 33도 이상 시 매2시간 이내 20분 이상 휴식시간 부여",
    "온습도계 비치, 체감온도 측정 · 기록 유무",
    "온열질환자 발생 시 응급조치 요령 및 신고, 이송절차 숙지 유무",
  ],
  "6.7": [
    "깨끗하고 따듯한 물 제공 및 따듯한 옷 등 방한장구 지급 유무",
    "보온, 난방장치 등 쉼터 제공 유무",
    "한파 시 작업 자제 및 작업시간 조정 유무",
    "한랭질환자 발생 시 응급조치 요령 및 신고, 이송절차 숙지 유무",
  ],
  "7.1": ["작업장소 청결상태 확인 유무"],
};

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
  participants: JobParticipant[];
  /* 3~4단계 */
  rows: JobRow[];
  preJobs: string[]; // 체크한 작업 전 준비사항
  /** 결재란 — 다른 인쇄물과 같은 방식(설정 기본값 + 문서별 수정) */
  approver: { charge: string; review: string; approve: string };
  /** 잠금 — 관리자가 걸면 게스트는 고치지도, 서명하지도 못한다 */
  locked?: boolean;
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
