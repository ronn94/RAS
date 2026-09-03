/**
 * 의견청취 설문지 인쇄 서식 — A4 세로 1장. 결재·보관용.
 * 화면 입력 항목을 그대로 종이에 옮긴다(사진 최대 2장 포함).
 */
import { usePhotoUrl } from "@/components/photo";
import { codeLabel } from "@/lib/settings";
import { riskOf } from "@/lib/risk";
import { SURVEY_MAX_PHOTOS, type Survey } from "@/lib/types";
import { useStore } from "@/store";

function Photo({ id, no }: { id?: string; no: number }) {
  const url = usePhotoUrl(id);
  return (
    <div className="photo">
      {url ? <img src={url} alt="" /> : <div className="empty">사진 {no}</div>}
    </div>
  );
}

export function SurveySheet({ survey: v }: { survey: Survey }) {
  const { settings } = useStore();
  const risk = riskOf(v.p, v.s);

  return (
    <div className="print-root sheet sheet-survey">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        <div className="sheet-title">위험성평가 의견청취 설문지</div>
        <div className="sheet-meta">
          {settings.org.orgName || settings.org.facility || ""}
        </div>

        <table>
          <colgroup>
            <col style={{ width: "28mm" }} />
            <col />
            <col style={{ width: "28mm" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">작 성 자</td>
              <td>{v.author}</td>
              <td className="lbl">작성일자</td>
              <td className="num">{v.date}</td>
            </tr>
            <tr>
              <td className="lbl">공 정 명</td>
              <td>{v.process}</td>
              <td className="lbl">세부공정</td>
              <td>{v.subProcess}</td>
            </tr>
            <tr>
              <td className="lbl">위험분류</td>
              <td>{v.hazardClass}</td>
              <td className="lbl">위험코드</td>
              <td>{v.hazardCode ? codeLabel(settings, v.hazardCode) : ""}</td>
            </tr>
            <tr>
              <td className="lbl">유해위험요인</td>
              <td className="wrap tall" colSpan={3}>
                {v.hazard}
              </td>
            </tr>
            <tr>
              <td className="lbl">위 험 성</td>
              <td className="num" colSpan={3}>
                가능성 {v.p ?? "-"} × 중대성 {v.s ?? "-"} = <strong>{risk ?? "-"}</strong>
              </td>
            </tr>
            <tr>
              <td className="lbl">개선대책</td>
              <td className="wrap tall" colSpan={3}>
                {v.measure}
              </td>
            </tr>
            <tr>
              <td className="lbl">개선예정일</td>
              <td className="num" colSpan={3}>
                {v.dueDate}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="sec">◈ 사진</div>
        <div className="photos">
          {Array.from({ length: SURVEY_MAX_PHOTOS }, (_, i) => (
            <Photo key={i} id={v.photos[i]} no={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
