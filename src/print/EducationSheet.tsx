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

/** 1쪽 본문 — 교육일지 표 */
function Journal({ v, staffCount }: { v: Education; staffCount: number }) {
  const counts = educationCounts(v, staffCount);
  const minutes = educationMinutes(v);
  const topics = educationTopicLines(v);

  return (
    <table className="journal">
      <colgroup>
        <col style={{ width: "22mm" }} />
        <col style={{ width: "34mm" }} />
        <col style={{ width: "22mm" }} />
        <col style={{ width: "22mm" }} />
        <col style={{ width: "22mm" }} />
        <col />
      </colgroup>
      <tbody>
        <tr>
          <td className="lbl">교육일시</td>
          <td colSpan={5} className="center">
            {korDate(v.date)}　　{korTime(v.startTime)} ~ {korTime(v.endTime)}
            {minutes > 0 ? ` (${minutes}분)` : ""}
          </td>
        </tr>
        <tr>
          <td className="lbl tall">교 육 구 분</td>
          <td colSpan={5}>■ {v.category}</td>
        </tr>
        <tr>
          <td className="lbl" rowSpan={4}>
            교 육 인 원
          </td>
          <td className="lbl">구　　분</td>
          <td className="lbl" colSpan={2}>
            계
          </td>
          <td className="lbl" colSpan={2}>
            비 고
          </td>
        </tr>
        <tr>
          <td className="center">교육대상자수</td>
          <td className="center num" colSpan={2}>
            {counts.target}
          </td>
          <td className="wrap" colSpan={2} rowSpan={3}>
            {v.countNote}
          </td>
        </tr>
        <tr>
          <td className="center">교육실시자수</td>
          <td className="center num" colSpan={2}>
            {counts.done}
          </td>
        </tr>
        <tr>
          <td className="center">교육미실시자수</td>
          <td className="center num" colSpan={2}>
            {counts.undone}
          </td>
        </tr>
        <tr>
          <td className="lbl">교육목표</td>
          <td colSpan={5}>{v.goal}</td>
        </tr>
        <tr>
          <td className="lbl">교육자료</td>
          {EDUCATION_MATERIALS.map((m) => (
            <td key={m} className="material">
              <span className="material-name">{m}</span>
              <span className="material-mark">{v.materials.includes(m) ? "○" : ""}</span>
            </td>
          ))}
          <td />
        </tr>
        <tr>
          <td className="lbl">교 육 내 용</td>
          <td colSpan={5} className="topics">
            {topics.map((t, i) => (
              <div key={i}>
                <span>• {t.text}</span>
                {t.note.trim() && <div className="topic-note">({t.note})</div>}
              </div>
            ))}
          </td>
        </tr>
        <tr>
          <td className="lbl" rowSpan={2}>
            교 육
            <br />
            실시자
            <br />및 장소
          </td>
          <td className="lbl" colSpan={2}>
            직　　명
          </td>
          <td className="lbl">성　　명</td>
          <td className="lbl" colSpan={2}>
            교육실시 장소
          </td>
        </tr>
        <tr>
          <td className="center" colSpan={2}>
            {v.instructorRole}
          </td>
          <td className="center">{v.instructorName}</td>
          <td className="center" colSpan={2}>
            {v.place}
          </td>
        </tr>
        <tr>
          <td className="lbl remark-label">
            특 이
            <br />사 항
          </td>
          <td colSpan={5} className="wrap remark">
            {v.remark}
          </td>
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
      <div className="print-page">
        <div className="head">
          <div className="sheet-title">안전보건교육일지</div>
          <Approval charge={charge} team={review} chief={approve} />
        </div>
        <div className="subject">교육제목 : {v.title}</div>
        <Journal v={v} staffCount={settings.staff.length} />
      </div>
      {pages.map((chunk, p) => (
        <div className="print-page" key={p}>
          <div className="sheet-title list-title">
            안전보건교육 참석자 명단
            {pages.length > 1 ? <span className="page-no"> ({p + 1}/{pages.length})</span> : null}
          </div>
          <AttendeeList attendees={chunk} offset={p * PER_PAGE} />
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
        <div className="sheet-title list-title">안전보건교육 참석자 명단</div>
        {pages.map((chunk, p) => (
          <AttendeeList key={p} attendees={chunk} offset={p * PER_PAGE} />
        ))}
      </div>
    </div>
  );
}
