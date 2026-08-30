/**
 * 월간 게시용 보고서 — A4 세로. 매월 말일에 뽑아 사무실에 게시한다.
 *
 * 위 60%: 지표표 · 개선 전/후 히트맵 · 그달 개선 완료 내역(페이지당 6건 고정)
 * 아래 40%: 열람 명단(직원이 손으로 서명하는 칸)
 *
 * 개선 완료 내역이 6건을 넘으면 **페이지를 나눈다** — 지표표·히트맵·열람 명단은
 * 모든 페이지에 그대로 반복되고, 바뀌는 건 내역 목록뿐이다(다음 6건씩). 그래서
 * 몇 장이 나오든 서명표 자리가 매 장 같은 위치에 있어 게시물로 자연스럽다.
 * 페이지가 2장 이상이면 머리글 오른쪽에 작게 "2 / 3페이지"를 붙인다.
 */
import * as React from "react";
import { entriesImprovedIn, monthLabel, type Entry, type Metrics } from "@/lib/metrics";
import { riskAfter, riskBefore } from "@/lib/risk";
import { useStore } from "@/store";
import type { AppSettings } from "@/lib/settings";

/** 아래 열람 명단 구역 높이 — A4 세로 본문 267mm의 40% */
const SIGN_BLOCK_MM = 107;
/** 서명표 가로 세트 수 (번호|이름|서명 한 벌) */
const SIGN_COLS = 3;
/** 명단이 적어도 이 칸 수만큼은 빈 칸으로 그려 표 크기를 고정한다 */
const SIGN_MIN_SLOTS = 24;

/** 개선 완료 내역 — 페이지당 고정 건수(이보다 많으면 다음 페이지로) */
const LIST_PAGE_SIZE = 6;
/** 내역 목록 글자 크기 — 행 수가 고정이라 더는 줄일 필요가 없다 */
const LIST_PT = 8.5;

