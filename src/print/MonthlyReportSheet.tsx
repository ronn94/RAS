/**
 * 월간 게시용 보고서 — A4 세로. 매월 말일에 뽑아 사무실에 게시한다.
 *
 * 위 65%: 지표표 · 개선 전/후 히트맵 · 그달 개선 완료 내역
 * 아래 35%: 열람 명단(직원이 손으로 서명하는 칸)
 *
 * 개선 완료 내역은 **줄바꿈을 잘라내지 않는다** — 유해위험요인·개선내용이 길면
 * 그만큼 행이 커진다. 그래서 "페이지당 몇 건"을 고정할 수 없고, 실제 렌더링한
 * 행 높이를 재서 한 페이지(위 65% 구역)에 들어가는 만큼만 담고 넘치면 다음
 * 페이지로 넘긴다(AssessmentSheet.tsx와 같은 2단계 측정 방식 — 화면 밖에 한 번
 * 전체를 그려 각 행의 실제 높이를 잰 다음, 그 값으로 나눠 다시 그린다).
 * 지표표·히트맵·열람 명단은 페이지마다 그대로 반복되고, 내역 목록만 바뀐다.
 * 페이지가 2장 이상이면 머리글 오른쪽에 작게 "2 / 3페이지"를 붙인다.
 *
 * 폰트 크기는 어떤 경우에도 줄이지 않는다(사용자 요청) — 그래서 유난히 긴
 * 항목 하나가 그 페이지의 남은 공간을 넘기면, 그 페이지만 예정보다 적은
 * 건수로 끝나거나(정상 케이스) 그 항목 혼자 267mm를 넘길 수도 있다(극단적
 * 케이스 — 그래도 잘리는 것보다 낫다는 합의). */
import * as React from "react";
import { entriesImprovedIn, monthLabel, type Entry, type Metrics } from "@/lib/metrics";
import { riskAfter, riskBefore } from "@/lib/risk";
import { useStore } from "@/store";
import type { AppSettings } from "@/lib/settings";

/** 아래 열람 명단 구역 높이 — A4 세로 본문 267mm의 35% */
const SIGN_BLOCK_MM = 267 * 0.35;
/** 위 현황 구역 높이 — 나머지 65% */
const TOP_MM = 267 - SIGN_BLOCK_MM;
/** 서명표 가로 세트 수 (번호|이름|서명 한 벌) */
const SIGN_COLS = 3;
/** 명단이 적어도 이 칸 수만큼은 빈 칸으로 그려 표 크기를 고정한다 */
const SIGN_MIN_SLOTS = 24;

/** 내역 목록 글자 크기 — 고정. 넘치면 페이지를 나누지, 글자를 줄이지 않는다 */
const LIST_PT = 8.5;
const PX_PER_MM = 96 / 25.4;
/** 반올림 오차로 마지막 행이 살짝 넘치는 것을 막는 여유 */
const SAFETY_MM = 3;

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
    <div className="top" style={{ height: `${TOP_MM}mm` }}>
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
          {/* 유해위험요인·개선내용·비고 셋이 남는 폭을 나눠 갖는다 — 비고 몫을 40% 줄이고
              그만큼을 유해위험요인·개선내용에 절반씩 더 준다(균등 27.7mm → 33.2/33.2/16.6mm) */}
          <colgroup>
            <col style={{ width: "20mm" }} />
            <col style={{ width: "24mm" }} />
            <col style={{ width: "33.2mm" }} />
            <col style={{ width: "33.2mm" }} />
            <col style={{ width: "16mm" }} />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "15mm" }} />
            <col style={{ width: "16.6mm" }} />
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
  const today = new Date().toLocaleDateString("ko-KR", { dateStyle: "long" });
  const orgLine = settings.org.orgName || settings.org.facility || "";

  const measureRef = React.useRef<HTMLDivElement>(null);
  const [pages, setPages] = React.useState<Entry[][] | null>(null);

  // 내용이 바뀌면 다시 재야 한다(줄바꿈이 달라지면 행 높이도 달라진다)
  const signature = JSON.stringify(rows.map((e) => e.row));
  React.useLayoutEffect(() => {
    setPages(null);
  }, [signature, settings.risk.likelihood.length, settings.risk.severity.length]);

  React.useLayoutEffect(() => {
    if (pages !== null) return;
    if (rows.length === 0) {
      setPages([[]]);
      return;
    }
    const el = measureRef.current;
    const top = el?.querySelector<HTMLElement>(".top");
    const trs = el ? [...el.querySelectorAll<HTMLTableRowElement>(".list tbody tr")] : [];
    if (!top || trs.length === 0) return;

    // 첫 행이 시작되는 위치까지가 "머리글+지표표+히트맵+목록 머리행"이 차지하는 실제 높이다.
    // 그 사이에 있는 요소를 일일이 나열해 더하지 않아도 되니 마진·패딩까지 자동으로 맞는다.
    const prefixPx = trs[0].getBoundingClientRect().top - top.getBoundingClientRect().top;
    const availablePx = (TOP_MM - SAFETY_MM) * PX_PER_MM - prefixPx;

    const chunks: Entry[][] = [];
    let current: Entry[] = [];
    let used = 0;
    trs.forEach((tr, i) => {
      const h = tr.getBoundingClientRect().height;
      // 이 행 하나만으로도 남은 공간을 넘기면 어차피 페이지가 넘어가므로 혼자 페이지를 쓰게 둔다
      if (current.length > 0 && used + h > availablePx) {
        chunks.push(current);
        current = [];
        used = 0;
      }
      current.push(rows[i]);
      used += h;
    });
    if (current.length > 0) chunks.push(current);
    setPages(chunks.length > 0 ? chunks : [[]]);
  }, [pages, signature, rows]);

  // 1단계: 전체 내역을 한 페이지에 몰아 화면 밖에 그려 각 행의 실제 높이를 잰다
  if (pages === null) {
    return (
      <div className="print-root sheet sheet-report sheet-monthly" ref={measureRef} aria-hidden>
        <div className="print-page">
          <TopSection
            m={m}
            month={month}
            assessmentCount={assessmentCount}
            chunk={rows}
            settings={settings}
            pageLabel=""
            orgLine={orgLine}
            today={today}
          />
        </div>
      </div>
    );
  }

  // 2단계: 잰 높이대로 나눈 페이지를 그린다
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
            orgLine={orgLine}
            today={today}
          />
          <SignSection settings={settings} />
        </div>
      ))}
    </div>
  );
}
