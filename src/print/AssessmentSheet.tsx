/**
 * 위험성 평가표 인쇄 서식 — 첨부 원본(위험성평가표.pdf) 구조 재현.
 * A4 가로 · 여백 15mm. 입력된 항목 수만큼만 출력하고, 여러 장이 되면
 * 머리말(컬럼)이 페이지마다 반복된다(thead 반복).
 */
import { riskAfter, riskBefore } from "@/lib/risk";
import type { Assessment } from "@/lib/types";
import { useStore } from "@/store";

export function AssessmentSheet({ assessment }: { assessment: Assessment }) {
  const { settings } = useStore();
  const rows = assessment.rows;
  const ap = {
    charge: assessment.approver.charge || settings.org.approver.charge,
    review: assessment.approver.review || settings.org.approver.review,
    approve: assessment.approver.approve || settings.org.approver.approve,
  };

  return (
    <div className="print-root sheet sheet-assessment">
      <style>{"@page{size:A4 landscape;margin:15mm}"}</style>
      <div className="print-page">
        {/* 머리말 — 대상시설·공정명·평가일시 / 제목 / 결재란 */}
        <table className="head">
          <colgroup>
            <col style={{ width: "20mm" }} />
            <col style={{ width: "28mm" }} />
            <col style={{ width: "138mm" }} />
            <col style={{ width: "7mm" }} />
            <col style={{ width: "24mm" }} />
            <col style={{ width: "24mm" }} />
            <col style={{ width: "24mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">대상시설</td>
              <td>{assessment.facility}</td>
              <td className="head-title" rowSpan={3}>
                위험성 평가표
              </td>
              <td className="lbl vert" rowSpan={3}>
                결<br />재
              </td>
              <th>담당</th>
              <th>검토</th>
              <th>승인</th>
            </tr>
            <tr>
              <td className="lbl">공 정 명</td>
              <td>{assessment.process}</td>
              <td className="sign" rowSpan={2}>
                {ap.charge}
              </td>
              <td className="sign" rowSpan={2}>
                {ap.review}
              </td>
              <td className="sign" rowSpan={2}>
                {ap.approve}
              </td>
            </tr>
            <tr>
              <td className="lbl">평가일시</td>
              <td>{assessment.date}</td>
            </tr>
          </tbody>
        </table>

        {/* 본표 */}
        <table className="body">
          <colgroup>
            <col style={{ width: "8mm" }} />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "12mm" }} />
            <col style={{ width: "38mm" }} />
            <col style={{ width: "32mm" }} />
            <col style={{ width: "11mm" }} />
            <col style={{ width: "11mm" }} />
            <col style={{ width: "11mm" }} />
            <col style={{ width: "18mm" }} />
            <col style={{ width: "33mm" }} />
            <col style={{ width: "16mm" }} />
            <col style={{ width: "11mm" }} />
            <col style={{ width: "11mm" }} />
            <col style={{ width: "11mm" }} />
            <col style={{ width: "22mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2}>No.</th>
              <th rowSpan={2}>세부공정</th>
              <th rowSpan={2}>
                위험
                <br />
                분류
              </th>
              <th rowSpan={2}>유해위험요인</th>
              <th rowSpan={2}>현재의 안전보건조치</th>
              <th colSpan={3}>
                현재 위험성
                <br />
                (5x4)
              </th>
              <th rowSpan={2} className="code-head">
                평가코드
                <br />
                (8등급이상)
                <br />
                연도.No-0
              </th>
              <th rowSpan={2}>개선대책</th>
              <th rowSpan={2}>개선예정일</th>
              <th colSpan={3}>개선 후 위험성</th>
              <th rowSpan={2}>
                비고
                <br />
                <span className="sub">(종사자 의견 등)</span>
              </th>
            </tr>
            <tr>
              <th>가능성</th>
              <th>중대성</th>
              <th>위험성</th>
              <th>가능성</th>
              <th>중대성</th>
              <th>위험성</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="num">{i + 1}</td>
                <td className="wrap">{r.subProcess}</td>
                <td className="num">{r.hazardClass}</td>
                <td className="wrap">{r.hazard}</td>
                <td className="wrap">{r.currentControl}</td>
                <td className="num">{r.p ?? ""}</td>
                <td className="num">{r.s ?? ""}</td>
                <td className="num">{riskBefore(r) ?? ""}</td>
                <td className="num">{r.code}</td>
                <td className="wrap">{r.measure}</td>
                <td className="num">{r.dueDate}</td>
                <td className="num">{r.p2 ?? ""}</td>
                <td className="num">{r.s2 ?? ""}</td>
                <td className="num">{riskAfter(r) ?? ""}</td>
                <td className="wrap">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
