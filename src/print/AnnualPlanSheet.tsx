/**
 * 위험성평가 연간계획표 인쇄 서식 — 원본(SSI-602-02) 재현. **A4 가로 1장** · 여백 15mm.
 *
 * 가로 칸이 22개(구분·절차구분·세부절차 2 · 세부내용 · 대상 · 목표 · 구분 · 12개월 · 비고 ·
 * 이행률)라 세로로는 글자가 읽을 수 없을 만큼 작아진다 — 그래서 가로다.
 *
 * 원본의 세로 병합(절차구분이 여러 항목을 묶고, '실시규정 작성' 아래에 교육 회의·교육이
 * 다시 갈리는 구조)을 그대로 살리려고, 연달아 같은 값이 나오는 구간을 미리 묶어
 * rowSpan으로 그린다(spanRuns). 항목 하나가 계획·실적 두 줄이므로 병합 높이는 언제나 ×2다.
 */
import {
  actualMonths,
  PLAN_TEMPLATE,
  progressOf,
  spanRuns,
  type AnnualPlan,
  type AutoActual,
  type PlanItemKey,
} from "@/lib/annualPlan";
import { useStore } from "@/store";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function AnnualPlanSheet({
  plan,
  auto,
}: {
  plan: AnnualPlan;
  auto: Partial<Record<PlanItemKey, AutoActual>>;
}) {
  const { settings } = useStore();
  const approver = {
    charge: plan.approver.charge || settings.org.approver.charge,
    review: plan.approver.review || settings.org.approver.review,
    approve: plan.approver.approve || settings.org.approver.approve,
  };

  // 문서에 저장된 줄을 서식 순서대로 세운다(옛 문서에 없는 줄이 있어도 템플릿이 기준이다)
  const byKey = new Map(plan.rows.map((r) => [r.key, r]));
  const items = PLAN_TEMPLATE.map((t) => ({ t, row: byKey.get(t.key) }));

  // 세로 병합 구간 — 절차구분 / 세부절차 / 그 아래 단계 순으로 좁혀 가며 묶는다
  const groupRuns = spanRuns(PLAN_TEMPLATE, (t) => t.group);
  const stepRuns = spanRuns(PLAN_TEMPLATE, (t) => `${t.group}|${t.step}`);
  const subRuns = spanRuns(PLAN_TEMPLATE, (t) => `${t.group}|${t.step}|${t.sub ?? ""}`);
  const startOf = (runs: { start: number; len: number }[], i: number) => runs.find((r) => r.start === i);

  return (
    <div className="print-root sheet sheet-annual">
      <style>{"@page{size:A4 landscape;margin:15mm}"}</style>
      <div className="print-page">
        {/* 제목 + 결재란 */}
        <table className="head">
          <colgroup>
            <col />
            <col style={{ width: "9mm" }} />
            <col style={{ width: "24mm" }} />
            <col style={{ width: "24mm" }} />
            <col style={{ width: "24mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="head-title" rowSpan={2}>
                {plan.year}년 위험성평가 연간계획표
              </td>
              <td className="lbl vert" rowSpan={2}>
                결<br />재
              </td>
              <th>담 당</th>
              <th>검 토</th>
              <th>승 인</th>
            </tr>
            <tr>
              <td className="sign">{approver.charge}</td>
              <td className="sign">{approver.review}</td>
              <td className="sign">{approver.approve}</td>
            </tr>
          </tbody>
        </table>

        <table className="plan">
          <colgroup>
            <col style={{ width: "6mm" }} />
            <col style={{ width: "16mm" }} />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "18mm" }} />
            <col style={{ width: "46mm" }} />
            <col style={{ width: "15mm" }} />
            <col style={{ width: "12mm" }} />
            <col style={{ width: "10mm" }} />
            {MONTHS.map((m) => (
              <col key={m} style={{ width: "7mm" }} />
            ))}
            <col style={{ width: "24mm" }} />
            <col style={{ width: "13mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2}>구분</th>
              <th rowSpan={2}>
                절 차
                <br />구 분
              </th>
              <th rowSpan={2} colSpan={2}>
                세 부 절 차
              </th>
              <th rowSpan={2}>세 부 내 용</th>
              <th rowSpan={2}>대상</th>
              <th rowSpan={2}>목표</th>
              <th rowSpan={2}>구분</th>
              <th colSpan={12}>추 진 일 정</th>
              <th rowSpan={2}>비고</th>
              <th rowSpan={2}>이행률</th>
            </tr>
            <tr>
              {MONTHS.map((m) => (
                <th key={m}>{m}M</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(({ t, row }, i) => {
              const a = auto[t.key];
              const done = row ? actualMonths(row, a) : [];
              const rate = row ? progressOf(row, a) : null;
              const gRun = startOf(groupRuns, i);
              const sRun = startOf(stepRuns, i);
              const dRun = startOf(subRuns, i);
              /* 그 세부절차 묶음에 아래 단계가 있으면 C는 한 칸, 없으면 C가 D까지 차지한다.
                 이 판단은 **묶음의 첫 줄**로만 한다 — sRun은 그 첫 줄에만 있기 때문이다. */
              const stepStartsSub = sRun ? !!PLAN_TEMPLATE[sRun.start].sub : false;
              return (
                <>
                  <tr key={`${t.key}-plan`}>
                    {/* '구분' 세로 글자 — 표 전체를 한 칸으로 묶는다(원본 A5:A34) */}
                    {i === 0 && (
                      <td className="lbl side" rowSpan={PLAN_TEMPLATE.length * 2}>
                        위험성평가 연간계획표
                      </td>
                    )}
                    {gRun && (
                      // 수시평가·작업위험성은 원본에서 절차구분이 세부절차 칸까지 먹는다
                      <td className="lbl wrap" rowSpan={gRun.len * 2} colSpan={t.wide ? 3 : 1}>
                        {t.group}
                      </td>
                    )}
                    {!t.wide && sRun && (
                      <td className="wrap step" rowSpan={sRun.len * 2} colSpan={stepStartsSub ? 1 : 2}>
                        {t.step}
                      </td>
                    )}
                    {/* 아래 단계 칸은 **그 줄에 sub가 있는지**로 판단한다. 세부절차 묶음의
                        첫 줄 여부로 판단하면, 첫 줄이 아닌 곳에서 시작하는 묶음(위험성평가 교육)이
                        통째로 빠져 그 아래 칸들이 한 칸씩 밀린다 — 실제로 겪은 문제다 */}
                    {!t.wide && t.sub && dRun && (
                      <td className="wrap step" rowSpan={dRun.len * 2}>
                        {t.sub}
                      </td>
                    )}
                    <td className="wrap" rowSpan={2}>
                      {row?.detail}
                    </td>
                    <td className="num" rowSpan={2}>
                      {row?.target}
                    </td>
                    <td className="num" rowSpan={2}>
                      {row?.goal}
                    </td>
                    <td className="num tag">계획</td>
                    {MONTHS.map((m) => (
                      <td key={m} className="mark">
                        {row?.plan.includes(m) ? "○" : ""}
                      </td>
                    ))}
                    <td className="wrap" rowSpan={2}>
                      {row?.note}
                    </td>
                    <td className="num rate" rowSpan={2}>
                      {rate === null ? "-" : `${rate}%`}
                    </td>
                  </tr>
                  <tr key={`${t.key}-actual`}>
                    <td className="num tag">실적</td>
                    {MONTHS.map((m) => (
                      <td key={m} className="mark">
                        {done.includes(m) ? "●" : ""}
                      </td>
                    ))}
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
