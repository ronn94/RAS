/**
 * 상시평가 — 작업 전에 매번 되풀이하는 짧은 서류들.
 *
 * 정기평가·작업평가가 '평가표'라면 상시평가는 **작업 당일의 기록**이다. 지금은 TBM
 * (Tool Box Meeting) 회의록 하나지만, 일일교육이 뒤따를 예정이라 처음부터 `kind`로
 * 종류를 구분하는 **한 저장소**(`routine_assessments`)에 담는다 — 종류마다 필드가
 * 달라도 문서 자체가 JSON이라 한 테이블로 충분하고, 목록·서명·권한을 공유할 수 있다.
 *
 * 서식은 BP 안전포털에서 쓰던 TBM 회의록을 그대로 옮겼다(위험요인 15종, PMIS 8항목).
 * 다만 위험요인·안전대책 후보는 코드에 박지 않고 **설정에서 고칠 수 있게** 했다 —
 * 작업평가의 '현재 조치사항' 후보와 같은 방식이다.
 */

/** 상시평가 종류 — 일일교육은 다음 차례다 */
export type RoutineKind = "tbm" | "education";

/** TBM 장소는 설정의 공정명에서 고르되, 목록에 없으면 '기타'로 직접 적는다 */
export const TBM_OTHER_LOCATION = "기타";

/** 작업유형 — 원본 서식의 6종 그대로 */
export const TBM_WORK_TYPES = [
  "자체작업",
  "외부업체 작업",
  "혼잡작업",
  "야간작업",
  "주말작업",
  "그 외 작업",
] as const;

/**
 * 작업자 PMIS Check — 신체(Physical)·정신(Mental)·지성(Intelligent)·감성(Sensible)
 * 네 묶음으로 인쇄물에 찍힌다. 사람마다가 아니라 **문서에 한 세트**다(원본과 같다).
 */
export type TbmPmisItem = { key: string; label: string; first: string; second: string };
export type TbmPmisGroup = { title: string; korean: string; items: TbmPmisItem[] };

export const TBM_PMIS_GROUPS: TbmPmisGroup[] = [
  {
    title: "Physical",
    korean: "신체",
    items: [
      { key: "alcohol", label: "음주 및 약물복용", first: "무", second: "유" },
      { key: "condition", label: "신체상태(혈색 등) 이상", first: "무", second: "유" },
    ],
  },
  {
    title: "Mental",
    korean: "정신",
    items: [
      { key: "commitment", label: "분담작업 시행 의지", first: "양", second: "불" },
      { key: "stress", label: "가정사 등 Stress", first: "무", second: "유" },
    ],
  },
  {
    title: "Intelligent",
    korean: "지성",
    items: [
      { key: "understanding", label: "분담작업 내용 숙지", first: "양", second: "불" },
      { key: "rules", label: "안전작업수칙 숙지", first: "양", second: "불" },
    ],
  },
  {
    title: "Sensible",
    korean: "감성",
    items: [
      { key: "sleep", label: "충분한 숙면 여부", first: "양", second: "불" },
      { key: "response", label: "지시사항 반응정도", first: "양", second: "불" },
    ],
  },
];

/** 묶음을 편 목록 — 기본값 만들기·검증에 쓴다 */
export const TBM_PMIS_ITEMS = TBM_PMIS_GROUPS.flatMap((g) => g.items);

/** 위험요인 하나와 그에 딸린 안전대책 후보 — 설정(`settings.tbmRisks`)에 저장된다 */
export type TbmRisk = {
  /** 문서에 저장되는 키 — 이름을 바꿔도 이미 쓴 문서가 깨지지 않게 키는 그대로 둔다 */
  key: string;
  label: string;
  measures: string[];
};

