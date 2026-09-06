/**
 * 작업중지 요청서 인쇄 서식 — 원본(첨부1) 구조 재현. A4 세로 1장.
 *
 * 오른쪽 위에 접수번호·접수자 상자를 두고, 아래로 소속~기타사항 표가 이어진다.
 * 요청자 칸의 (서명)은 화면에서 손으로 그린 서명 이미지가 있으면 그 자리에 찍히고,
 * 없으면 빈 칸으로 나가 인쇄 후 수기로 받을 수 있다.
 */
import { usePhotoUrl } from "@/components/photo";
import { STOPWORK_PHOTO_LABELS, stopMinutes, type StopWork } from "@/lib/types";
import { useStore } from "@/store";

/** 서명 이미지 — 배경이 투명한 PNG라 표 실선 위에 그대로 얹힌다 */
function Sign({ id }: { id?: string }) {
  const url = usePhotoUrl(id);
  if (!url) return <span className="sign-hint">(서명)</span>;
  return <img className="sign-img" src={url} alt="서명" />;
}

function Photo({ id, name }: { id?: string; name: string }) {
  const url = usePhotoUrl(id);
  return (
    <div className="photo">
      <div className="cap">{name}</div>
      <div className="frame">{url ? <img src={url} alt={name} /> : <div className="empty">{name} 사진</div>}</div>
    </div>
  );
}

/** 날짜 `2025-05-16` → `2025.  05.  16.` (원본 서식의 표기) */
function dateLine(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[1]}.  ${m[2]}.  ${m[3]}.` : date;
}

export function StopWorkSheet({ stopWork: v }: { stopWork: StopWork }) {
  const { settings } = useStore();
  const minutes = stopMinutes(v);
  const hasPhoto = v.photos.some(Boolean);

  /** 기타사항 — 중지·재개 시각이 있으면 총 중지시간을 자동으로 덧붙인다 */
  const timeLine = v.stoppedAt
    ? `작업 중지 시간 : ${v.stoppedAt}${v.resumedAt ? ` ~ ${v.resumedAt}` : ""}${
        minutes !== null ? `(${minutes}분간)` : ""
      }`
    : "작업 중지 시간 :";

  return (
    <div className="print-root sheet sheet-stopwork">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        {/* 접수번호 · 접수자 — 원본대로 오른쪽 위 작은 상자 */}
        <table className="head-box">
          <colgroup>
            <col style={{ width: "24mm" }} />
            <col style={{ width: "36mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">접수번호</td>
              <td className="num">{v.no}</td>
            </tr>
            <tr>
              <td className="lbl">접 수 자</td>
              <td>{v.receivedBy}</td>
            </tr>
          </tbody>
        </table>

        <div className="sheet-title">작업중지 요청서</div>

        <table>
          <colgroup>
            <col style={{ width: "26mm" }} />
            <col style={{ width: "22mm" }} />
            <col />
            <col style={{ width: "24mm" }} />
            <col style={{ width: "40mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">
                소 속
                <br />
                (업체)
              </td>
              <td colSpan={4}>{v.dept}</td>
            </tr>
            <tr>
              <td className="lbl">작 업 명</td>
              <td colSpan={4}>{v.workName}</td>
            </tr>
            <tr>
              <td className="lbl">요 청 자</td>
              <td className="sub">직급 : {v.requesterRank}</td>
              <td className="sign-cell">
                성명 : {v.requesterName} <Sign id={v.requesterSign} />
              </td>
              <td className="sub" colSpan={2}>
                전화번호 : {v.requesterPhone}
              </td>
            </tr>
            <tr>
              <td className="lbl">
                요청내용
                <br />
                (중지 사유)
              </td>
              <td className="wrap tall" colSpan={4}>
                {v.reason}
              </td>
            </tr>
            <tr>
              <td className="lbl">조치결과</td>
              <td className="wrap tall" colSpan={4}>
                {v.result}
              </td>
            </tr>
            <tr>
              <td className="lbl">기타사항</td>
              <td className="wrap" colSpan={4}>
                {timeLine}
                {v.note ? `\n${v.note}` : ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 사진은 붙인 게 있을 때만 — 원본 서식에는 없는 칸이라 빈 상자를 남기지 않는다 */}
        {hasPhoto && (
          <>
            <div className="sec">◈ 현장 사진</div>
            <div className="photos">
              {STOPWORK_PHOTO_LABELS.map((name, i) => (
                <Photo key={name} id={v.photos[i]} name={name} />
              ))}
            </div>
          </>
        )}

        <div className="date-line">{dateLine(v.date)}</div>
        <div className="org-line">{settings.org.orgName || settings.org.facility || ""}</div>
      </div>
    </div>
  );
}
