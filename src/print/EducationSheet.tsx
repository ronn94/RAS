/**
 * 안전보건교육일지 인쇄 서식 — A4 세로.
 *
 * 현장에서 쓰던 종이 서식(교육일지.pdf)을 그대로 옮겼다. 1쪽은 교육일지(결재란 +
 * 교육일시·구분·인원·목표·자료·내용·실시자·특이사항), 2쪽부터는 참석자 명단이다.
 *
 * 명단은 원본과 같이 **한 쪽에 12줄 × 2벌(24칸)**이다. TBM처럼 줄 높이를 실측해
 * 나눌 필요가 없다 — 칸 수가 서식으로 고정돼 있어 24명마다 쪽을 더하면 그만이다.
 * 사람이 적어도 12줄은 그대로 찍어, 인쇄 후 수기로 채울 자리를 남긴다.
 */
import { photoUrl } from "@/lib/db";
import {
  EDUCATION_MATERIALS,
  educationCounts,
  educationMinutes,
  educationTopicLines,
  type Education,
  type EducationAttendee,
} from "@/lib/routine";
import { useStore } from "@/store";

/** 한 쪽에 들어가는 명단 줄 수(좌·우 두 벌이라 한 쪽은 그 두 배가 들어간다) */
const LIST_ROWS = 12;
const PER_PAGE = LIST_ROWS * 2;

/** 2026-09-14 → 2026년 09월 14일 (빈 값이면 서식처럼 00을 남긴다) */
function korDate(date: string): string {
  const [y, m, d] = (date || "").split("-");
  return `${y || "    "}년 ${m || "00"}월 ${d || "00"}일`;
}

/** 09:15 → 09시 15분 */
function korTime(time: string): string {
  const [h, m] = (time || "").split(":");
  return `${h || "00"}시 ${m || "00"}분`;
}

