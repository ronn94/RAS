/**
 * 작업중지권 운영 현황 — 반기 실적표(첨부3 형식). A4 가로.
 *
 * 본사 안전보건팀에 반기 1회 취합해 보고하는 표다.
 * 칸: No · 사업소 · 요청일 · 직급 · 성명 · 요청내용 · 개선결과.
 *
 * 행 높이가 내용에 따라 달라지므로 위험성평가표·월간보고서와 같은 **2단계 측정 방식**을
 * 쓰지 않고, 대신 한 장에 다 안 들어가면 표가 그대로 다음 장으로 이어지게 둔다
 * (머리글은 `thead`라 브라우저가 페이지마다 다시 그린다 — 이 표는 셀 병합이 없어
 * 조각나도 테두리가 깨지지 않는다).
 */
import type { StopWork } from "@/lib/types";
import { useStore } from "@/store";

/** 반기 라벨 — 2025년 상반기 / 하반기 */
export function halfLabel(half: string): string {
  const [y, h] = half.split("-");
  return `${y}년 ${h === "1" ? "상반기" : "하반기"}`;
}

/** 그 반기에 속한 건 — 요청일(date) 기준 */
export function stopWorksInHalf(list: StopWork[], half: string): StopWork[] {
  const [y, h] = half.split("-");
  return list
    .filter((v) => {
      const m = /^(\d{4})-(\d{2})/.exec(v.date);
      if (!m) return false;
      const firstHalf = Number(m[2]) <= 6;
      return m[1] === y && (h === "1") === firstHalf;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 실적이 있는 반기 목록(최신순) — 당반기는 건이 없어도 항상 넣는다 */
export function availableHalves(list: StopWork[]): string[] {
  const set = new Set(
    list
      .map((v) => /^(\d{4})-(\d{2})/.exec(v.date))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => `${m[1]}-${Number(m[2]) <= 6 ? 1 : 2}`),
  );
  const now = new Date();
  set.add(`${now.getFullYear()}-${now.getMonth() + 1 <= 6 ? 1 : 2}`);
  return [...set].sort((a, b) => b.localeCompare(a));
}

export function StopWorkReportSheet({ stopWorks, half }: { stopWorks: StopWork[]; half: string }) {
  const { settings } = useStore();
  const rows = stopWorksInHalf(stopWorks, half);
  const site = settings.org.facility || settings.org.orgName || "";

  return (
    <div className="print-root sheet sheet-stopreport">
      <style>{"@page{size:A4 landscape;margin:15mm}"}</style>
      <div className="print-page">
        <div className="report-title">■ {halfLabel(half)} 근로자 작업중지권 운영 현황</div>

        <table>
          <colgroup>
            <col style={{ width: "12mm" }} />
            <col style={{ width: "34mm" }} />
            <col style={{ width: "24mm" }} />
            <col style={{ width: "16mm" }} />
            <col style={{ width: "22mm" }} />
            <col />
            <col style={{ width: "80mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th>No.</th>
              <th>사업소</th>
              <th>요청일</th>
              <th>직급</th>
              <th>성명</th>
              <th>요청내용</th>
              <th>개선결과</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="empty" colSpan={7}>
                  해당 반기에 접수된 작업중지 요청이 없습니다
                </td>
              </tr>
            ) : (
              rows.map((v, i) => (
                <tr key={v.id}>
                  <td className="num">{i + 1}</td>
                  <td>{v.dept || site}</td>
                  <td className="num">{v.date}</td>
                  <td className="num">{v.requesterRank}</td>
                  <td className="num">{v.requesterName}</td>
                  <td className="wrap">{v.reason}</td>
                  <td className="wrap">{v.result}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="foot">※ 중대재해처벌법 시행에 따른 작업중지권 실적 취합 — 총 {rows.length}건</p>
      </div>
    </div>
  );
}