/** 흑백 인쇄용 히트맵 — 화면 히트맵과 같은 집계를 회색 농도로 그린다 */
function PrintHeatmap({
  counts,
  likelihoodMax,
  severityMax,
  caption,
}: {
  counts: Map<string, number>;
  likelihoodMax: number;
  severityMax: number;
  caption: string;
}) {
  const peak = Math.max(1, ...counts.values());
  const severities = Array.from({ length: severityMax }, (_, i) => severityMax - i);
  const likelihoods = Array.from({ length: likelihoodMax }, (_, i) => i + 1);

  return (
    <table className="heat">
      <caption>{caption}</caption>
      <tbody>
        {severities.map((s) => (
          <tr key={s}>
            <th>{s}</th>
            {likelihoods.map((p) => {
              const n = counts.get(`${p}-${s}`) ?? 0;
              return (
                <td key={p} style={n ? { background: `rgba(0,0,0,${(0.08 + (n / peak) * 0.32).toFixed(3)})` } : undefined}>
                  {n || ""}
                </td>
              );
            })}
          </tr>
        ))}
        <tr>
          <th className="corner" />
          {likelihoods.map((p) => (
            <th key={p}>{p}</th>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function ListRow({ e }: { e: Entry }) {
  const before = riskBefore(e.row);
  const after = riskAfter(e.row);
  return (
    <tr>
      <td className="num">{e.row.code || "-"}</td>
      <td>
        <span className="wrap">{e.row.subProcess || "-"}</span>
      </td>
      <td>
        <span className="wrap">{e.row.hazard || "-"}</span>
      </td>
      <td>
        <span className="wrap">{e.row.improveContent || e.row.measure || "-"}</span>
      </td>
      <td className="num">
        {before ?? "-"}
        {after !== null ? ` → ${after}` : ""}
      </td>
      <td className="num">{e.row.improveDate || "-"}</td>
      <td className="num">{e.row.owner || "-"}</td>
      <td>
        <span className="wrap">{e.row.note || "-"}</span>
      </td>
    </tr>
  );
}

/** 지표표·히트맵·내역 목록 한 칸(위 60%) — 페이지마다 chunk만 다르고 나머지는 동일하다 */
function TopSection({
  m,
  month,
  assessmentCount,
  chunk,
  settings,
  pageLabel,
  orgLine,
  today,
}: {
  m: Metrics;
  month: string;
  assessmentCount: number;
  chunk: Entry[];
  settings: AppSettings;
  pageLabel: string;
  orgLine: string;
  today: string;
}) {
  const monthCount = entriesImprovedIn(m.entries, month).length;
  return (
    <div className="top" style={{ height: `${267 - SIGN_BLOCK_MM}mm` }}>
      <div className="report-head">
        <div>
          <div className="report-title">{monthLabel(month)} 위험성평가 관리 현황</div>
          <div className="report-meta">
            {orgLine} · 출력일 {today}
          </div>
        </div>
        {pageLabel && <div className="page-num">{pageLabel}</div>}
      </div>
      <table className="stats">
        <tbody>
          <tr>
            <th>평가지표</th>
            <th>전체 집계건수</th>
            <th>개선 완료율</th>
            <th>기한 초과</th>
          </tr>
          <tr>
            <td className="num big">
              {assessmentCount}
              <span className="sub-note">개 · 평가 항목 {m.entries.length}건</span>
            </td>
            <td className="num big">
              {m.entries.length}
              <span className="sub-note">건 · 고위험군 {m.high.length}건</span>
            </td>
            <td className="num big">
              {m.completionRateByDate}%
              <span className="sub-note">
                개선일자 기준 {m.doneByDate}/{m.entries.length}건 · {monthLabel(month)} {monthCount}건
              </span>
            </td>
            <td className="num big">
              {m.overdue.length}
              <span className="sub-note">건 · 7일 내 임박 {m.soon.length}건</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="sec">위험성 분포 (가능성 × 중대성) — 전체 누적</div>
      <div className="two">
        <PrintHeatmap
          counts={m.heat}
          likelihoodMax={settings.risk.likelihood.length}
          severityMax={settings.risk.severity.length}
          caption="개선 전"
        />
        <PrintHeatmap
          counts={m.heatAfter}
          likelihoodMax={settings.risk.likelihood.length}
          severityMax={settings.risk.severity.length}
          caption="개선 후"
        />
      </div>
      <div className="heat-axis">세로: 중대성(강도) · 가로: 가능성(빈도)</div>
      <div className="sec">{monthLabel(month)} 개선 완료 내역</div>
      <div className="list" style={{ fontSize: `${LIST_PT}pt` }}>
        <table>
          <colgroup>
            <col style={{ width: "20mm" }} />
            <col style={{ width: "24mm" }} />
            <col />
            <col />
            <col style={{ width: "16mm" }} />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "15mm" }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>평가코드</th>
              <th>세부공정</th>
              <th>유해위험요인</th>
              <th>개선내용</th>
              <th>위험성</th>
              <th>개선일자</th>
              <th>담당자</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {chunk.length === 0 ? (
              <tr>
                <td colSpan={8} className="num">
                  {monthLabel(month)}에 개선 완료된 내역이 없습니다
                </td>
              </tr>
            ) : (
              chunk.map((e) => <ListRow key={e.row.id} e={e} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 열람 명단(아래 40%) — 모든 페이지에 동일하게 반복된다 */
function SignSection({ settings }: { settings: AppSettings }) {
  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));
  const slots = Math.max(SIGN_MIN_SLOTS, staff.length);
  const signRows = Math.ceil(slots / SIGN_COLS);
  // 구역 높이에서 구분선(≈3mm)·'열람 명단' 제목(≈8mm)·머리행(5mm)을 빼고 남은 만큼을 행이 나눠 갖는다.
  // 상한을 두지 않아 표가 40% 구역을 꽉 채운다(인원이 많으면 5mm까지 줄어든다)
  const rowMm = Math.max(5, (SIGN_BLOCK_MM - 17) / signRows);

  return (
    <div className="sign" style={{ height: `${SIGN_BLOCK_MM}mm` }}>
      <div className="divider" />
      <div className="sec">열람 명단</div>
      <table className="signs">
        <colgroup>
          {/* 번호만 고정폭 · 이름·서명은 나머지를 균등 분할(table-fixed가 폭 없는 칸을 똑같이 나눈다) */}
          {Array.from({ length: SIGN_COLS }, (_, i) => (
            <React.Fragment key={i}>
              <col style={{ width: "8mm" }} />
              <col />
              <col />
            </React.Fragment>
          ))}
        </colgroup>
        <thead>
          <tr>
            {Array.from({ length: SIGN_COLS }, (_, i) => (
              <React.Fragment key={i}>
                <th>번호</th>
                <th>이름</th>
                <th>서명</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: signRows }, (_, r) => (
            <tr key={r} style={{ height: `${rowMm}mm` }}>
              {Array.from({ length: SIGN_COLS }, (_, c) => {
                const i = c * signRows + r; // 세로로 먼저 채운다(가나다순이 위→아래로 읽히도록)
                return (
                  <React.Fragment key={c}>
                    <td className="num">{i + 1}</td>
                    <td className="num">{staff[i] ?? ""}</td>
                    <td />
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthlyReportSheet({
  metrics: m,
  month,
  assessmentCount,
}: {
  metrics: Metrics;
  month: string;
  assessmentCount: number;
}) {
  const { settings } = useStore();
  const rows = entriesImprovedIn(m.entries, month);

  /** 6건씩 나눈 페이지 목록 — 내역이 하나도 없어도 "없습니다" 안내를 보여줄 페이지 1장은 만든다 */
  const pages = React.useMemo(() => {
    if (rows.length === 0) return [[] as Entry[]];
    const chunks: Entry[][] = [];
    for (let i = 0; i < rows.length; i += LIST_PAGE_SIZE) chunks.push(rows.slice(i, i + LIST_PAGE_SIZE));
    return chunks;
  }, [rows]);

  const today = new Date().toLocaleDateString("ko-KR", { dateStyle: "long" });

  return (
    <div className="print-root sheet sheet-report sheet-monthly">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      {pages.map((chunk, i) => (
        <div className="print-page" key={i}>
          <TopSection
            m={m}
            month={month}
            assessmentCount={assessmentCount}
            chunk={chunk}
            settings={settings}
            pageLabel={pages.length > 1 ? `${i + 1} / ${pages.length}페이지` : ""}
            orgLine={settings.org.orgName || settings.org.facility || ""}
            today={today}
          />
          <SignSection settings={settings} />
        </div>
      ))}
    </div>
  );
}
