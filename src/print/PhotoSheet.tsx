/**
 * 감소대책 사진대지 인쇄 서식 — 첨부 원본(감소대책 사진대지.pdf) 구조를 그대로 재현.
 * A4 세로 · 여백 0 · 1페이지 2건. 위험내용·개선내용만 줄바꿈하고, 나머지 텍스트는
 * 칸 너비에 맞춰 자동 축소(최대 50%)된다.
 */
import { usePhotoUrl } from "@/components/photo";
import { FitText } from "@/print/FitText";
import { riskAfter, riskBefore } from "@/lib/risk";
import type { Assessment, RiskItem } from "@/lib/types";

export type SheetEntry = { assessment: Assessment; row: RiskItem };

function BeforePhoto({ id }: { id?: string }) {
  const url = usePhotoUrl(id);
  return (
    <td className="photo" colSpan={4} rowSpan={4}>
      {url ? <img src={url} alt="개선 전 사진" /> : <div className="empty">개선 전 사진</div>}
    </td>
  );
}

function AfterPhoto({ id }: { id?: string }) {
  const url = usePhotoUrl(id);
  return url ? <img src={url} alt="개선 후 사진" /> : <div className="empty">개선 후 사진</div>;
}

function Item({ entry }: { entry: SheetEntry }) {
  const { row: r } = entry;
  const before = riskBefore(r);
  const after = riskAfter(r);

  return (
    <div className="sheet-item">
      <div className="band">유해위험요인</div>
      <div />
      <div className="band">감소대책</div>

      {/* 좌: 유해위험요인 */}
      <table>
        <colgroup>
          <col style={{ width: "15mm" }} />
          <col />
          <col style={{ width: "17mm" }} />
          <col style={{ width: "17mm" }} />
          <col style={{ width: "17mm" }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="lbl">
              평가
              <br />
              코드
            </td>
            <BeforePhoto id={r.beforePhoto} />
          </tr>
          <tr>
            <td className="code">
              <FitText>{r.code || ""}</FitText>
            </td>
          </tr>
          <tr>
            <td className="lbl">
              위험
              <br />
              분류
            </td>
          </tr>
          <tr>
            <td className="code">
              <FitText>{r.hazardClass || ""}</FitText>
            </td>
          </tr>
          <tr>
            <td className="lbl">
              위험
              <br />
              내용
            </td>
            <td className="memo" colSpan={4}>
              <FitText mode="block">{r.hazard}</FitText>
            </td>
          </tr>
          <tr>
            <td className="lbl" colSpan={2} rowSpan={2}>
              <FitText>현재 안전보건조치</FitText>
            </td>
            <th colSpan={3}>현재 위험성</th>
          </tr>
          <tr>
            <th>
              가능성
              <br />
              (빈도)
            </th>
            <th>
              중대성
              <br />
              (강도)
            </th>
            <th>위험성</th>
          </tr>
          <tr>
            <td colSpan={2}>
              <FitText>{r.currentControl}</FitText>
            </td>
            <td className="num">{r.p ?? ""}</td>
            <td className="num">{r.s ?? ""}</td>
            <td className="num">{before ?? ""}</td>
          </tr>
        </tbody>
      </table>

      <div className="arrow">➔</div>

      {/* 우: 감소대책 */}
      <table>
        <colgroup>
          <col style={{ width: "15mm" }} />
          <col />
          <col style={{ width: "17mm" }} />
          <col style={{ width: "17mm" }} />
          <col style={{ width: "17mm" }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="photo" colSpan={5}>
              <AfterPhoto id={r.afterPhoto} />
            </td>
          </tr>
          <tr>
            <td className="lbl">
              개선
              <br />
              내용
            </td>
            <td className="memo" colSpan={4}>
              <FitText mode="block">{r.improveContent || r.measure}</FitText>
            </td>
          </tr>
          <tr>
            <td className="lbl" colSpan={2} rowSpan={2}>
              <FitText>개선 일자</FitText>
            </td>
            <th colSpan={3}>개선후 위험성</th>
          </tr>
          <tr>
            <th>
              가능성
              <br />
              (빈도)
            </th>
            <th>
              중대성
              <br />
              (강도)
            </th>
            <th>위험성</th>
          </tr>
          <tr>
            <td className="num" colSpan={2}>
              <FitText>{r.improveDate || r.dueDate || ""}</FitText>
            </td>
            <td className="num">{r.p2 ?? ""}</td>
            <td className="num">{r.s2 ?? ""}</td>
            <td className="num">{after ?? ""}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** 선택 항목을 A4 1페이지 2건으로 묶어 렌더 */
export function PhotoSheet({ entries }: { entries: SheetEntry[] }) {
  const pages: SheetEntry[][] = [];
  for (let i = 0; i < entries.length; i += 2) pages.push(entries.slice(i, i + 2));

  return (
    <div className="print-root sheet sheet-photo">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      {pages.map((page, i) => (
        <div key={i} className="print-page">
          <div className="sheet-title">감소대책</div>
          {page.map((e) => (
            <Item key={e.row.id} entry={e} />
          ))}
          {page.length === 1 && <div className="sheet-item" aria-hidden />}
        </div>
      ))}
    </div>
  );
}