/** 원본 서식의 위험요인 15종과 대책 후보 — 설정의 기본값이다 */
export const DEFAULT_TBM_RISKS: TbmRisk[] = [
  {
    key: "fall",
    label: "떨어짐/추락",
    measures: [
      "작업발판·통로·사다리 상태 확인",
      "개구부·단부 덮개 또는 안전난간 설치",
      "안전모·안전대 등 보호구 착용",
      "고소작업 구역 출입통제",
      "강풍·악천후 시 고소작업 중지",
    ],
  },
  {
    key: "trip",
    label: "넘어짐/전도",
    measures: [
      "통로의 물기·기름·자재 즉시 제거",
      "전선·호스 통로 밖 정리",
      "미끄럼 방지 안전화 착용",
      "충분한 조도 확보",
      "계단·경사면 난간 사용",
    ],
  },
  {
    key: "crush",
    label: "깔림/뒤집힘",
    measures: [
      "적재물 높이·중량·균형 확인",
      "적재구역 구분 및 접근 통제",
      "장비 작업반경 내 출입 금지",
      "받침목·고임목 설치",
      "인양물 아래 대기 금지",
    ],
  },
  {
    key: "strike",
    label: "부딪힘/찔림",
    measures: [
      "돌출부 보호캡·방호덮개 설치",
      "작업구역과 보행통로 분리",
      "장비 이동 시 유도자 배치",
      "날카로운 자재 안전 보관",
      "안전모·보안경 착용",
    ],
  },
  {
    key: "hit",
    label: "맞음",
    measures: [
      "낙하물 위험구역 출입 통제",
      "공구·자재 낙하 방지",
      "상하 동시작업 구역 분리",
      "인양작업 신호수 배치",
      "안전모 착용 상태 확인",
    ],
  },
  {
    key: "pinch",
    label: "끼임/협착",
    measures: [
      "방호장치 설치 상태 확인",
      "정비 전 전원 차단·잠금·표지",
      "가동 중 청소·점검·조정 금지",
      "회전체 주변 복장 관리",
      "비상정지장치 확인",
    ],
  },
  {
    key: "temperature",
    label: "이상온도 노출/접촉",
    measures: [
      "고온·저온 설비 주변 접근 통제",
      "단열재·차단막 상태 확인",
      "내열·방열·방한 보호구 착용",
      "전용 공구 사용",
      "경고표지 부착",
    ],
  },
  {
    key: "collapse",
    label: "무너짐",
    measures: [
      "굴착면·가설구조물 사전 점검",
      "흙막이·동바리·지보공 상태 확인",
      "가장자리 자재·장비 적재 금지",
      "균열·침하 발견 시 작업 중지",
      "위험구역 출입 통제",
    ],
  },
  {
    key: "asphyxia",
    label: "산소결핍/질식",
    measures: [
      "작업 전 산소·유해가스 농도 측정",
      "작업 중 지속 환기",
      "밀폐공간 작업허가·감시인 배치",
      "호흡용 보호구 준비",
      "비상구조장비·절차 확인",
    ],
  },
  {
    key: "fire",
    label: "화재",
    measures: [
      "화기작업 전 가연물 제거",
      "소화기·소화설비 비치",
      "화기작업 허가·화재감시자 배치",
      "가스·유류 누출 점검",
      "작업 종료 후 잔불 확인",
    ],
  },
  {
    key: "explosion",
    label: "폭발",
    measures: [
      "인화성 가스·증기 발생 여부 확인",
      "점화원 제거·방폭형 장비 사용",
      "밀폐공간 가스농도 측정",
      "정전기 방지 접지",
      "압력용기·배관 상태 점검",
    ],
  },
  {
    key: "electric",
    label: "감전",
    measures: [
      "전원 차단·잠금·표지",
      "누전차단기·접지 상태 확인",
      "젖은 장소 전기작업 금지",
      "손상 전선·플러그 교체",
      "절연 보호구 착용",
    ],
  },
  {
    key: "chemical",
    label: "유해·위험물질 노출/접촉",
    measures: [
      "물질안전보건자료 확인",
      "용기 라벨·경고표지 확인",
      "환기설비 가동",
      "보호복·장갑·보안경·보호구 착용",
      "누출 시 응급조치 절차 확인",
    ],
  },
  {
    key: "musculoskeletal",
    label: "근골격계",
    measures: [
      "운반장비 사용",
      "중량·이동경로 확인",
      "올바른 중량물 취급 자세",
      "휴식·교대작업 실시",
      "작업 높이·자세 조정",
    ],
  },
  {
    key: "heat",
    label: "온열질환",
    measures: [
      "식수·그늘·휴식공간 제공",
      "고온 시간대 작업 조정",
      "보냉장구 지급",
      "작업 전·중 건강상태 확인",
      "이상 증상 시 작업 중지",
    ],
  },
];

/** 참석자 한 명 — 작업평가의 참여자와 같은 모양이라 서명도 같은 방식으로 받는다 */
export type TbmParticipant = {
  id: string;
  name: string;
  /** true면 용역업체 직원 */
  external: boolean;
  /** 손 서명 이미지 id (R2) */
  sign?: string;
  signedAt?: number;
};

