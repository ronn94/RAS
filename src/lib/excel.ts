/**
 * xlsx 가져오기·내보내기.
 * 가져오기는 **컬럼 머리말을 읽어 위치를 찾는다** — 원본 서식(SSI-602-07)처럼 머리말이
 * 4~5행짜리인 파일과, 이 앱이 내보낸 2행 머리말 파일을 모두 처리한다.
 * 내보내기는 결재란 없이 컬럼 머리말 + 데이터만 담는다.
 */
import { emptyRow, STATUSES, type Assessment, type RiskItem } from "./types";
import { riskBefore, riskAfter } from "./risk";


function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function toDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = toStr(v);
  const m = s.match(/(\d{4})[.\-/\s]*(\d{1,2})[.\-/\s]*(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return s;
}

/* ── 컬럼 머리말로 위치를 찾아 읽는다 ────────────────────────────
   원본 서식(머리말 4~5행)과 이 앱이 내보낸 파일(머리말 1~2행) 모두 지원한다. */

type Field =
  | "subProcess" | "hazardClass" | "hazard" | "currentControl"
  | "code" | "measure" | "dueDate" | "note" | "owner" | "status";

const HEADER_ALIASES: [Field, string[]][] = [
  ["subProcess", ["세부공정"]],
  ["hazardClass", ["위험분류"]],
  ["hazard", ["유해위험요인", "위험요인", "위험내용"]],
  ["currentControl", ["현재의안전보건조치", "안전보건조치", "현재안전보건조치"]],
  ["code", ["평가코드"]],
  ["measure", ["개선대책", "감소대책"]],
  ["dueDate", ["개선예정일", "개선일자"]],
  ["note", ["비고"]],
  ["owner", ["담당자"]],
  ["status", ["조치상태", "상태"]],
];

const norm = (v: unknown) => String(v ?? "").replace(/\s|\(.*?\)|\n/g, "");

type Layout = { map: Partial<Record<Field, number>>; p?: number; s?: number; p2?: number; s2?: number; dataStart: number };

/** 머리말 행을 찾아 컬럼 위치를 매핑한다 */
function detectLayout(grid: unknown[][]): Layout | null {
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    const row = grid[r] ?? [];
    const next = grid[r + 1] ?? [];
    // 머리말 행은 그 행 자체에 컬럼 이름이 있어야 한다 (윗줄 값이 섞여 오탐하는 것 방지)
    const own = row.map(norm);
    if (!own.some((l) => l.includes("유해위험요인") || l.includes("세부공정"))) continue;
    // 머리말이 두 줄로 나뉜 서식(현재 위험성 / 가능성)을 위해 위·아래 칸을 붙여서 본다
    const labels = row.map((c, i) => `${norm(c)}${norm(next[i])}`);

    const map: Partial<Record<Field, number>> = {};
    for (const [field, aliases] of HEADER_ALIASES) {
      const idx = labels.findIndex((l) => l && aliases.some((a) => l.includes(a)));
      if (idx >= 0) map[field] = idx;
    }

    // 가능성·중대성은 '현재'와 '개선 후' 두 벌이 순서대로 나온다
    const likelihood: number[] = [];
    const severity: number[] = [];
    labels.forEach((l, i) => {
      if (l.includes("가능성")) likelihood.push(i);
      if (l.includes("중대성")) severity.push(i);
    });

    // 머리말이 두 줄이면 데이터는 그 다음 줄부터
    const twoLine = (next ?? []).some((c) => /가능성|중대성|위험성/.test(norm(c)));
    return {
      map,
      p: likelihood[0],
      s: severity[0],
      p2: likelihood[1],
      s2: severity[1],
      dataStart: r + (twoLine ? 2 : 1),
    };
  }
  return null;
}

function readRows(grid: unknown[][], layout: Layout): RiskItem[] {
  const out: RiskItem[] = [];
  const at = (row: unknown[], i?: number) => (i === undefined ? "" : row[i]);

  for (const raw of grid.slice(layout.dataStart)) {
    if (!raw) continue;
    const cls = toStr(at(raw, layout.map.hazardClass));
    const status = toStr(at(raw, layout.map.status));
    const item: RiskItem = {
      ...emptyRow(),
      subProcess: toStr(at(raw, layout.map.subProcess)),
      hazardClass: cls as RiskItem["hazardClass"],
      hazard: toStr(at(raw, layout.map.hazard)),
      currentControl: toStr(at(raw, layout.map.currentControl)),
      p: toNum(at(raw, layout.p)),
      s: toNum(at(raw, layout.s)),
      code: toStr(at(raw, layout.map.code)),
      measure: toStr(at(raw, layout.map.measure)),
      dueDate: toDate(at(raw, layout.map.dueDate)),
      p2: toNum(at(raw, layout.p2)),
      s2: toNum(at(raw, layout.s2)),
      note: toStr(at(raw, layout.map.note)),
      owner: toStr(at(raw, layout.map.owner)),
      status: (STATUSES as readonly string[]).includes(status) ? (status as RiskItem["status"]) : "미조치",
    };
    if (item.hazard || item.subProcess || item.currentControl || item.measure || item.p) out.push(item);
  }
  return out;
}

