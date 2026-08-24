/**
 * 앱 설정 — 유지보수를 코드 수정 없이 하기 위한 값들.
 * IndexedDB의 settings 스토어에 단일 레코드로 저장한다.
 */
import { HAZARD_CLASSES, STATUSES } from "./types";

export type ScaleLabel = { value: number; label: string };

export type AppSettings = {
  /** 조직 · 기본값 */
  org: {
    orgName: string; // 기관명
    facility: string; // 기본 대상시설
    approver: { charge: string; review: string; approve: string }; // 결재자 기본값
  };
  /** 로컬 프로필 — 사이드바 표시·인쇄물 기본값에만 쓰인다 */
  profile: { name: string; role: string };
  /** 게스트 계정이 쓸 수 있는 기능. 관리 기능(설정 변경·백업·초기화)은 항상 막혀 있어 여기 없다 */
  permissions: { edit: boolean; delete: boolean; photo: boolean };
  /** 목록 */
  processes: string[]; // 공정명
  hazardClasses: string[];
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
    approver: { charge: "", review: "", approve: "" },
  },
  profile: { name: "관리자", role: "안전관리자" },
  permissions: { edit: false, delete: false, photo: false },
  processes: [],
  hazardClasses: [...HAZARD_CLASSES],
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

/** 저장된 설정에 기본값을 채워 넣는다(항목이 추가돼도 안전하게 열리도록) */
export function withDefaults(saved: Partial<AppSettings> | undefined | null): AppSettings {
  if (!saved) return { ...DEFAULT_SETTINGS };
  return {
    org: { ...DEFAULT_SETTINGS.org, ...saved.org, approver: { ...DEFAULT_SETTINGS.org.approver, ...saved.org?.approver } },
    profile: { ...DEFAULT_SETTINGS.profile, ...saved.profile },
    permissions: { ...DEFAULT_SETTINGS.permissions, ...saved.permissions },
    processes: saved.processes ?? [],
    hazardClasses: saved.hazardClasses?.length ? saved.hazardClasses : DEFAULT_SETTINGS.hazardClasses,
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
