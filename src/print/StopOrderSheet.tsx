/**
 * 작업중지명령서 인쇄 서식 — 원본(첨부2) 재현. A4 세로 1장, **현장 게시용**.
 *
 * 다른 서식과 달리 유일하게 색을 쓴다(노란 바탕·빨간 이중 테두리) — 멀리서도
 * 눈에 띄어야 하는 경고 게시물이라 색 자체가 기능이다. 인쇄할 때 브라우저의
 * '배경 그래픽' 옵션을 켜야 색이 나온다(`print-color-adjust: exact`로 최대한 강제한다).
 */
import type { StopWork } from "@/lib/types";
import { useStore } from "@/store";

/** 받침이 있으면 '은', 없으면 '는' — "…시설는"처럼 어긋나 보이지 않게 한다 */
function eunNeun(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "는";
  return (code - 0xac00) % 28 === 0 ? "는" : "은";
}

export function StopOrderSheet({ stopWork: v }: { stopWork: StopWork }) {
  const { settings } = useStore();
  const org = settings.org.orgName || settings.org.facility || "";
  /* 원본은 "리뉴어스㈜ ○○사업소는 …" — 회사명 + 소속이다.
     둘이 같은 값이면(기관명을 안 넣고 시설명만 쓰는 경우) 한 번만 쓴다 */
  const who = [org, v.dept].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.date);

  return (
    <div className="print-root sheet sheet-stoporder">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        <div className="frame">
          <div className="title">작업중지명령서</div>

          <p className="lead">
            아래 작업은 <strong>중대산업재해 발생 또는 발생할 급박한 위험</strong>이 있으므로 작업을 중지합니다.
          </p>

          <p className="sub">
            {who.length > 1 ? (
              <>
                {who[0]} <u>{who[1]}</u>
              </>
            ) : (
              <u>{who[0] || "○○○"}</u>
            )}
            {eunNeun(who[who.length - 1] || "")} 위험요인을 확인하고 필요한 안전보건 조치를 취한 후 충분히
            안전하다고 인정되는 경우 작업을 재개하도록 하겠습니다.
          </p>

          <table>
            <colgroup>
              <col style={{ width: "34mm" }} />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="lbl">작업중지범위</td>
                <td className="wrap">{v.orderScope || [v.process, v.workName].filter(Boolean).join(" · ")}</td>
              </tr>
              <tr>
                <td className="lbl tall">작업중지 사유</td>
                <td className="wrap tall">
                  {v.reason}
                  <div className="contact">
                    〮 담당자 : {v.orderManager}
                    <br />〮 연락처 : {v.orderPhone}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="date-line">
            {m ? `${Number(m[1])} 년   ${Number(m[2])} 월   ${Number(m[3])} 일` : "년       월       일"}
          </div>

          <div className="org">{org}</div>

          <p className="foot">
            {org}
            {eunNeun(org)} 중대재해 처벌 등에 관한 법률 및 산업안전보건법 의무를 준수하기 위해
            <br />
            작업중지제도를 적극 활용하고 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
