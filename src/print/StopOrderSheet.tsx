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
  /* 게시물에 찍히는 이름은 **법인명**이다(설정 → 기관명). 사업소·시설명이 아니라
     "리뉴어스(주)"처럼 법적 책임 주체를 적는 서식이라, 기관명이 비었을 때만 시설명으로 대신한다 */
  const org = settings.org.orgName || settings.org.facility || "";
  /* 원본의 밑줄(______) 자리 — 위험요인을 확인하고 조치할 사람, 즉 요청자 성명이 들어간다.
     비어 있으면 빈 밑줄로 나가 인쇄 후 손으로 적을 수 있다 */
  const who = v.requesterName;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.date);

  return (
    <div className="print-root sheet sheet-stoporder">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        <div className="frame">
          <div className="title">작업중지명령서</div>

          <p className="lead">
            아래 작업은 <strong>중대산업재해 발생 또는 발생할 급박한 위험</strong>이 있으므로
            <br />
            작업을 중지합니다.
          </p>

          <p className="sub">
            {org} <u className="blank">{who || "\u00a0".repeat(10)}</u>
            {eunNeun(who)} 위험요인을 확인하고 필요한 안전보건 조치를 취한 후 충분히 안전하다고 인정되는
            경우 작업을 재개하도록 하겠습니다.
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
                {/* 라벨은 칸 세로 가운데, 사유 본문은 왼쪽 위 — 글이 길어져도 읽는 자리가 안 바뀐다.
                    담당자·연락처는 같은 칸 맨 아래로 붙인다(내용이 짧아도 자리가 고정된다) */}
                <td className="lbl tall mid">작업중지 사유</td>
                <td className="tall">
                  <div className="reason-cell">
                    <div className="wrap">{v.reason}</div>
                    <div className="contact">
                      ○ 담당자 : {v.orderManager}
                      <br />○ 연락처 : {v.orderPhone}
                    </div>
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
