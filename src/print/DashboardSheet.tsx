/** 대시보드 보고서 — A4 세로 1장. 주간·월간 회의 자료용 */
import { daysLeft, type Metrics } from "@/lib/metrics";
import { riskBefore } from "@/lib/risk";
import { useStore } from "@/store";

export function DashboardSheet({ metrics: m, assessmentCount }: { metrics: Metrics; assessmentCount: number }) {
  const { settings } = useStore();
  const today = new Date().toLocaleDateString("ko-KR", { dateStyle: "long" });

  return (
    <div className="print-root sheet sheet-report">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        <div className="report-head">
          <div className="report-title">위험성평가 관리 현황</div>
          <div className="report-meta">
            {settings.org.orgName || settings.org.facility || ""} · 출력일 {today}
          </div>
        </div>

        <table className="stats">
          <tbody>
            <tr>
              <th>평가지표</th>
              <th>전체 집계건수</th>
              <th>개선 완료율</th>
              <th>기한 초과</th>
            </tr>
            <tr>
              <td className="num big">
                {assessmentCount}
                <span className="sub-note">개</span>
              </td>
              <td className="num big">
                {m.entries.length}
                <span className="sub-note">건 · 고위험군 {m.high.length}건</span>
              </td>
              <td className="num big">
                {m.completionRateAll}%
                <span className="sub-note">
                  전체 {m.doneAll}/{m.entries.length}건 · 고위험군 {m.completionRate}%
                </span>
              </td>
              <td className="num big">
                {m.overdue.length}
                <span className="sub-note">건 · 7일 내 임박 {m.soon.length}건</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="sec">개선기한 초과 항목</div>
        <table>
          <colgroup>
            <col style={{ width: "22mm" }} />
            <col style={{ width: "38mm" }} />
            <col />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "18mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th>평가코드</th>
              <th>공정</th>
              <th>유해위험요인</th>
              <th>개선예정일</th>
              <th>경과</th>
            </tr>
          </thead>
          <tbody>
            {m.overdue.length === 0 ? (
              <tr>
                <td colSpan={5} className="num">
                  기한을 넘긴 항목 없음
                </td>
              </tr>
            ) : (
              m.overdue.slice(0, 10).map((e) => (
                <tr key={e.row.id}>
                  <td className="num">{e.row.code || "-"}</td>
                  <td>{e.assessment.process}</td>
                  <td className="wrap">{e.row.hazard}</td>
                  <td className="num">{e.row.dueDate}</td>
                  <td className="num">{Math.abs(daysLeft(e.row.dueDate) ?? 0)}일</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="sec">위험분류별 고위험군 / 공정별 위험성 건수</div>
        <div className="two">
          <table>
            <thead>
              <tr>
                <th>위험분류</th>
                <th style={{ width: "18mm" }}>건수</th>
              </tr>
            </thead>
            <tbody>
              {m.byClass.slice(0, 8).map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="num">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <thead>
              <tr>
                <th>공정</th>
                <th style={{ width: "18mm" }}>건수</th>
              </tr>
            </thead>
            <tbody>
              {m.byProcess.map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="num">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sec">빈칸 점검</div>
        <table>
          <tbody>
            <tr>
              <td className="lbl" style={{ width: "45mm" }}>
                사진 미첨부 고위험군
              </td>
              <td className="num">{m.gaps.noPhoto.length}건</td>
            </tr>
            <tr>
              <td className="lbl">개선대책 미입력</td>
              <td className="num">{m.gaps.noMeasure.length}건</td>
            </tr>
            <tr>
              <td className="lbl">개선예정일 미지정</td>
              <td className="num">{m.gaps.noDue.length}건</td>
            </tr>
            <tr>
              <td className="lbl">유해위험정보 미작성 공정</td>
              <td className="num">{m.gaps.noHazardInfo.length}건</td>
            </tr>
          </tbody>
        </table>

        <div className="sec">7일 내 기한 임박</div>
        <table>
          <colgroup>
            <col style={{ width: "22mm" }} />
            <col style={{ width: "38mm" }} />
            <col />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "18mm" }} />
          </colgroup>
          <tbody>
            {m.soon.length === 0 ? (
              <tr>
                <td colSpan={5} className="num">
                  임박한 항목 없음
                </td>
              </tr>
            ) : (
              m.soon.slice(0, 8).map((e) => (
                <tr key={e.row.id}>
                  <td className="num">{e.row.code || "-"}</td>
                  <td>{e.assessment.process}</td>
                  <td className="wrap">{e.row.hazard}</td>
                  <td className="num">{e.row.dueDate}</td>
                  <td className="num">{riskBefore(e.row) ?? "-"}점</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
