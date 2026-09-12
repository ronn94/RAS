/**
 * 작업 위험성평가 인쇄 서식 — 원본 프로그램의 출력물을 A4 **가로**로 재현한다.
 *
 * 세부내역 표가 16칸이라 세로로는 글자가 읽을 수 없을 만큼 작아진다. 구성은 원본과 같이
 * ①개요 및 일반정보 ②작업 전 준비사항 ③위험성평가 세부내역 3단이고, 다른 인쇄물과
 * 맞추려고 상단에 결재란(담당·검토·승인)을 더했다.
 *
 * 세부내역이 길면 쪽을 이어 붙인다 — 이어지는 쪽에는 표 머리만 다시 얹는다.
 */
import { photoUrl } from "@/lib/db";
import { codeLabel } from "@/lib/settings";
import { riskOf } from "@/lib/risk";
import {
  FINISH_ITEMS,
  jraLabel,
  PRE_JOB_ITEMS,
  type JobAssessment,
  type JobRow,
} from "@/lib/jobAssessment";
import { useStore } from "@/store";

/** 한 쪽에 싣는 세부내역 줄 수 — 줄마다 높이가 달라 넉넉히 잡았다 */
const ROWS_PER_PAGE = 12;

export function JobAssessmentSheet({ job: v }: { job: JobAssessment }) {
  const { settings } = useStore();
  const approver = {
    charge: v.approver.charge || settings.org.approver.charge,
    review: v.approver.review || settings.org.approver.review,
    approve: v.approver.approve || settings.org.approver.approve,
  };
  const threshold = settings.risk.threshold;

  const internal = v.participants.filter((p) => !p.external);
  const external = v.participants.filter((p) => p.external);
  const nameOf = (p: (typeof v.participants)[number]) => (p.undecided ? "(미정)" : p.name || "-");

  const pageCount = Math.max(1, Math.ceil(v.rows.length / ROWS_PER_PAGE));
  const pages = Array.from({ length: pageCount }, (_, i) => v.rows.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE));

  return (
    <div className="print-root sheet sheet-job">
      <style>{"@page{size:A4 landscape;margin:15mm}"}</style>
      {pages.map((slice, p) => (
        <div className="print-page" key={p}>
          {/* 제목 + 결재란 */}
          <table className="head">
            <colgroup>
              <col />
              <col style={{ width: "9mm" }} />
              <col style={{ width: "24mm" }} />
              <col style={{ width: "24mm" }} />
              <col style={{ width: "24mm" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="head-title" rowSpan={2}>
                  작업 위험성평가
                  <span className="eval-type">{v.evalType}</span>
                  {pageCount > 1 ? <span className="page-no"> ({p + 1}/{pageCount})</span> : null}
                </td>
                <td className="lbl vert" rowSpan={2}>
                  결<br />재
                </td>
                <th>담 당</th>
                <th>검 토</th>
                <th>승 인</th>
              </tr>
              <tr>
                <td className="sign">{approver.charge}</td>
                <td className="sign">{approver.review}</td>
                <td className="sign">{approver.approve}</td>
              </tr>
            </tbody>
          </table>

          {/* 머리 정보는 첫 쪽에만 — 이어지는 쪽은 세부내역만 싣는다 */}
          {p === 0 && (
            <>
              <div className="sec">1. 개요 및 일반정보</div>
              <table className="meta">
                <colgroup>
                  <col style={{ width: "22mm" }} />
                  <col />
                  <col style={{ width: "22mm" }} />
                  <col />
                  <col style={{ width: "22mm" }} />
                  <col />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="lbl">대분류</td>
                    <td>{v.mainCategory}</td>
                    <td className="lbl">중분류</td>
                    <td>{v.subCategory}</td>
                    <td className="lbl">세분류</td>
                    <td>{v.detailCategory}</td>
                  </tr>
                  <tr>
                    <td className="lbl">상세내용</td>
                    <td colSpan={3}>{v.content}</td>
                    <td className="lbl">JRA 등급</td>
                    <td className="num strong">{jraLabel(v)}</td>
                  </tr>
                  <tr>
                    <td className="lbl">평가일자</td>
                    <td className="num">{v.date}</td>
                    <td className="lbl">평가자</td>
                    <td className="seal">{v.evaluator}</td>
                    <td className="lbl">승인자</td>
                    <td className="seal">{v.approvedBy}</td>
                  </tr>
                  <tr>
                    <td className="lbl">내부 참여자</td>
                    <td colSpan={5} className="wrap">
                      {internal.length ? internal.map(nameOf).join(" · ") : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl">외부 참여자</td>
                    <td colSpan={5} className="wrap">
                      {external.length ? external.map(nameOf).join(" · ") : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="sec">2. 작업 전 준비사항</div>
              <table className="prejob">
                <tbody>
                  {[0, 1, 2].map((r) => (
                    <tr key={r}>
                      {PRE_JOB_ITEMS.slice(r * 3, r * 3 + 3).map((item) => (
                        <td key={item}>
                          <span className="box">{v.preJobs.includes(item) ? "■" : "□"}</span> {item}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 서명을 받았으면 참여자 서명표를 함께 싣는다(받지 않았으면 빈 칸으로 수기) */}
              <table className="signs">
                <tbody>
                  <tr>
                    <td className="lbl">참여자 서명</td>
                    {v.participants.slice(0, 6).map((pt) => (
                      <td key={pt.id} className="sign-cell">
                        <div className="who">{nameOf(pt)}</div>
                        {pt.sign ? <img src={photoUrl(pt.sign)} alt="" /> : <div className="blank" />}
                      </td>
                    ))}
                    {/* 여섯 칸을 채워 표 모양을 고정한다 */}
                    {Array.from({ length: Math.max(0, 6 - v.participants.length) }, (_, i) => (
                      <td key={`pad-${i}`} className="sign-cell">
                        <div className="who">&nbsp;</div>
                        <div className="blank" />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <div className="sec">3. 위험성평가 세부내역</div>
            </>
          )}

          <table className="matrix">
            <colgroup>
              <col style={{ width: "7mm" }} />
              <col style={{ width: "26mm" }} />
              <col style={{ width: "24mm" }} />
              <col style={{ width: "22mm" }} />
              <col style={{ width: "28mm" }} />
              <col style={{ width: "48mm" }} />
              <col style={{ width: "8mm" }} />
              <col style={{ width: "8mm" }} />
              <col style={{ width: "8mm" }} />
              <col style={{ width: "14mm" }} />
              <col style={{ width: "40mm" }} />
              <col style={{ width: "8mm" }} />
              <col style={{ width: "8mm" }} />
              <col style={{ width: "8mm" }} />
              <col style={{ width: "14mm" }} />
              <col style={{ width: "24mm" }} />
            </colgroup>
            <thead>
              <tr>
                <th>No</th>
                <th>공정/순서</th>
                <th>보호구</th>
                <th>위험분류</th>
                <th>위험요인</th>
                <th>현재 조치사항</th>
                <th>강도</th>
                <th>빈도</th>
                <th>등급</th>
                <th>허용여부</th>
                <th>위험감소대책</th>
                <th>조치후 강도</th>
                <th>조치후 빈도</th>
                <th>조치후 등급</th>
                <th>담당자</th>
                <th>종사자의견</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => (
                <MatrixRow
                  key={r.id}
                  row={r}
                  no={p * ROWS_PER_PAGE + i + 1}
                  threshold={threshold}
                  settings={settings}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function MatrixRow({
  row,
  no,
  threshold,
  settings,
}: {
  row: JobRow;
  no: number;
  threshold: number;
  settings: ReturnType<typeof useStore>["settings"];
}) {
  if (row.kind === "finish") {
    // 작업종료 행은 점수 칸을 비우고 마무리 확인 항목만 싣는다
    return (
      <tr className="finish">
        <td className="num">{no}</td>
        <td className="strong">작업 완료</td>
        <td colSpan={8} />
        <td className="wrap">
          {FINISH_ITEMS.map((item) => (
            <span key={item} className="chk">
              {row.finishItems.includes(item) ? "■" : "□"} {item}
            </span>
          ))}
        </td>
        <td colSpan={3} />
        <td className="num">{row.owner}</td>
        <td className="wrap">{row.opinion}</td>
      </tr>
    );
  }

  const risk = riskOf(row.p, row.s);
  const post = riskOf(row.p2, row.s2);
  const ppes = [...row.ppes, ...(row.ppeEtc ? [row.ppeEtc] : [])];
  const actions = [...row.actions, ...row.customActions.filter(Boolean)];

  return (
    <tr>
      <td className="num">{no}</td>
      <td className="wrap">{row.stepName}</td>
      <td className="wrap tiny">{ppes.join(", ")}</td>
      <td className="wrap tiny">{row.hazardCode ? codeLabel(settings, row.hazardCode) : ""}</td>
      <td className="wrap">{row.factor}</td>
      <td className="wrap tiny">
        {actions.map((a) => (
          <span key={a} className="chk">
            ■ {a}
          </span>
        ))}
      </td>
      <td className="num">{row.s ?? ""}</td>
      <td className="num">{row.p ?? ""}</td>
      <td className="num strong">{risk ?? ""}</td>
      <td className={`num ${risk !== null && risk >= threshold ? "deny" : "allow"}`}>
        {risk === null ? "" : risk >= threshold ? "허용 불가능" : "허용 가능"}
      </td>
      <td className="wrap">{row.measure}</td>
      <td className="num">{row.s2 ?? ""}</td>
      <td className="num">{row.p2 ?? ""}</td>
      <td className="num strong">{post ?? ""}</td>
      <td className="num">{row.owner}</td>
      <td className="wrap tiny">{row.opinion}</td>
    </tr>
  );
}
