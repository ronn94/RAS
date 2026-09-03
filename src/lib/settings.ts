/**
 * 앱 설정 — 유지보수를 코드 수정 없이 하기 위한 값들.
 * IndexedDB의 settings 스토어에 단일 레코드로 저장한다.
 */
import { HAZARD_FACTORS, STATUSES, type HazardFactor } from "./types";

export type ScaleLabel = { value: number; label: string };

export type AppSettings = {
  /** 조직 · 기본값 */
  org: {
    orgName: string; // 기관명
    facility: string; // 기본 대상시설
    dept: string; // 기본 소속 — 순회점검 참석자 명단에 미리 채운다
    approver: { charge: string; review: string; approve: string }; // 결재자 기본값
  };
  /** 로컬 프로필 — 사이드바 표시·인쇄물 기본값에만 쓰인다 */
  profile: { name: string; role: string };
  /** 게스트 계정이 쓸 수 있는 기능. 관리 기능(설정 변경·백업·초기화)은 항상 막혀 있어 여기 없다 */
  permissions: { edit: boolean; delete: boolean; photo: boolean; survey: boolean };
  /** 목록 */
  processes: string[]; // 공정명
  /**
   * 유해위험요인 분류표 — 요인구분(=위험분류)과 그 아래 유해위험유형 코드.
   * 위험분류 목록의 정본이다(예전의 `hazardClasses: string[]`를 대체).
   */
  hazardFactors: HazardFactor[];
  statuses: string[];
  owners: string[]; // 담당자 후보
  /** 직원 명단 — 월간 게시용 보고서의 '열람 명단' 서명표에 쓴다(담당자 목록과 별개) */
  staff: string[];
  /** 위험성 기준 */
  risk: {
    threshold: number; // 고위험군 기준점 (기본 8)
    likelihood: ScaleLabel[]; // 가능성 척도
    severity: ScaleLabel[]; // 중대성 척도
  };
  updatedAt: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  org: {
    orgName: "",
    facility: "",
    dept: "용인사업소",
    approver: { charge: "", review: "", approve: "" },
  },
  profile: { name: "관리자", role: "안전관리자" },
  // 설문지는 게스트에게 의견을 받는 게 목적이라 기본으로 켜 둔다
  permissions: { edit: false, delete: false, photo: false, survey: true },
  processes: [],
  hazardFactors: HAZARD_FACTORS.map((f) => ({ ...f, types: f.types.map((t) => ({ ...t })) })),
  statuses: [...STATUSES],
  owners: [],
  staff: [],
  risk: {
    threshold: 8,
    likelihood: [
      { value: 1, label: "거의 없음" },
      { value: 2, label: "낮음" },
      { value: 3, label: "보통" },
      { value: 4, label: "높음" },
      { value: 5, label: "매우 높음" },
    ],
    severity: [
      { value: 1, label: "경미" },
      { value: 2, label: "경상" },
      { value: 3, label: "중상" },
      { value: 4, label: "사망" },
    ],
  },
  updatedAt: 0,
};

/**
 * 예전 설정에는 위험분류가 이름만 담긴 배열(`hazardClasses`)이었다.
 * 그때 쓰던 이름 중 원본 분류표에 없는 것(화재·폭발, 밀폐공간 등)은
 * 코드가 없는 요인구분으로 살려 둔다 — 이미 그 값을 쓰는 행이 있을 수 있어서다.
 */
function migrateFactors(saved: Partial<AppSettings> & { hazardClasses?: string[] }): HazardFactor[] {
  if (saved.hazardFactors?.length) {
    return saved.hazardFactors.map((f) => ({ ...f, types: (f.types ?? []).map((t) => ({ ...t })) }));
  }
  const base = DEFAULT_SETTINGS.hazardFactors.map((f) => ({ ...f, types: f.types.map((t) => ({ ...t })) }));
  const known = new Set(base.map((f) => f.name));
  const extras = (saved.hazardClasses ?? []).filter((name) => name && !known.has(name));
  return [...base, ...extras.map((name, i) => ({ no: String(base.length + i + 1), name, types: [] }))];
}

