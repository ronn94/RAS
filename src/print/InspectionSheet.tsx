/**
 * 순회점검 조사표 인쇄 서식 — 원본(SSI-602-06 양식4) 재현. A4 세로 · 여백 15mm.
 *
 * 원본은 발굴 요인 14행 / 참석자 10명(2세트 × 5행)이 고정으로 인쇄돼 있다.
 * 화면에서는 자유롭게 넣고 빼되, 인쇄할 때 그 최소치까지 빈칸을 채워
 * 종이 모양이 매번 같게 만든다. 그보다 많으면 있는 만큼 늘어난다.
 */
import { codeLabel } from "@/lib/settings";
import type { Inspection } from "@/lib/types";
import { useStore } from "@/store";

/** 원본 서식에 인쇄돼 있는 최소 줄 수 */
const MIN_ITEMS = 14;
const MIN_ATTENDEE_ROWS = 5;
/** 참석자 표는 소속·성명·서명 한 벌을 가로로 2세트 늘어놓는다 */
const ATTENDEE_COLS = 2;

const METHOD_TEXT =
  "위험성평가 수행자가 정기적으로 사업장을 순회점검하고 이 조사표를 사용하여 유해ㆍ위험요인을 찾음";

export function InspectionSheet({ inspection: v }: { inspection: Inspection }) {
  const { settings } = useStore();

  const items = [...v.items];
  while (items.length < MIN_ITEMS) items.push({ id: `pad-${items.length}`, content: "", hazardCode: "" });

  const rows = Math.max(MIN_ATTENDEE_ROWS, Math.ceil(v.attendees.length / ATTENDEE_COLS));

  return (
    <div className="print-root sheet sheet-inspection">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        <div className="sheet-title">순회점검에 의한 유해･위험요인 조사표</div>

        <table className="method">
          <colgroup>
            <col style={{ width: "24mm" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">실시방법</td>
              <td className="wrap">{METHOD_TEXT}</td>
            </tr>
          </tbody>
        </table>

        <table className="meta">
          <colgroup>
            <col style={{ width: "22mm" }} />
            <col />
            <col style={{ width: "22mm" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">◈ 시 설 명</td>
              <td>{v.facility}</td>
              <td className="lbl">◈ 공 정 명</td>
              <td>{v.process}</td>
            </tr>
            <tr>
              <td className="lbl">◈ 점검일자</td>
              <td className="num">{v.date}</td>
              <td className="lbl">◈ 점 검 자</td>
              <td>{v.inspector}</td>
            </tr>
          </tbody>
        </table>

        <table className="items">
          <colgroup>
            <col style={{ width: "10mm" }} />
            <col />
            <col style={{ width: "38mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={2}>◈ 발굴 유해 · 위험 작업 및 요인</th>
              <th>유해위험 유형</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id}>
                <td className="num">{i + 1}</td>
                <td className="wrap">{it.content}</td>
                <td className="num">{it.hazardCode ? codeLabel(settings, it.hazardCode) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="attendees">
          <colgroup>
            {Array.from({ length: ATTENDEE_COLS }, (_, i) => (
              <col key={i} span={3} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={ATTENDEE_COLS * 3}>◈ 순회점검 참석자 명단</th>
            </tr>
            <tr>
              {Array.from({ length: ATTENDEE_COLS }, (_, i) => (
                <ColumnHead key={i} />
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: ATTENDEE_COLS }, (_, c) => {
                  // 세로로 먼저 채운다 — 왼쪽 세트를 다 쓰고 오른쪽으로 넘어간다
                  const a = v.attendees[c * rows + r];
                  return (
                    <ColumnCells key={c} dept={a?.dept ?? ""} name={a?.name ?? ""} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function ColumnCells({ dept, name }: { dept: string; name: string }) {
  return (
    <>
      <td className="num">{dept}</td>
      <td className="num">{name}</td>
      <td />
    </>
  );
}
