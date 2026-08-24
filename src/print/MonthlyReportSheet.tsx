/**
 * 월간 게시용 보고서 — A4 세로 딱 1장. 매월 말일에 뽑아 사무실에 게시한다.
 *
 * 위 70%: 지표표 · 그달 개선 내역 목록 · 개선 전/후 히트맵
 * 아래 30%: 열람 명단(직원이 손으로 서명하는 칸) — 내역이 몇 건이든 **자리가 고정**이라
 *          매달 같은 모양으로 게시된다. 그래서 위 구역은 높이를 정해 놓고 그 안에서
 *          글자 크기를 줄이는 방식으로 넘침을 막는다(페이지가 2장으로 갈라지지 않게).
 */
import * as React from "react";
import { entriesImprovedIn, monthLabel, type Entry, type Metrics } from "@/lib/metrics";
import { riskAfter, riskBefore } from "@/lib/risk";
import { useStore } from "@/store";

/** 아래 열람 명단 구역 높이 — A4 세로 본문 267mm의 40% */
const SIGN_BLOCK_MM = 107;
/** 서명표 가로 세트 수 (번호|이름|서명 한 벌) */
const SIGN_COLS = 3;
/** 명단이 적어도 이 칸 수만큼은 빈 칸으로 그려 표 크기를 고정한다 */
const SIGN_MIN_SLOTS = 24;

/** 내역 목록 글자 크기 — 넘치면 이 범위 안에서 줄여 한 장에 밀어넣는다 */
const LIST_PT_MAX = 8.5;
const LIST_PT_MIN = 6;

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
      <td className="wrap">{e.assessment.process || e.assessment.facility || "-"}</td>
      <td className="wrap">{e.row.subProcess || "-"}</td>
      <td className="wrap">{e.row.hazard || "-"}</td>
      <td className="wrap">{e.row.improveContent || e.row.measure || "-"}</td>
      <td className="num">
        {before ?? "-"}
        {after !== null ? ` → ${after}` : ""}
      </td>
      <td className="num">{e.row.improveDate || "-"}</td>
      <td className="num">{e.row.owner || "-"}</td>
    </tr>
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

  /* 목록 칸은 남는 높이를 그대로 받고(flex:1 · overflow:hidden), 내용이 넘치면 글자를 한 단계씩
     줄여 다시 잰다. 줄이면 높이는 반드시 줄어들므로 몇 번 안에 멈춘다 — 행 수로 어림잡으면
     내용 줄바꿈 때문에 빗나가서 히트맵이 잘려 나갔다(실제로 겪은 문제). */
  const listRef = React.useRef<HTMLDivElement>(null);
  const [fontPt, setFontPt] = React.useState(LIST_PT_MAX);
  const [visible, setVisible] = React.useState(rows.length);
  React.useLayoutEffect(() => {
    setFontPt(LIST_PT_MAX);
    setVisible(rows.length);
  }, [month, rows.length]);
  React.useLayoutEffect(() => {
    const box = listRef.current;
    if (!box || box.scrollHeight <= box.clientHeight + 1) return;
    // 먼저 글자를 줄이고, 읽을 수 있는 하한까지 줄여도 안 되면 뒤에서부터 잘라 "외 N건"으로 넘긴다
    if (fontPt > LIST_PT_MIN) setFontPt((f) => Math.round((f - 0.25) * 100) / 100);
    else if (visible > 1) setVisible((v) => v - 1);
  });

  const shown = rows.slice(0, visible);
  const hidden = rows.length - shown.length;

  /** 명단은 이름 가나다순. 빈 칸을 채워 표 높이를 고정하고, 인원이 넘치면 행 높이를 줄인다 */
  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));
  const slots = Math.max(SIGN_MIN_SLOTS, staff.length);
  const signRows = Math.ceil(slots / SIGN_COLS);
  // 구역 높이에서 구분선(≈3mm)·'열람 명단' 제목(≈8mm)·머리행(5mm)을 빼고 남은 만큼을 행이 나눠 갖는다.
  // 상한을 두지 않아 표가 40% 구역을 꽉 채운다(인원이 많으면 5mm까지 줄어든다)
  const rowMm = Math.max(5, (SIGN_BLOCK_MM - 17) / signRows);

  return (
    <div className="print-root sheet sheet-report sheet-monthly">
      <style>{"@page{size:A4 portrait;margin:15mm}"}</style>
      <div className="print-page">
        <div className="top" style={{ height: `${267 - SIGN_BLOCK_MM}mm` }}>
          <div className="report-head">
            <div className="report-title">{monthLabel(month)} 위험성평가 관리 현황</div>
            <div className="report-meta">
              {settings.org.orgName || settings.org.facility || ""} · 출력일{" "}
              {new Date().toLocaleDateString("ko-KR", { dateStyle: "long" })}
            </div>
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
                    개선일자 기준 {m.doneByDate}/{m.entries.length}건 · {monthLabel(month)} {rows.length}건
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
          <div className="list" ref={listRef} style={{ fontSize: `${fontPt}pt` }}>
            <table>
              <colgroup>
                <col style={{ width: "20mm" }} />
                <col style={{ width: "24mm" }} />
                <col style={{ width: "22mm" }} />
                <col />
                <col />
                <col style={{ width: "16mm" }} />
                <col style={{ width: "20mm" }} />
                <col style={{ width: "15mm" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>평가코드</th>
                  <th>공정</th>
                  <th>세부공정</th>
                  <th>유해위험요인</th>
                  <th>개선내용</th>
                  <th>위험성</th>
                  <th>개선일자</th>
                  <th>담당자</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="num">
                      {monthLabel(month)}에 개선 완료된 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  shown.map((e) => <ListRow key={e.row.id} e={e} />)
                )}
                {hidden > 0 && (
                  <tr>
                    <td colSpan={8} className="num">
                      외 {hidden}건 — 전체 내역은 위험성평가 목록에서 확인
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

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
      </div>
    </div>
  );
}