export type Tbm = {
  id: string;
  kind: "tbm";
  /* 개요 */
  date: string; // TBM 일자 (YYYY-MM-DD)
  time: string; // TBM 시각 (HH:MM)
  sameWorkDate: boolean; // 작업날짜와 동일함
  team: string; // 구분(수행 부서) — 작업평가와 같은 목록, 목록 화면 필터용
  location: string; // 설정의 공정명 또는 '기타'
  otherLocation: string; // location이 '기타'일 때만
  riskAssessmentDone: boolean; // 작업 위험성평가 및 교육실시 여부
  /** 그날의 작업평가와 선택적으로 잇는다 — 이으면 작업내용·위험요인을 끌어올 수 있다 */
  jobAssessmentId: string | null;
  workTypes: string[];
  /** 설정(팀별 작업명)에서 토글로 고른 작업 — 되풀이하는 작업은 적지 않고 고른다 */
  workNames: string[];
  /** 목록에 없는 작업을 그때그때 적는 칸 — 토글과 함께 쓸 수 있다 */
  workDescription: string;
  /* 위험요인·대책 */
  risks: string[]; // TbmRisk.key 목록
  measures: string[]; // "key:index" 형태 — 위험요인을 지우면 딸린 대책도 함께 지운다
  /** 위험요인별로 직접 적은 대책 — 후보에 없는 대책을 그때그때 쓴다(위험요인 key → 글) */
  customMeasures: Record<string, string>;
  /* PMIS */
  pmis: Record<string, string>;
  /* 서명 */
  leaderName: string;
  leaderSign?: string;
  leaderSignedAt?: number;
  participants: TbmParticipant[];
  removalPerson: string;
  /** 잠금 — 관리자가 걸면 게스트는 고치지도, 서명하지도 못한다 */
  locked?: boolean;
  /** 이 잠금이 '서명 완료'로 저절로 걸린 것인가 — 관리자가 손수 건 잠금과 구별한다 */
  autoLocked?: boolean;
  updatedAt: number;
};

export function emptyTbmParticipant(external = false, name = ""): TbmParticipant {
  return { id: crypto.randomUUID(), name, external };
}

export function emptyTbm(defaults: { location?: string } = {}): Tbm {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    kind: "tbm",
    date: now.toISOString().slice(0, 10),
    // 현장에서 TBM은 대개 작업 시작 전 아침이다 — 기본값을 그때로 둔다
    time: "09:00",
    sameWorkDate: true,
    team: "",
    location: defaults.location ?? "",
    otherLocation: "",
    riskAssessmentDone: true,
    jobAssessmentId: null,
    // 현장 대부분이 자체작업이라 기본으로 켜 둔다 — 필요하면 그대로 끄거나 다른 유형을 더 고르면 된다
    workTypes: ["자체작업"],
    workNames: [],
    workDescription: "",
    risks: [],
    measures: [],
    customMeasures: {},
    // 기본값은 모두 '이상 없음' 쪽(무·양)이다 — 문제가 있는 항목만 바꾼다
    pmis: Object.fromEntries(TBM_PMIS_ITEMS.map((item) => [item.key, item.first])),
    leaderName: "",
    participants: [],
    removalPerson: "",
    updatedAt: Date.now(),
  };
}

/** 안전대책 값 — 위험요인 키와 그 안에서의 순번을 합쳐 하나의 문자열로 담는다 */
export const measureValue = (riskKey: string, index: number) => `${riskKey}:${index}`;

/** 고른 위험요인마다 대책을 하나 이상 골랐는가 — 원본 프로그램과 같은 필수 규칙이다 */
export function everyRiskHasMeasure(v: Pick<Tbm, "risks" | "measures" | "customMeasures">): boolean {
  return v.risks.every((key) => hasMeasureFor(v, key));
}

/** 그 위험요인에 대책이 하나라도 있는가 — 고른 후보든, 직접 적은 글이든 인정한다 */
export function hasMeasureFor(v: Pick<Tbm, "measures" | "customMeasures">, key: string): boolean {
  return v.measures.some((m) => m.startsWith(`${key}:`)) || !!(v.customMeasures?.[key] ?? "").trim();
}

/**
 * 등록(저장)하기 전에 비어 있는 항목 목록. 비어 있으면 등록할 수 있다.
 *
 * TBM은 **작업 직전에 다 같이 확인하는** 서류라, 빠진 칸이 있으면 회의를 한 셈이
 * 되지 않는다. 그래서 개요는 칸마다, 위험요인은 고른 것마다 대책까지, PMIS는
 * 여덟 항목 전부, 사람은 리더와 참석자 각각 한 명 이상을 요구한다.
 * (작업평가 연결만은 그날 작업평가가 없을 수도 있어 선택으로 둔다.)
 */
