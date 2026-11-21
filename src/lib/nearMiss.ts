/**
 * 아차사고·개선요청 제보(2026-11-21) — 의견청취 › 아차사고.
 * 근로자가 게스트로 접속해 직접 제보한다(작업중지권과 같은 'stopwork' 권한).
 * 사진·서명은 다른 서식처럼 R2 사진 id로 담는다(고아 사진 정리에서 반드시 센다 — src/lib/db.ts).
 */
export const NEAR_MISS_FIELDS = ["현장설비개선", "안전시설개선", "작업환경개선", "기타개선", "아차사고"] as const;

export type NearMiss = {
  id: string;
  /** 접수번호 — 연도-일련번호(nextDocNo) */
  no: string;
  /** 요청일자 YYYY-MM-DD */
  date: string;
  /** 요청인 */
  dept: string;
  rank: string;
  name: string;
  sign?: string;
  /** 개선요청 위치 */
  location: string;
  /** 개선분야(여러 개) */
  fields: string[];
  /** 현재상황 */
  situation: string;
  /** 현장사진 — 개선 전·후 */
  beforePhoto?: string;
  afterPhoto?: string;
  /** 처리 상태(관리자) */
  status?: "접수" | "검토중" | "조치완료";
  /** 목록·검색용(collection 공통 칼럼) */
  facility?: string;
  process?: string;
  updatedAt: number;
};

const today = () => {
  const d = new Date(Date.now() + 9 * 3600e3);
  return d.toISOString().slice(0, 10);
};

export function emptyNearMiss(no: string): NearMiss {
  return { id: crypto.randomUUID(), no, date: today(), dept: "", rank: "", name: "", location: "", fields: [], situation: "", status: "접수", updatedAt: Date.now() };
}
