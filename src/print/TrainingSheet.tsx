/**
 * 회의·교육 실시서 인쇄 서식 — 원본(SSI-602-03 / SSI-602-04) 재현. A4 세로 · 여백 15mm.
 *
 * 원본도 분량상 **1쪽 본문 + 2쪽 참석자 명단**으로 나뉘어 있어 그대로 따랐다.
 * 명단은 한 쪽에 소속·성명·서명 한 벌을 가로로 2세트(=46명) 싣고, 참석자가
 * 그보다 많으면 쪽을 더 붙인다. 적을 때는 빈 칸을 채워 종이 모양을 고정한다.
 *
 * 두 서식의 차이는 여기서 갈린다:
 * - 사전 교육·회의: 구분/비고 칸이 있고 교육내용·회의내용 두 줄, 사진 2칸
 * - 결과 교육: 구분·비고 없이 교육내용 한 줄, 사진 1칸
 */
import { photoUrl } from "@/lib/db";
import { headcountOf, trainingMinutes, type Training, type TrainingAttendee } from "@/lib/types";
import { useStore } from "@/store";

/** 한 쪽에 들어가는 명단 줄 수 (원본 서식과 같다) */
const ROWS_PER_PAGE = 23;
/** 명단은 소속·성명·서명 한 벌을 가로로 2세트 늘어놓는다 */
const ATTENDEE_COLS = 2;
const PER_PAGE = ROWS_PER_PAGE * ATTENDEE_COLS;

/** '년 월 일 시 분 ~ 시 분 (분)' — 원본 서식의 일시 칸 문구를 그대로 만든다 */
function whenText(v: Training): string {
  const [y, m, d] = (v.date || "").split("-");
  const date = y ? `${y}년 ${Number(m)}월 ${Number(d)}일` : "년    월    일";
  if (!v.startAt || !v.endAt) return `${date}  ${v.startAt || ""}${v.startAt ? " ~ " : ""}${v.endAt || ""}`.trimEnd();
  const minutes = trainingMinutes(v);
  return `${date}  ${v.startAt} ~ ${v.endAt}${minutes !== null ? ` (${minutes}분)` : ""}`;
}

/** 'YYYY년 MM월 DD일' — 명단 쪽 머리의 일자 칸 */
function dateText(date: string): string {
  const [y, m, d] = (date || "").split("-");
  return y ? `${y}년  ${m}월  ${d}일` : "";
}

