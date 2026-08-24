import * as React from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Circle, Printer, ShieldAlert, StickyNote } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select } from "@/components/ui";
import { BarList, RiskHeatmap } from "@/components/charts";
import { DashboardSheet } from "@/print/DashboardSheet";
import { MonthlyReportSheet } from "@/print/MonthlyReportSheet";
import { availableMonths, buildMetrics, daysLeft, monthKey, monthLabel, type Entry } from "@/lib/metrics";
import { riskBadgeClass, riskBefore } from "@/lib/risk";
import { useStore } from "@/store";
import type { ViewKey } from "@/components/shell";

function EntryRow({ e, right }: { e: Entry; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Badge className={riskBadgeClass(riskBefore(e.row))}>{riskBefore(e.row) ?? "-"}</Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{e.row.hazard || "내용 미입력"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {e.row.code || "코드 미부여"} · {e.assessment.process || "공정 미입력"}
        </p>
      </div>
      {right}
    </div>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const { assessments, hazardInfos, settings } = useStore();
  const m = React.useMemo(() => buildMetrics(assessments, hazardInfos), [assessments, hazardInfos]);
  const [cell, setCell] = React.useState<string | null>(null);
  const [cellAfter, setCellAfter] = React.useState<string | null>(null);

  /* 인쇄 — 회의자료용 상세 보고서와 게시용 월간 보고서 둘 중 고른 것만 DOM에 둔다.
     둘 다 렌더해 두고 CSS로 감추면 .print-root의 display:block !important와 부딪힌다. */
  const [sheet, setSheet] = React.useState<"detail" | "monthly">("detail");
  const [printTick, setPrintTick] = React.useState(0);
  const [month, setMonth] = React.useState(monthKey());
  const months = React.useMemo(() => availableMonths(m.entries), [m.entries]);
  React.useEffect(() => {
    if (printTick > 0) window.print();
  }, [printTick]);
  const print = (kind: "detail" | "monthly") => {
    setSheet(kind);
    setPrintTick((t) => t + 1);
  };

  const cellEntries = cell ? m.entries.filter((e) => `${e.row.p}-${e.row.s}` === cell) : [];
  const cellAfterEntries = cellAfter ? m.entries.filter((e) => `${e.row.p2}-${e.row.s2}` === cellAfter) : [];

  const stats = [
    { label: "평가지표", value: assessments.length, unit: "개", hint: `평가 항목 ${m.entries.length}건` },
    {
      label: "전체 집계건수",
      value: m.entries.length,
      unit: "건",
      hint: `고위험군(${settings.risk.threshold}점 이상) ${m.high.length}건 · 미완료 ${m.open.length}건`,
      alert: m.open.length > 0,
    },
    {
      label: "개선 완료율",
      value: m.completionRateAll,
      unit: "%",
      hint: `전체 ${m.doneAll}/${m.entries.length}건 · 고위험군 ${m.completionRate}%(${m.done}/${m.high.length}건)`,
    },
    {
      label: "기한 초과",
      value: m.overdue.length,
      unit: "건",
      hint: `7일 내 임박 ${m.soon.length}건`,
      alert: m.overdue.length > 0,
    },
  ];

  const gapItems = [
    { label: "개선 전·후 사진 미첨부", n: m.gaps.noPhoto.length, go: "highrisk" as ViewKey },
    { label: "개선대책 미입력", n: m.gaps.noMeasure.length, go: "assessments" as ViewKey },
    { label: "평가코드 미부여", n: m.gaps.noCode.length, go: "assessments" as ViewKey },
    { label: "개선예정일 미지정", n: m.gaps.noDue.length, go: "assessments" as ViewKey },
    { label: "유해위험정보 미작성 공정", n: m.gaps.noHazardInfo.length, go: "hazardinfo" as ViewKey },
  ];

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          기한이 지난 고위험군과 미완성 항목을 먼저 확인하세요. 숫자를 누르면 해당 목록으로 이동합니다.
        </p>
        <div className="flex items-center gap-2">
          <Select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="게시용 보고서 대상 월">
            {months.map((ym) => (
              <option key={ym} value={ym}>
                {monthLabel(ym)}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => print("monthly")}
            aria-label="월간 게시용 보고서 인쇄"
            title="월간 게시용 보고서 (A4 1장 · 열람 명단 포함)"
          >
            <StickyNote />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => print("detail")}
            aria-label="대시보드 인쇄"
            title="회의자료용 상세 보고서"
          >
            <Printer />
          </Button>
        </div>
      </div>

      {/* 지표 카드 */}
      <div className="no-print grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-xs" data-size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p
                className={`mt-1 text-3xl font-bold tabular-nums ${s.alert ? "text-destructive" : ""}`}
              >
                {s.value}
                <span className="ml-1 text-base font-medium text-muted-foreground">{s.unit}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 기한 관리 */}
      <div className="no-print grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`size-4 ${m.overdue.length ? "text-destructive" : ""}`} />
              개선기한 초과
            </CardTitle>
            <CardDescription>개선이 끝나지 않은 고위험군 중 기한이 지난 항목</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {m.overdue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">기한을 넘긴 항목이 없습니다</p>
            ) : (
              m.overdue.slice(0, 6).map((e) => (
                <EntryRow
                  key={e.row.id}
                  e={e}
                  right={
                    <span className="shrink-0 text-xs font-medium text-destructive tabular-nums">
                      {Math.abs(daysLeft(e.row.dueDate) ?? 0)}일 초과
                    </span>
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" /> 7일 내 기한 임박
            </CardTitle>
            <CardDescription>이번 주 안에 조치해야 하는 항목</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {m.soon.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">임박한 항목이 없습니다</p>
            ) : (
              m.soon.slice(0, 6).map((e) => (
                <EntryRow
                  key={e.row.id}
                  e={e}
                  right={
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {daysLeft(e.row.dueDate) === 0 ? "오늘" : `${daysLeft(e.row.dueDate)}일 남음`}
                    </span>
                  }
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 위험성 분포 — 개선 전/후 나란히 */}
      <div className="no-print grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>개선 전 위험성 분포 (가능성 × 중대성)</CardTitle>
            <CardDescription>칸을 누르면 해당 항목이 아래에 나옵니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RiskHeatmap
              counts={m.heat}
              likelihoodMax={settings.risk.likelihood.length}
              severityMax={settings.risk.severity.length}
              selected={cell}
              onSelect={setCell}
            />
            {cell && (
              <div className="divide-y rounded-xl bg-muted/40 px-3">
                {cellEntries.map((e) => (
                  <EntryRow key={e.row.id} e={e} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>개선 후 위험성 분포 (가능성 × 중대성)</CardTitle>
            <CardDescription>개선 후 점수가 입력된 항목만 집계합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RiskHeatmap
              counts={m.heatAfter}
              likelihoodMax={settings.risk.likelihood.length}
              severityMax={settings.risk.severity.length}
              selected={cellAfter}
              onSelect={setCellAfter}
            />
            {cellAfter && (
              <div className="divide-y rounded-xl bg-muted/40 px-3">
                {cellAfterEntries.map((e) => (
                  <EntryRow key={e.row.id} e={e} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 위험 집중 지점 */}
      <div className="no-print grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>위험분류별 고위험군</CardTitle>
            <CardDescription>교육·예산 우선순위를 정하는 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList data={m.byClass} emptyLabel="고위험군이 없습니다" />
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>공정별 위험성 건수</CardTitle>
            <CardDescription>점검 순서를 정할 때 위에서부터</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList data={m.byProcess} />
          </CardContent>
        </Card>
      </div>

      {/* 빈칸 점검 */}
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4" /> 빈칸 점검
          </CardTitle>
          <CardDescription>점검·감사에서 먼저 지적되는 미완성 항목입니다</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {gapItems.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => onNavigate(g.go)}
              className="flex w-full items-center gap-2 py-2 text-left transition-colors hover:bg-muted/50"
            >
              {g.n === 0 ? (
                <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Circle className="size-4 shrink-0 text-destructive" />
              )}
              <span className="flex-1 text-sm">{g.label}</span>
              <span className={`text-sm font-medium tabular-nums ${g.n ? "text-destructive" : "text-muted-foreground"}`}>
                {g.n}건
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* 인쇄용 보고서 — 고른 한 종류만 렌더한다 */}
      {sheet === "monthly" ? (
        <MonthlyReportSheet metrics={m} month={month} assessmentCount={assessments.length} />
      ) : (
        <DashboardSheet metrics={m} assessmentCount={assessments.length} />
      )}
    </div>
  );
}