async function readGrid(file: File) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: true, defval: null });
}

/** xlsx 파일 → 평가 항목 목록 (열려 있는 평가표에 붙여넣기 위한 용도) */
export async function importRows(file: File): Promise<RiskItem[]> {
  const grid = await readGrid(file);
  const layout = detectLayout(grid);
  if (!layout) throw new Error("컬럼 머리말(세부공정·유해위험요인 등)을 찾지 못했습니다");
  const rows = readRows(grid, layout);
  if (rows.length === 0) throw new Error("읽을 수 있는 데이터 행이 없습니다");
  return rows;
}

/** xlsx 파일 → 평가표 (머리말의 대상시설·공정명·평가일시까지 함께 읽는다) */
export async function importAssessment(file: File): Promise<Assessment> {
  const grid = await readGrid(file);
  const layout = detectLayout(grid);
  if (!layout) throw new Error("컬럼 머리말(세부공정·유해위험요인 등)을 찾지 못했습니다");

  const meta = (label: string): string => {
    for (const row of grid.slice(0, layout.dataStart)) {
      const idx = (row ?? []).findIndex((c) => norm(c) === label);
      if (idx >= 0) {
        for (let j = idx + 1; j < (row ?? []).length; j++) {
          const v = toStr(row[j]);
          if (v) return v;
        }
      }
    }
    return "";
  };

  const rows = readRows(grid, layout);
  return {
    id: crypto.randomUUID(),
    facility: meta("대상시설"),
    process: meta("공정명"),
    processNo: 1,
    date: toDate(meta("평가일시")) || new Date().toISOString().slice(0, 10),
    approver: { charge: "", review: "", approve: "" },
    rows: rows.length ? rows : [emptyRow()],
    updatedAt: Date.now(),
  };
}

/**
 * 평가표 → xlsx 파일 다운로드.
 * 사용자 확정: 결재란·제목·대상시설 등 상단 머리말은 넣지 않고 **컬럼 머리말 + 데이터만** 내보낸다.
 */
export async function exportAssessment(a: Assessment) {
  const XLSX = await import("xlsx");
  const width = 15;
  const blank = () => Array<string | number | null>(width).fill(null);
  const grid: (string | number | null)[][] = [];

  const h1 = blank();
  h1[0] = "No.";
  h1[1] = "세부공정";
  h1[2] = "위험분류";
  h1[3] = "유해위험요인";
  h1[4] = "현재의 안전보건조치";
  h1[5] = "현재 위험성(5x4)";
  h1[8] = "평가코드(8등급이상) 연도.No-0";
  h1[9] = "개선대책";
  h1[10] = "개선예정일";
  h1[11] = "개선 후 위험성";
  h1[14] = "비고(종사자 의견 등)";

  const h2 = blank();
  h2[5] = "가능성";
  h2[6] = "중대성";
  h2[7] = "위험성";
  h2[11] = "가능성";
  h2[12] = "중대성";
  h2[13] = "위험성";

  grid.push(h1, h2);

  a.rows.forEach((r, i) => {
    grid.push([
      i + 1,
      r.subProcess,
      r.hazardClass,
      r.hazard,
      r.currentControl,
      r.p,
      r.s,
      riskBefore(r),
      r.code,
      r.measure,
      r.dueDate,
      r.p2,
      r.s2,
      riskAfter(r),
      r.note,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(grid);
  const span = (c1: number, c2: number) => ({ s: { r: 0, c: c1 }, e: { r: 0, c: c2 } });
  const stack = (c: number) => ({ s: { r: 0, c }, e: { r: 1, c } });
  ws["!merges"] = [
    stack(0), stack(1), stack(2), stack(3), stack(4),
    span(5, 7),
    stack(8), stack(9), stack(10),
    span(11, 13),
    stack(14),
  ];
  ws["!cols"] = [
    { wch: 4 }, { wch: 14 }, { wch: 8 }, { wch: 34 }, { wch: 26 },
    { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 16 }, { wch: 32 },
    { wch: 12 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "위험성평가표");
  const name = [a.facility, a.process, a.date].filter(Boolean).join("_") || "위험성평가표";
  XLSX.writeFile(wb, `${name}.xlsx`);
}