/** 저장된 설정에 기본값을 채워 넣는다(항목이 추가돼도 안전하게 열리도록) */
export function withDefaults(saved: Partial<AppSettings> | undefined | null): AppSettings {
  if (!saved) return { ...DEFAULT_SETTINGS };
  return {
    org: { ...DEFAULT_SETTINGS.org, ...saved.org, approver: { ...DEFAULT_SETTINGS.org.approver, ...saved.org?.approver } },
    profile: { ...DEFAULT_SETTINGS.profile, ...saved.profile },
    permissions: { ...DEFAULT_SETTINGS.permissions, ...saved.permissions },
    processes: saved.processes ?? [],
    hazardFactors: migrateFactors(saved),
    statuses: saved.statuses?.length ? saved.statuses : DEFAULT_SETTINGS.statuses,
    owners: saved.owners ?? [],
    staff: saved.staff ?? [],
    risk: {
      threshold: saved.risk?.threshold ?? DEFAULT_SETTINGS.risk.threshold,
      likelihood: saved.risk?.likelihood?.length ? saved.risk.likelihood : DEFAULT_SETTINGS.risk.likelihood,
      severity: saved.risk?.severity?.length ? saved.risk.severity : DEFAULT_SETTINGS.risk.severity,
    },
    updatedAt: saved.updatedAt ?? 0,
  };
}

/** 위험분류 이름 목록 — 요인구분에서 뽑는다(화면 드롭다운·필터가 쓴다) */
export function classNames(settings: AppSettings): string[] {
  return settings.hazardFactors.map((f) => f.name);
}

/** 그 위험분류에 속한 유해위험유형 목록. 없는 분류면 빈 배열 */
export function typesOf(settings: AppSettings, className: string) {
  return settings.hazardFactors.find((f) => f.name === className)?.types ?? [];
}

/** 위험코드 번호 → "1.4 부딪힘". 못 찾으면 번호만 돌려준다 */
export function codeLabel(settings: AppSettings, code: string): string {
  if (!code) return "";
  for (const f of settings.hazardFactors) {
    const t = f.types.find((x) => x.code === code);
    if (t) return `${t.code} ${t.label}`;
  }
  return code;
}

/** 위험코드가 속한 위험분류 이름. 못 찾으면 빈 문자열 */
export function classOfCode(settings: AppSettings, code: string): string {
  if (!code) return "";
  return settings.hazardFactors.find((f) => f.types.some((t) => t.code === code))?.name ?? "";
}

/** 분류표의 모든 유해위험유형을 한 줄로 편다(순회점검처럼 분류 칸이 없는 서식용) */
export function allTypes(settings: AppSettings) {
  return settings.hazardFactors.flatMap((f) => f.types.map((t) => ({ ...t, className: f.name })));
}

/**
 * 순회점검 항목이 아직 "이관됨"인지 — 그때 만든 평가표 행이 살아 있는지로 판단한다.
 * 상태를 따로 동기화하지 않으므로 평가표에서 행을 지우면 배지가 저절로 풀린다.
 *
 * 어느 평가표에 있는지는 보지 않고 **행 id만** 찾는다 — 평가표 상세에서 행을
 * 다른 평가표로 옮겨도 id는 그대로라, 옮겼다고 배지가 잘못 풀리면 안 되기 때문이다.
 */
export function inspectionMoved(
  assessments: { id: string; rows: { id: string }[] }[],
  movedTo?: { assessmentId: string; rowId?: string; at: number },
): boolean {
  if (!movedTo) return false;
  // rowId가 없는 옛 기록은 확인할 방법이 없으니 이관된 것으로 본다
  if (!movedTo.rowId) return assessments.some((a) => a.id === movedTo.assessmentId);
  return assessments.some((a) => a.rows.some((r) => r.id === movedTo.rowId));
}