export function tbmMissing(v: Tbm): string[] {
  const missing: string[] = [];
  if (!v.date) missing.push("TBM 일자");
  if (!v.time) missing.push("시각");
  if (!v.team) missing.push("구분");
  if (!v.location) missing.push("장소");
  else if (v.location === TBM_OTHER_LOCATION && !v.otherLocation.trim()) missing.push("장소 직접 입력");
  if (v.workTypes.length === 0) missing.push("작업유형");
  // 토글로 고르거나 직접 적거나 — 둘 다 비어 있을 때만 빠진 것으로 본다
  if (v.workNames.length === 0 && !v.workDescription.trim()) missing.push("작업내용");
  if (v.risks.length === 0) missing.push("위험요인");
  else if (!everyRiskHasMeasure(v)) missing.push("안전대책(고른 위험요인마다 1개 이상)");
  if (TBM_PMIS_ITEMS.some((item) => !v.pmis[item.key])) missing.push("PMIS Check(8항목 전부)");
  if (!v.leaderName) missing.push("TBM 리더");
  if (v.participants.filter((p) => p.name.trim()).length === 0) missing.push("참석자(1명 이상)");
  return missing;
}

/** 고른 작업명들, 그 뒤에 수기로 적은 내용 — 화면과 인쇄물이 같은 순서를 쓴다 */
export function tbmWorkParts(v: Pick<Tbm, "workNames" | "workDescription">): string[] {
  return [...(v.workNames ?? []), (v.workDescription ?? "").trim()].filter(Boolean);
}

/**
 * 목록과 인쇄물의 '작업내용' 표기 — 고른 것마다 줄을 바꾸면 행이 들쭉날쭉해
 * 표를 훑기 어렵다. 한 줄에 '/'로 이어 붙인다.
 */
export const tbmWorkLine = (v: Pick<Tbm, "workNames" | "workDescription">) => tbmWorkParts(v).join(" / ");

/**
 * 인쇄물의 '안전대책' 칸에 찍을 줄 — 위험요인 순서대로, 고른 후보를 먼저 두고
 * 직접 적은 글을 그 뒤에 붙인다. 직접 적은 글은 여러 줄로 나눠 써도 한 줄씩 나온다.
 */
export function tbmMeasureLines(v: Tbm, risks: TbmRisk[]): { key: string; label: string; text: string }[] {
  const selected = new Set(v.risks);
  const chosen = new Set(v.measures);
  return risks
    .filter((r) => selected.has(r.key))
    .flatMap((r) => {
      const picked = r.measures
        .map((m, i) => ({ key: measureValue(r.key, i), label: r.label, text: m }))
        .filter((x) => chosen.has(x.key));
      const written = (v.customMeasures?.[r.key] ?? "")
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text, i) => ({ key: `${r.key}#${i}`, label: r.label, text }));
      return [...picked, ...written];
    });
}

/** 서명을 받은 참석자 수 */
export const signedTbmParticipants = (v: Tbm) => v.participants.filter((p) => p.sign).length;

/** 리더까지 포함해 서명이 다 찼는가 — 목록의 '완료' 배지가 이 값을 본다 */
export function tbmFullySigned(v: Tbm): boolean {
  return Boolean(v.leaderSign) && v.participants.length > 0 && v.participants.every((p) => p.sign);
}

/**
 * 서버에서 읽어 온 TBM을 지금의 모양으로 맞춘다.
 *
 * TBM 서식은 쓰면서 칸이 늘었다(작업명 토글, 작업유형 …). 먼저 저장된 기록에는 그 칸이
 * 아예 없어서, 화면이 `workNames`를 펼치는 순간 터지고 **상시평가 탭 전체가 하얗게** 됐다.
 * 값이 빠졌다고 기록을 버릴 수는 없으니, 읽는 길목에서 한 번 채워 넣는다.
 */
export function withTbmDefaults(v: Tbm): Tbm {
  const base = emptyTbm();
  return {
    ...v,
    sameWorkDate: v.sameWorkDate ?? true,
    riskAssessmentDone: v.riskAssessmentDone ?? true,
    jobAssessmentId: v.jobAssessmentId ?? null,
    team: v.team ?? "",
    location: v.location ?? "",
    otherLocation: v.otherLocation ?? "",
    workTypes: v.workTypes ?? [],
    workNames: v.workNames ?? [],
    workDescription: v.workDescription ?? "",
    risks: v.risks ?? [],
    measures: v.measures ?? [],
    customMeasures: v.customMeasures ?? {},
    pmis: { ...base.pmis, ...(v.pmis ?? {}) },
    leaderName: v.leaderName ?? "",
    participants: (v.participants ?? []).map((p) => ({ ...p, name: p.name ?? "", external: !!p.external })),
    removalPerson: v.removalPerson ?? "",
  };
}
