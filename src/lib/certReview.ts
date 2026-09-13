/**
 * 정기·사후심사 — 위험성평가 인정심사(최초 인정·재인정·사후심사) 이력.
 *
 * 안전보건공단 등 외부 기관이 주기적으로 진행하는 위험성평가 인정심사 결과를 남기는
 * 기록이다. 근로자가 현장에서 채우는 다른 서식과 달리 **관리자가 심사 결과를 받은 뒤
 * 정리해 적어 두는** 이력이라, 작업평가·상시평가처럼 게스트 전용 권한을 따로 두지 않고
 * 정기평가·유해위험정보와 같은 공용 edit/delete 권한을 그대로 쓴다.
 *
 * 항목 구성은 현장에서 쓰던 엑셀(`심사이력, 환기시간.xlsx`의 '심사결과' 시트)을 그대로
 * 옮겼다 — 번호·항목·심사날짜·결과·점수·주관·심사위원·총평·비고.
 */

/** 항목 — 엑셀에 실제로 쓰인 세 가지. 목록에 없는 것은 직접 입력한다 */
export const CERT_REVIEW_CATEGORIES = ["위험성평가 최초 인정심사", "위험성평가 재인정심사", "위험성평가 사후심사"] as const;

/** 결과 — 엑셀은 전부 '인정'이었지만 실무에서는 '불인정'·'보류'도 나올 수 있어 함께 둔다 */
export const CERT_REVIEW_RESULTS = ["인정", "불인정", "보류"] as const;

export type CertReview = {
  id: string;
  /** 항목 — 위 목록에서 고르거나 직접 적는다 */
  category: string;
  /** 심사날짜 (YYYY-MM-DD). 엑셀 원본은 "2016.01"처럼 일자가 없는 값도 있어 자유 입력을
   * 허용하고, 목록 정렬은 문자열 그대로 비교한다(형식이 섞여도 대체로 연대순은 맞는다) */
  date: string;
  result: string;
  /** 점수 — 없는 회차도 있어(엑셀 1행) 선택 입력이다 */
  score: number | null;
  /** 주관 — 대개 '안전보건공단'이라 등록 화면에서 기본값으로 채운다 */
  organizer: string;
  /** 심사위원 — 여러 명이면 쉼표로 적는다(엑셀 원본 표기를 그대로 따름) */
  examiners: string;
  summary: string;
  note: string;
  updatedAt: number;
};

export function emptyCertReview(): CertReview {
  return {
    id: crypto.randomUUID(),
    category: CERT_REVIEW_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    result: "인정",
    score: null,
    organizer: "안전보건공단",
    examiners: "",
    summary: "",
    note: "",
    updatedAt: Date.now(),
  };
}

/** 목록은 심사날짜 내림차순(최신이 위)으로 본다 */
export const sortCertReviews = (list: CertReview[]) => [...list].sort((a, b) => b.date.localeCompare(a.date));