/** 결재란 — 원본처럼 오른쪽 위에 담당·팀장·소장 세 칸 */
function Approval({ charge, team, chief }: { charge: string; team: string; chief: string }) {
  return (
    <table className="approval">
      <colgroup>
        <col style={{ width: "8mm" }} />
        <col style={{ width: "20mm" }} />
        <col style={{ width: "20mm" }} />
        <col style={{ width: "20mm" }} />
      </colgroup>
      <tbody>
        <tr>
          <td rowSpan={2} className="lbl vertical">
            결재
          </td>
          <td className="lbl">담 당</td>
          <td className="lbl">팀 장</td>
          <td className="lbl">소 장</td>
        </tr>
        <tr>
          <td className="sign-box">{charge}</td>
          <td className="sign-box">{team}</td>
          <td className="sign-box">{chief}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** 1쪽 본문 — 교육일지 표.
 *
 * 한 장에 명단까지 담아야 해서, 여러 칸으로 갈리는 자리(교육인원·교육자료·실시자)는
 * 바깥 표의 열을 쪼개지 않고 **칸 안에 표·격자를 한 겹 더** 둔다. 그래야 바깥 열 너비에
 * 끌려가지 않고 구간마다 폭을 똑같이 나눌 수 있다. */
function Journal({ v, staffCount }: { v: Education; staffCount: number }) {
  const counts = educationCounts(v, staffCount);
  const minutes = educationMinutes(v);
  const topics = educationTopicLines(v);

  return (
    <table className="journal">
      <colgroup>
        <col style={{ width: "24mm" }} />
        <col />
      </colgroup>
      <tbody>
        <tr>
          <td className="lbl">교육일시</td>
          <td className="center row-1">
            {korDate(v.date)}　　{korTime(v.startTime)} ~ {korTime(v.endTime)}
            {minutes > 0 ? ` (${minutes}분)` : ""}
          </td>
        </tr>
        <tr>
          <td className="lbl">교 육 구 분</td>
          <td className="row-kind">■ {v.category}</td>
        </tr>
        <tr>
          <td className="lbl">교 육 인 원</td>
          <td className="nest">
            {/* 세 항목을 머리행으로 눕히고 숫자는 그 아래 한 줄에 — 2행 3열, 폭은 3등분 */}
            <table className="nested counts">
              <colgroup>
                <col style={{ width: "33.33%" }} />
                <col style={{ width: "33.33%" }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lbl">교육대상자수</td>
                  <td className="lbl">교육실시자수</td>
                  <td className="lbl">교육미실시자수</td>
                </tr>
                <tr>
                  <td className="center num">{counts.target}</td>
                  <td className="center num">{counts.done}</td>
                  <td className="center num">{counts.undone}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td className="lbl">교육목표</td>
          <td className="row-1">{v.goal}</td>
        </tr>
        <tr>
          <td className="lbl">교육자료</td>
          <td className="nest">
            {/* 네 가지를 정확히 4등분해 이름 옆에 ○ 자리를 둔다 */}
            <table className="nested materials">
              <colgroup>
                {EDUCATION_MATERIALS.map((m) => (
                  <col key={m} style={{ width: "25%" }} />
                ))}
              </colgroup>
              <tbody>
                <tr>
                  {EDUCATION_MATERIALS.map((m) => (
                    <td key={m} className="center">
                      {m}
                      <span className="material-mark">{v.materials.includes(m) ? "○" : ""}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td className="lbl">교 육 내 용</td>
          {/* 줄이 많아 한 열로 세우면 한 장을 넘긴다 — 두 열로 접어 높이를 반으로 줄인다 */}
          <td className="topics">
            <div className="topic-grid">
              {topics.map((t, i) => (
                <div key={i} className="topic">
                  <span>• {t.text}</span>
                  {t.note.trim() && <div className="topic-note">({t.note})</div>}
                </div>
              ))}
            </div>
          </td>
        </tr>
        <tr>
          <td className="lbl">
            교 육
            <br />
            실시자
            <br />및 장소
          </td>
          <td className="nest">
            <table className="nested doer">
              <colgroup>
                <col style={{ width: "33.33%" }} />
                <col style={{ width: "33.33%" }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lbl">직　　명</td>
                  <td className="lbl">성　　명</td>
                  <td className="lbl">교육실시 장소</td>
                </tr>
                <tr>
                  <td className="center">{v.instructorRole}</td>
                  <td className="center">{v.instructorName}</td>
                  <td className="center">{v.place}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td className="lbl">특이사항</td>
          <td className="wrap remark">{v.remark}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** 참석자 한 칸 — 연번·소속·성명·서명 */
function AttendeeCells({ no, a }: { no: number; a?: EducationAttendee }) {
  return (
    <>
      <td className="center no">{no}</td>
      <td className="center">{a?.dept ?? ""}</td>
      <td className="center">{a?.name ?? ""}</td>
      <td className="sign-cell">{a?.sign ? <img src={photoUrl(a.sign)} alt="" /> : null}</td>
    </>
  );
}

/** 참석자 명단 — 좌 1~12, 우 13~24 두 벌을 나란히 둔다(원본과 같은 모양) */
function AttendeeList({ attendees, offset }: { attendees: EducationAttendee[]; offset: number }) {
  return (
    <table className="attendees">
      <colgroup>
        <col style={{ width: "11mm" }} />
        <col style={{ width: "26mm" }} />
        <col style={{ width: "26mm" }} />
        <col style={{ width: "30mm" }} />
        <col style={{ width: "11mm" }} />
        <col style={{ width: "26mm" }} />
        <col style={{ width: "26mm" }} />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th>연번</th>
          <th>소 속</th>
          <th>성 명</th>
          <th>서 명</th>
          <th>연번</th>
          <th>소 속</th>
          <th>성 명</th>
          <th>서 명</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: LIST_ROWS }, (_, i) => (
          <tr key={i}>
            <AttendeeCells no={offset + i + 1} a={attendees[i]} />
            <AttendeeCells no={offset + LIST_ROWS + i + 1} a={attendees[LIST_ROWS + i]} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 24명씩 끊은 명단 쪽 — 사람이 없어도 빈 명단 한 쪽은 남긴다 */
function listPages(attendees: EducationAttendee[]): EducationAttendee[][] {
  if (attendees.length === 0) return [[]];
  const pages: EducationAttendee[][] = [];
  for (let i = 0; i < attendees.length; i += PER_PAGE) pages.push(attendees.slice(i, i + PER_PAGE));
  return pages;
}

export function EducationSheet({ education: v }: { education: Education }) {
  const { settings } = useStore();
  const pages = listPages(v.attendees);
  const { charge, review, approve } = settings.org.approver;

  return (
    <div className="print-root sheet sheet-education">
      <style>{"@page{size:A4 portrait;margin:13mm 12mm 15mm}"}</style>
      {/* 교육일지와 참석자 명단을 한 장에 담는다 — 24명까지는 이 한 쪽으로 끝난다 */}
      <div className="print-page">
        <div className="head">
          <div className="sheet-title">안전보건교육일지</div>
          <Approval charge={charge} team={review} chief={approve} />
        </div>
        <div className="subject">교육제목 : {v.title}</div>
        <Journal v={v} staffCount={settings.staff.length} />
        <div className="list-title">
          안전보건교육 참석자 명단
          {pages.length > 1 ? <span className="page-no"> (1/{pages.length})</span> : null}
        </div>
        <AttendeeList attendees={pages[0]} offset={0} />
      </div>
      {/* 25명째부터는 명단만 쪽을 더한다 */}
      {pages.slice(1).map((chunk, i) => (
        <div className="print-page" key={i}>
          <div className="list-title">
            안전보건교육 참석자 명단
            <span className="page-no"> ({i + 2}/{pages.length})</span>
          </div>
          <AttendeeList attendees={chunk} offset={(i + 1) * PER_PAGE} />
        </div>
      ))}
    </div>
  );
}

/**
 * 미리보기 화면용 — 쪽을 나누지 않고 이어서 보여준다.
 * `.print-root`가 아니라 인쇄에는 찍히지 않는다(실제 인쇄물은 EducationSheet가 맡는다).
 */
export function EducationContinuousSheet({ education: v }: { education: Education }) {
  const { settings } = useStore();
  const pages = listPages(v.attendees);
  const { charge, review, approve } = settings.org.approver;

  return (
    <div className="sheet sheet-education">
      <div className="print-page">
        <div className="head">
          <div className="sheet-title">안전보건교육일지</div>
          <Approval charge={charge} team={review} chief={approve} />
        </div>
        <div className="subject">교육제목 : {v.title}</div>
        <Journal v={v} staffCount={settings.staff.length} />
        <div className="list-title">안전보건교육 참석자 명단</div>
        {pages.map((chunk, p) => (
          <AttendeeList key={p} attendees={chunk} offset={p * PER_PAGE} />
        ))}
      </div>
    </div>
  );
}
