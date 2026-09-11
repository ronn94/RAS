/**
 * 이력 관리 · 위험성평가 연간계획표 (원본 서식 SSI-602-02).
 *
 * 다른 메뉴와 달리 **목록을 거치지 않는다** — 연간계획은 한 해에 한 장뿐이라
 * 상단 연도 드롭다운으로 고르고 그 표가 바로 펼쳐진다.
 *
 * 실적은 두 갈래로 채워진다:
 * 1) 이미 쌓인 기록에서 자동으로 — 순회점검·설문지·평가표·실시서 등(annualPlan.ts의 autoActual)
 * 2) 관리자가 손으로 — 자동에 안 잡히는 실적(외부 교육 등)을 보완한다
 * 자동으로 켜진 달은 눌러도 꺼지지 않는다(기록이 정본이다). 대신 다른 달은 자유롭게 켜고 끈다.
 */
import * as React from "react";
import { CalendarPlus, Info, Printer, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableWrap,
} from "@/components/ui";
import { AnnualPlanSheet } from "@/print/AnnualPlanSheet";
import {
  actualMonths,
  autoActual,
  overallProgress,
  PLAN_TEMPLATE,
  progressOf,
  type AnnualPlan,
  type PlanRow,
} from "@/lib/annualPlan";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function AnnualPlanPage() {
  const {
    annualPlans,
    assessments,
    hazardInfos,
    inspections,
    surveys,
    trainings,
    settings,
    loading,
    canEdit,
    canDelete,
    createAnnualPlan,
    saveAnnualPlan,
    removeAnnualPlan,
  } = useStore();

  const years = [...new Set(annualPlans.map((p) => p.year))].sort((a, b) => b - a);
  const [year, setYear] = React.useState<number | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [newYear, setNewYear] = React.useState(String(new Date().getFullYear()));
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // 고른 해가 없으면 가장 최근 계획표를 연다
  const current = annualPlans.find((p) => p.year === (year ?? years[0])) ?? null;
  const [draft, setDraft] = React.useState<AnnualPlan | null>(null);

  /* 다른 해를 고르거나 계획표를 새로 만들었을 때만 편집본을 갈아 끼운다.
     저장할 때마다(updatedAt이 바뀔 때마다) 다시 끼우면, 저장이 오가는 사이에
     누른 칸이 서버 응답으로 덮여 사라진다 — 실제로 겪은 문제라 id로만 본다. */
  React.useEffect(() => {
    setDraft(current ? { ...current, rows: current.rows.map((r) => ({ ...r })) } : null);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const auto = React.useMemo(
    () => (draft ? autoActual(draft.year, { assessments, hazardInfos, inspections, surveys, trainings }) : {}),
    [draft?.year, assessments, hazardInfos, inspections, surveys, trainings], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 입력 중에는 로컬 상태로 두고 멈추면 저장한다(평가표 상세와 같은 방식)
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current || !draft) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void saveAnnualPlan(draft), 500);
    return () => clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchRow = (key: string, p: Partial<PlanRow>) =>
    setDraft((d) => (d ? { ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...p } : r)) } : d));

  /* 켜고 끄기는 반드시 **직전 상태**에서 계산한다 — 렌더 시점에 잡아 둔 값으로 계산하면
     빠르게 여러 칸을 누를 때 중간 것이 사라진다(마지막 클릭만 남는다) */
  const toggleMonth = (key: string, kind: "plan" | "actual", m: number) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            rows: d.rows.map((r) => {
              if (r.key !== key) return r;
              const list = r[kind];
              return {
                ...r,
                [kind]: list.includes(m) ? list.filter((x) => x !== m) : [...list, m].sort((a, b) => a - b),
              };
            }),
          }
        : d,
    );

  const addYear = async () => {
    const y = Number(newYear);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return;
    if (annualPlans.some((p) => p.year === y)) return;
    const plan = createAnnualPlan(y);
    await saveAnnualPlan(plan);
    setYear(y);
    setNewOpen(false);
  };

  const overall = draft ? overallProgress(draft, auto) : null;
  const duplicate = annualPlans.some((p) => p.year === Number(newYear));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          한 해의 위험성평가 추진 일정을 계획하고 실적을 관리합니다. 순회점검·설문지·평가표·실시서에 쌓인 기록은
          실적에 자동으로 반영됩니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {years.length > 0 && (
            <Select
              className="h-9"
              value={String(year ?? years[0])}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </Select>
          )}
          {draft && (
            <Button variant="outline" size="icon-lg" onClick={() => window.print()} aria-label="연간계획표 인쇄" title="연간계획표 인쇄 (A4 가로 1장)">
              <Printer />
            </Button>
          )}
          <Button disabled={!canEdit} onClick={() => setNewOpen(true)} title={canEdit ? undefined : "등록은 관리자만 할 수 있습니다"}>
            <CalendarPlus className="size-3.5" /> 연도 등록
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="py-0 shadow-xs">
          <CardContent className="p-0">
            <EmptyState>불러오는 중…</EmptyState>
          </CardContent>
        </Card>
      ) : !draft ? (
        <Card className="py-0 shadow-xs">
          <CardContent className="p-0">
            <EmptyState icon={<CalendarPlus className="size-6 text-muted-foreground" />}>
              등록된 연간계획표가 없습니다. &lsquo;연도 등록&rsquo;으로 시작하세요.
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 요약 — 전체 이행률과 결재자 */}
          <Card className="shadow-xs">
            <CardContent className="flex flex-wrap items-end justify-between gap-4 pt-6">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">전체 이행률</p>
                  <p className="font-heading text-2xl font-semibold tabular-nums">
                    {overall === null ? "-" : `${overall}%`}
                  </p>
                </div>
                <p className="max-w-md text-xs text-muted-foreground">
                  <Info className="mr-1 inline size-3.5" />
                  계획한 달 수 대비 실제로 실시한 달 수입니다(100% 상한). 계획을 표시하지 않은 줄은 계산에서 뺍니다.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {(
                  [
                    ["charge", "담당"],
                    ["review", "검토"],
                    ["approve", "승인"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input
                      className="h-8 w-28"
                      disabled={!canEdit}
                      list="ras-staff"
                      value={draft.approver[key]}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, approver: { ...d.approver, [key]: e.target.value } } : d))
                      }
                      placeholder={settings.org.approver[key] || "-"}
                    />
                  </div>
                ))}
                <datalist id="ras-staff">
                  {settings.staff.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!canDelete}
                  className="mb-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                  aria-label="이 연도 계획표 삭제"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0 shadow-xs">
            <CardContent className="p-0">
              <TableWrap>
                <Table className="min-w-[72rem] [&_:is(th,td)]:px-2">
                  <THead>
                    <TR>
                      <TH className="w-24">절차구분</TH>
                      <TH className="w-28">세부절차</TH>
                      <TH className="w-52">세부내용</TH>
                      <TH className="w-24">대상</TH>
                      <TH className="w-20">목표</TH>
                      <TH className="w-12 text-center">구분</TH>
                      {MONTHS.map((m) => (
                        <TH key={m} className="w-8 text-center text-[11px]">
                          {m}M
                        </TH>
                      ))}
                      <TH className="w-32">비고</TH>
                      <TH className="w-20 text-center">이행률</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {draft.rows.map((row) => {
                      const t = PLAN_TEMPLATE.find((x) => x.key === row.key);
                      if (!t) return null;
                      const a = auto[row.key];
                      const done = actualMonths(row, a);
                      const rate = progressOf(row, a);
                      return (
                        <React.Fragment key={row.key}>
                          {/* 계획 줄 — 항목 칸들은 여기서만 그리고 실적 줄과 세로로 묶는다 */}
                          <TR className="border-t-2">
                            <TD rowSpan={2} className="align-top text-xs whitespace-pre-line">
                              {t.group}
                            </TD>
                            <TD rowSpan={2} className="align-top text-xs whitespace-pre-line text-muted-foreground">
                              {t.wide ? "" : [t.step, t.sub].filter(Boolean).join("\n").replace(/\n+/g, " · ")}
                            </TD>
                            <TD rowSpan={2} className="align-top">
                              <Input
                                className="h-8 text-xs"
                                disabled={!canEdit}
                                value={row.detail}
                                onChange={(e) => patchRow(row.key, { detail: e.target.value })}
                              />
                              {t.auto && (
                                <p className="mt-1 text-[11px] text-series-1">
                                  자동 집계: {t.auto}
                                  {a && a.count > 0 ? ` · ${a.count}건` : ""}
                                </p>
                              )}
                            </TD>
                            <TD rowSpan={2} className="align-top">
                              <Input
                                className="h-8 text-xs"
                                disabled={!canEdit}
                                value={row.target}
                                onChange={(e) => patchRow(row.key, { target: e.target.value })}
                              />
                            </TD>
                            <TD rowSpan={2} className="align-top">
                              <Input
                                className="h-8 text-xs"
                                disabled={!canEdit}
                                value={row.goal}
                                onChange={(e) => patchRow(row.key, { goal: e.target.value })}
                              />
                            </TD>
                            <TD className="text-center text-xs text-muted-foreground">계획</TD>
                            {MONTHS.map((m) => (
                              <MonthCell
                                key={m}
                                on={row.plan.includes(m)}
                                tone="plan"
                                disabled={!canEdit}
                                onClick={() => toggleMonth(row.key, "plan", m)}
                              />
                            ))}
                            <TD rowSpan={2} className="align-top">
                              <Input
                                className="h-8 text-xs"
                                disabled={!canEdit}
                                value={row.note}
                                onChange={(e) => patchRow(row.key, { note: e.target.value })}
                              />
                            </TD>
                            <TD rowSpan={2} className="text-center align-middle">
                              <RateBadge rate={rate} />
                            </TD>
                          </TR>
                          {/* 실적 줄 */}
                          <TR>
                            <TD className="text-center text-xs text-muted-foreground">실적</TD>
                            {MONTHS.map((m) => {
                              const fromData = a?.months.includes(m) ?? false;
                              return (
                                <MonthCell
                                  key={m}
                                  on={done.includes(m)}
                                  tone={fromData ? "auto" : "actual"}
                                  // 자동으로 잡힌 달은 기록이 정본이라 끄지 못한다
                                  disabled={!canEdit || fromData}
                                  title={fromData ? `${t.auto} 기록이 있어 자동으로 표시됩니다` : undefined}
                                  onClick={() => toggleMonth(row.key, "actual", m)}
                                />
                              );
                            })}
                          </TR>
                        </React.Fragment>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            <span className="mr-1 inline-block size-2.5 rounded-full bg-series-1 align-middle" /> 자동 집계된 실적 ·
            <span className="mx-1 inline-block size-2.5 rounded-full bg-foreground align-middle" /> 손으로 표시한 실적 ·
            <span className="mx-1 inline-block size-2.5 rounded-full ring-1 ring-foreground/40 align-middle" /> 계획
          </p>
        </>
      )}

      {/* 새 연도 등록 */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)}>
        <DialogHeader>
          <DialogTitle>새 연도 계획표를 만들까요?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>연도</Label>
          <Input type="number" min={2000} max={2100} value={newYear} onChange={(e) => setNewYear(e.target.value)} />
          <p className="text-sm text-muted-foreground">
            {duplicate
              ? "이미 그 해의 계획표가 있습니다."
              : years.length > 0
                ? `가장 가까운 지난해(${Math.max(...years.filter((y) => y < Number(newYear)), 0) || "-"}년) 계획을 그대로 가져오고 실적만 비웁니다.`
                : "서식 항목만 들어있는 빈 계획표로 시작합니다."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNewOpen(false)}>
            취소
          </Button>
          <Button disabled={duplicate} onClick={() => void addYear()}>
            만들기
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogHeader>
          <DialogTitle>{draft?.year}년 계획표를 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          계획 표시와 손으로 적은 실적·비고가 사라집니다(순회점검·설문지 같은 원래 기록은 그대로 남습니다).
          되돌릴 수 없습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (draft) await removeAnnualPlan(draft.id);
              setDeleteOpen(false);
              setYear(null);
            }}
          >
            삭제
          </Button>
        </DialogFooter>
      </Dialog>

      {draft && <AnnualPlanSheet plan={draft} auto={auto} />}
    </div>
  );
}

/** 월 칸 하나 — 눌러서 켜고 끈다. 자동으로 잡힌 실적은 색을 달리해 구분한다 */
function MonthCell({
  on,
  tone,
  disabled,
  title,
  onClick,
}: {
  on: boolean;
  tone: "plan" | "actual" | "auto";
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <TD className="p-0 text-center">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title}
        aria-pressed={on}
        className={cn(
          "grid h-7 w-full place-content-center transition-colors",
          disabled ? "cursor-default" : "cursor-pointer hover:bg-muted",
        )}
      >
        {on && (
          <span
            className={cn(
              "block size-2.5 rounded-full",
              tone === "plan" ? "ring-1 ring-foreground/60" : tone === "auto" ? "bg-series-1" : "bg-foreground",
            )}
          />
        )}
      </button>
    </TD>
  );
}

function RateBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal tabular-nums",
        rate >= 100 ? "bg-series-1/10 text-series-1" : rate > 0 ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {rate}%
    </Badge>
  );
}
