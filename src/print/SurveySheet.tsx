/**
 * 의견청취 설문지 인쇄 서식 — A4 세로 1장.
 *
 * 위 60%: 화면 입력 항목(작성자~개선예정일 + 사진 2장)
 * 아래 40%: **근로자 FEEDBACK**(원본 SSI-602-09(3)) — 인쇄한 뒤 손으로 적는 칸이라
 *          화면에는 입력창을 두지 않는다. 자리가 매번 같도록 높이를 mm로 못박는다.
 */
import { usePhotoUrl } from "@/components/photo";
import { codeLabel } from "@/lib/settings";
import { riskOf } from "@/lib/risk";
import { SURVEY_PHOTO_LABELS, type Survey } from "@/lib/types";
import { useStore } from "@/store";

/** 아래 근로자 FEEDBACK 구역 높이 — A4 세로 본문 267mm의 40% */
const FEEDBACK_MM = 267 * 0.4;

/** 원본 서식의 평가항목 4구분 × 4단계 */
const FEEDBACK_ROWS = ["안전 효과", "작업수행시 불편사항", "현장적용 적합성", "외관상"];
const FEEDBACK_SCALE = ["① 매우 만족", "② 만족", "③ 불편", "④ 매우 불편"];

function Photo({ id, name }: { id?: string; name: string }) {
  const url = usePhotoUrl(id);
  return (
    <div className="photo">
      <div className="cap">{name}</div>
      <div className="frame">{url ? <img src={url} alt={name} /> : <div className="empty">{name} 사진</div>}</div>
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
          {SURVEY_PHOTO_LABELS.map((name, i) => (
            <Photo key={name} id={v.photos[i]} name={name} />
          ))}
        </div>

        {/* ── 근로자 FEEDBACK (수기 작성) ───────────────────────── */}
        <div className="feedback" style={{ height: `${FEEDBACK_MM}mm` }}>
          <div className="divider" />
          <div className="fb-title">위험성 평가 근로자 FEEDBACK</div>

          <table className="fb-scale">
            <colgroup>
              <col style={{ width: "46mm" }} />
              {FEEDBACK_SCALE.map((_, i) => (
                <col key={i} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>구 분</th>
                {FEEDBACK_SCALE.map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEEDBACK_ROWS.map((label) => (
                <tr key={label}>
                  <td className="lbl">{label}</td>
                  {FEEDBACK_SCALE.map((sc) => (
                    <td key={sc} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <table className="fb-memo">
            <colgroup>
              <col style={{ width: "46mm" }} />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="lbl">
                  차후 개선 의견
                  <br />
                  <span className="hint">(③불편·④매우 불편 시)</span>
                </td>
                <td />
              </tr>
              <tr>
                <td className="lbl">종합 의견</td>
                <td />
              </tr>
            </tbody>
          </table>

          <table className="fb-sign">
            <colgroup>
              <col style={{ width: "22mm" }} />
              <col />
              <col style={{ width: "22mm" }} />
              <col style={{ width: "40mm" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="lbl">평가일시</td>
                <td />
                <td className="lbl">평 가 자</td>
                <td className="sign-cell">(서명)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
