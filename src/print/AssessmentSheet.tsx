/**
 * 위험성 평가표 인쇄 서식 — 첨부 원본(위험성평가표.pdf) 구조 재현.
 * A4 가로 · 여백 15mm. 페이지마다 머리말(대상시설·공정명·결재란)과 컬럼 헤더를
 * 통째로 반복하기 위해, 페이지 수만큼 독립된 완전한 표를 그린다.
 *
 * 페이지를 나누는 기준은 **행 개수가 아니라 실제 높이**다. 행 높이는 내용이
 * 몇 줄로 줄바꿈되느냐에 따라 11mm~40mm 넘게까지 달라지기 때문에, 고정 행수로
 * 자르면 묶음이 한 장을 넘쳐 브라우저가 페이지를 강제로 쪼갠다. 그러면
 *   ① 잘린 조각에는 머리말 표가 안 찍히고
 *   ② Chrome이 조각의 세로 테두리를 누락시킨다
 * 두 증상이 한꺼번에 나온다. 그래서 화면 밖에서 한 번 재보고 나눈다.
 */
import * as React from "react";
import { riskAfter, riskBefore } from "@/lib/risk";
import type { Assessment, RiskItem } from "@/lib/types";
import { useStore } from "@/store";

/** A4 가로 210mm − 상하 여백 15mm×2 */
const PAGE_CONTENT_MM = 180;
/** 반올림 오차로 한 줄이 넘치는 것을 막는 여유 */
const SAFETY_MM = 3;
const PX_PER_MM = 96 / 25.4;

function HeadTable({
  assessment,
  approver,
}: {
  assessment: Assessment;
  approver: { charge: string; review: string; approve: string };
}) {
  return (
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
            {approver.charge}
          </td>
          <td className="sign" rowSpan={2}>
            {approver.review}
          </td>
          <td className="sign" rowSpan={2}>
            {approver.approve}
          </td>
        </tr>
        <tr>
          <td className="lbl">평가일시</td>
          <td>{assessment.date}</td>
        </tr>
      </tbody>
    </table>
  );
}

function BodyTable({ rows, startNo }: { rows: RiskItem[]; startNo: number }) {
  return (
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
            <td className="num">{startNo + i}</td>
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
  );
}

export function AssessmentSheet({ assessment }: { assessment: Assessment }) {
  const { settings } = useStore();
  const approver = {
    charge: assessment.approver.charge || settings.org.approver.charge,
    review: assessment.approver.review || settings.org.approver.review,
    approve: assessment.approver.approve || settings.org.approver.approve,
  };

  const measureRef = React.useRef<HTMLDivElement>(null);
  const [pages, setPages] = React.useState<RiskItem[][] | null>(null);

  // 내용이 바뀌면 다시 재야 한다(줄바꿈이 달라지면 행 높이도 달라진다)
  const signature = JSON.stringify(assessment.rows);
  React.useLayoutEffect(() => {
    setPages(null);
  }, [signature]);

  React.useLayoutEffect(() => {
    if (pages !== null) return;
    const el = measureRef.current;
    if (!el) return;

    const height = (node: Element | null) => node?.getBoundingClientRect().height ?? 0;
    const available =
      (PAGE_CONTENT_MM - SAFETY_MM) * PX_PER_MM - height(el.querySelector(".head")) - height(el.querySelector(".body thead"));

    const trs = [...el.querySelectorAll<HTMLTableRowElement>(".body tbody tr")];
    const chunks: RiskItem[][] = [];
    let current: RiskItem[] = [];
    let used = 0;

    trs.forEach((tr, i) => {
      const h = tr.getBoundingClientRect().height;
      // 한 행이 통째로 한 장보다 클 때는 어차피 쪼개지므로 혼자 한 페이지를 쓰게 둔다
      if (current.length > 0 && used + h > available) {
        chunks.push(current);
        current = [];
        used = 0;
      }
      current.push(assessment.rows[i]);
      used += h;
    });
    if (current.length > 0) chunks.push(current);

    setPages(chunks.length > 0 ? chunks : [[]]);
  }, [pages, signature, assessment.rows]);

  // 1단계: 전체 행을 한 번에 그려 높이를 잰다(화면 밖이라 사용자에게는 안 보인다)
  if (pages === null) {
    return (
      <div className="print-root sheet sheet-assessment" ref={measureRef} aria-hidden>
        <div className="print-page">
          <HeadTable assessment={assessment} approver={approver} />
          <BodyTable rows={assessment.rows} startNo={1} />
        </div>
      </div>
    );
  }

  // 2단계: 잰 높이대로 나눈 페이지를 그린다.
  // No.는 페이지가 넘어가도 이어져야 하므로 앞 페이지들의 행 수를 누적해 시작 번호를 구한다.
  const startNos = pages.reduce<number[]>((acc, _page, i) => {
    acc.push(i === 0 ? 1 : acc[i - 1] + pages[i - 1].length);
    return acc;
  }, []);

  return (
    <div className="print-root sheet sheet-assessment">
      <style>{"@page{size:A4 landscape;margin:15mm}"}</style>
      {pages.map((pageRows, i) => (
        <div key={i} className="print-page">
          <HeadTable assessment={assessment} approver={approver} />
          <BodyTable rows={pageRows} startNo={startNos[i]} />
        </div>
      ))}
    </div>
  );
}