export function TrainingSheet({ training: v }: { training: Training }) {
  const { settings } = useStore();
  const isPre = v.kind === "사전 교육·회의";
  const title = isPre ? "위험성평가 사전 교육·회의 실시서" : "위험성평가 결과 교육 실시서";
  const rosterTitle = isPre ? "위험성평가 사전 교육 · 회의 참석자 명단" : "위험성평가 결과 교육 참석자 명단";
  const photoCount = isPre ? 2 : 1;

  const approver = {
    charge: v.approver.charge || settings.org.approver.charge,
    review: v.approver.review || settings.org.approver.review,
    approve: v.approver.approve || settings.org.approver.approve,
  };

  // 명단 쪽 나누기 — 최소 한 쪽은 나온다(참석자가 없어도 빈 표를 찍어 손으로 받을 수 있게)
  const pageCount = Math.max(1, Math.ceil(v.attendees.length / PER_PAGE));
  const pages = Array.from({ length: pageCount }, (_, p) => v.attendees.slice(p * PER_PAGE, (p + 1) * PER_PAGE));

  return (
    <div className="print-root sheet sheet-training">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>

      {/* ── 1쪽: 본문 ── */}
      <div className="print-page">
        <table className="head">
          <colgroup>
            <col />
            <col style={{ width: "7mm" }} />
            <col style={{ width: "22mm" }} />
            <col style={{ width: "22mm" }} />
            <col style={{ width: "22mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="head-title" rowSpan={2}>
                {title}
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

        <table className="meta">
          <colgroup>
            <col style={{ width: "28mm" }} />
            <col />
            <col style={{ width: "26mm" }} />
            <col style={{ width: "40mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">{isPre ? "교육·회의일시" : "교육일시"}</td>
              <td className="num" colSpan={3}>
                {whenText(v)}
              </td>
            </tr>
            <tr>
              <td className="lbl" rowSpan={2}>
                {isPre ? "교육·회의장소" : "교육장소"}
              </td>
              <td rowSpan={2}>{v.place}</td>
              <td className="lbl">{isPre ? "교육강사\n(회의주관자)" : "교육강사"}</td>
              <td className="num">{v.instructor}</td>
            </tr>
            <tr>
              <td className="lbl">{isPre ? "참여인원" : "교육인원"}</td>
              <td className="num">{headcountOf(v) ? `${headcountOf(v)}명` : ""}</td>
            </tr>
          </tbody>
        </table>

        <table className="body">
          <colgroup>
            <col style={{ width: "18mm" }} />
            <col />
            {isPre && <col style={{ width: "26mm" }} />}
          </colgroup>
          {isPre && (
            <thead>
              <tr>
                <th>구 분</th>
                <th>교육 · 회의사항</th>
                <th>비 고</th>
              </tr>
            </thead>
          )}
          <tbody>
            <tr>
              <td className="lbl">
                교 육
                <br />내 용
              </td>
              <td className="wrap edu">{v.eduContent}</td>
              {/* 비고는 원본에서 칸이 세로로 이어져 있다 — 한 칸으로 합쳐 내용 줄들과 나란히 둔다 */}
              {isPre && (
                <td className="wrap" rowSpan={3}>
                  {v.note}
                </td>
              )}
            </tr>
            {isPre && (
              <tr>
                <td className="lbl">
                  회 의
                  <br />내 용
                </td>
                <td className="wrap meet">{v.meetContent}</td>
              </tr>
            )}
            <tr>
              <td className="lbl">
                {isPre ? "회 의" : "교 육"}
                <br />사 진
              </td>
              <td className="photos">
                <div className={`grid cols-${photoCount}`}>
                  {Array.from({ length: photoCount }, (_, i) => {
                    const id = v.photos[i];
                    return (
                      <div className="cell" key={i}>
                        {id ? <img src={photoUrl(id)} alt="" /> : null}
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 2쪽 이후: 참석자 명단 ── */}
      {pages.map((slice, p) => {
        const rows = Math.max(ROWS_PER_PAGE, Math.ceil(slice.length / ATTENDEE_COLS));
        return (
          <div className="print-page" key={p}>
            <table className="roster-head">
              <tbody>
                <tr>
                  <td className="lbl title">
                    {rosterTitle}
                    {pageCount > 1 ? ` (${p + 1}/${pageCount})` : ""}
                  </td>
                </tr>
              </tbody>
            </table>
            <table className="roster-date">
              <colgroup>
                <col />
                <col style={{ width: "60mm" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td>{isPre ? "일자 : " : "교육일시 : "}</td>
                  <td className="num">{dateText(v.date)}</td>
                </tr>
              </tbody>
            </table>

            <table className="roster">
              <colgroup>
                {Array.from({ length: ATTENDEE_COLS }, (_, i) => (
                  <col key={i} span={3} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {Array.from({ length: ATTENDEE_COLS }, (_, i) => (
                    <ColumnHead key={i} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, r) => (
                  <tr key={r}>
                    {Array.from({ length: ATTENDEE_COLS }, (_, c) => (
                      // 세로로 먼저 채운다 — 왼쪽 세트를 다 쓰고 오른쪽으로 넘어간다
                      <ColumnCells key={c} attendee={slice[c * rows + r]} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function ColumnHead() {
  return (
    <>
      <th>소 속</th>
      <th>성 명</th>
      <th>서 명</th>
    </>
  );
}

/** 서명은 받아 둔 그림이 있으면 찍고, 없으면 빈 칸으로 둬 인쇄 후 수기로 받을 수 있게 한다 */
function ColumnCells({ attendee }: { attendee?: TrainingAttendee }) {
  return (
    <>
      <td className="num">{attendee?.dept ?? ""}</td>
      <td className="num">{attendee?.name ?? ""}</td>
      <td className="sign-cell">{attendee?.sign ? <img src={photoUrl(attendee.sign)} alt="" /> : null}</td>
    </>
  );
}
