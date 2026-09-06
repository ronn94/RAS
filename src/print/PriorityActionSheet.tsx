/**
 * 우선조치 요청서 인쇄 서식 — 원본(Appendix 2) 재현. A4 세로 1장.
 *
 * 오른쪽 위에 발행번호·발행부서 상자를 두고, 사업장명~기타사항 표가 이어진다.
 * 아래 발행·협조 줄의 서명은 화면 서명이 있으면 이름 옆에 찍히고, 없으면 빈 칸이다.
 */
import { usePhotoUrl } from "@/components/photo";
import type { PriorityAction } from "@/lib/types";

function Sign({ id }: { id?: string }) {
  const url = usePhotoUrl(id);
  if (!url) return <span className="sign-hint">(서명)</span>;
  return <img className="sign-img" src={url} alt="서명" />;
}

function dateLine(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[1]}. ${m[2]}. ${m[3]}.` : date;
}

export function PriorityActionSheet({ action: v }: { action: PriorityAction }) {
  return (
    <div className="print-root sheet sheet-priority">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        <table className="head-box">
          <colgroup>
            <col style={{ width: "24mm" }} />
            <col style={{ width: "46mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">발행번호</td>
              <td className="num">{v.no}</td>
            </tr>
            <tr>
              <td className="lbl">발 행</td>
              <td>{v.issuedBy}</td>
            </tr>
          </tbody>
        </table>

        <div className="sheet-title">우선조치 요청서</div>

        <table>
          <colgroup>
            <col style={{ width: "28mm" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">사업장명</td>
              <td>{v.site}</td>
            </tr>
            <tr>
              <td className="lbl">
                대 표
                <br />
                (현장소장)
              </td>
              <td>{v.rep}</td>
            </tr>
            <tr>
              <td className="lbl">점검일시</td>
              <td className="num-left">{v.inspectedAt}</td>
            </tr>
            <tr>
              <td className="lbl">관련기준</td>
              <td className="wrap">{v.standard}</td>
            </tr>
            <tr>
              <td className="lbl">
                위반시
                <br />
                Penalty
              </td>
              <td className="wrap tall">{v.penalty}</td>
            </tr>
            <tr>
              <td className="lbl">확인내용</td>
              <td className="wrap tall">{v.finding}</td>
            </tr>
            <tr>
              <td className="lbl">요청사항</td>
              <td className="wrap taller">{v.request}</td>
            </tr>
            <tr>
              <td className="lbl">조치기간</td>
              <td className="num-left">{v.dueDate}</td>
            </tr>
            <tr>
              <td className="lbl">기타사항</td>
              <td className="wrap tall">{v.note}</td>
            </tr>
          </tbody>
        </table>

        <div className="sign-lines">
          <div className="sign-line">
            발 행 : {v.issuerName} <Sign id={v.issuerSign} />
          </div>
          <div className="sign-line">
            협 조 : {v.coopName} <Sign id={v.coopSign} />
          </div>
        </div>

        <div className="date-line">{dateLine(v.date)}</div>
      </div>
    </div>
  );
}
