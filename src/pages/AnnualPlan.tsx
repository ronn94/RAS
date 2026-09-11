/**
 * 이력 관리 · 위험성평가 연간계획표 (원본 서식 SSI-602-02).
 *
 * 다른 메뉴와 달리 **목록을 거치지 않는다** — 연간계획은 한 해에 한 장뿐이라
 * 상단 연도 드롭다운으로 고르고 그 표가 바로 펼쳐진다.
 *
 * 화면은 두 가지 모드다:
 * - **보기(기본)**: 입력칸 없이 완성된 계획표만 보여준다. 게스트는 항상 이 화면만 본다.
 * - **수정**: 관리자가 '수정'을 눌렀을 때만. 칸을 눌러 계획·실적을 켜고 끄고 글을 고친다.
 * 두 모드가 **같은 표 구조**(절차구분·세부절차 세로 병합)를 쓰므로 고치는 중에도
 * 완성본이 어떻게 보일지 그대로 알 수 있다.
 *
 * 실적은 두 갈래로 채워진다:
 * 1) 이미 쌓인 기록에서 자동으로 — 순회점검·설문지·평가표·실시서 등(annualPlan.ts의 autoActual)
 * 2) 관리자가 손으로 — 자동에 안 잡히는 실적(외부 교육 등)을 보완한다
 * 자동으로 켜진 달은 눌러도 꺼지지 않는다(기록이 정본이다). 대신 다른 달은 자유롭게 켜고 끈다.
 */
import * as React from "react";
import { CalendarPlus, Check, Info, Pencil, Printer, Trash2 } from "lucide-react";
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
  spanRuns,
  type AnnualPlan,
  type AutoActual,
  type PlanItemKey,
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
  const [editing, setEditing] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [newYear, setNewYear] = React.useState(String(new Date().getFullYear()));
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const current = annualPlans.find((p) => p.year === (year ?? years[0])) ?? null;
  const [draft, setDraft] = React.useState<AnnualPlan | null>(null);

  /* 다른 해를 고르거나 계획표를 새로 만들었을 때만 편집본을 갈아 끼운다.
     저장할 때마다(updatedAt이 바뀔 때마다) 다시 끼우면, 저장이 오가는 사이에
     누른 칸이 서버 응답으로 덮여 사라진다 — 실제로 겪은 문제라 id로만 본다. */
  React.useEffect(() => {
    setDraft(current ? { ...current, rows: current.rows.map((r) => ({ ...r })) } : null);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 게스트는 수정 화면 자체가 없다 — 권한이 사라지면 보기로 되돌린다 */
  React.useEffect(() => {
    if (!canEdit) setEditing(false);
  }, [canEdit]);

  const auto = React.useMemo(
    () => (draft ? autoActual(draft.year, { assessments, hazardInfos, inspections, surveys, trainings }) : {}),
    [draft?.year, assessments, hazardInfos, inspections, surveys, trainings], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 수정 중에만 자동 저장한다 — 입력이 멈추면 500ms 뒤에 보낸다(평가표 상세와 같은 방식)
  React.useEffect(() => {
    if (!editing || !draft) return;
    const t = setTimeout(() => void saveAnnualPlan(draft), 500);
    return () => clearTimeout(t);
  }, [draft, editing]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** 수정을 마칠 때는 디바운스를 기다리지 않고 바로 저장한다(마지막 한 글자가 빠지지 않게) */
  const finishEdit = async () => {
    if (!draft) return setEditing(false);
    setSaving(true);
    try {
      await saveAnnualPlan(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const addYear = async () => {
    const y = Number(newYear);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return;
    if (annualPlans.some((p) => p.year === y)) return;
    await saveAnnualPlan(createAnnualPlan(y));
    setYear(y);
    setNewOpen(false);
    setEditing(true); // 막 만든 계획표는 바로 채워 넣게 수정 화면으로 연다
  };

  const overall = draft ? overallProgress(draft, auto) : null;
  const duplicate = annualPlans.some((p) => p.year === Number(newYear));

  return (
    <div>
      {/* 화면 전용 — 인쇄할 때는 통째로 숨기고 아래 인쇄 서식만 찍는다 */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="mt-1 text-sm text-muted-foreground">
            한 해의 위험성평가 추진 일정과 실적입니다. 순회점검·설문지·평가표·실시서에 쌓인 기록은 실적에 자동으로
            반영됩니다.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {years.length > 0 && !editing && (
              <Select className="h-9" value={String(year ?? years[0])} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </Select>
            )}
            {draft && !editing && (
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => window.print()}
                aria-label="연간계획표 인쇄"
                title="연간계획표 인쇄 (A4 가로 1장)"
              >
                <Printer />
              </Button>
            )}
            {/* 등록과 수정은 따로 둔다 — 보기 화면에서는 고칠 수 없다 */}
            {draft && canEdit && !editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> 수정
              </Button>
            )}
            {editing && (
              <Button disabled={saving} onClick={() => void finishEdit()}>
                <Check className="size-3.5" /> {saving ? "저장 중…" : "수정 완료"}
              </Button>
            )}
            {canEdit && !editing && (
              <Button onClick={() => setNewOpen(true)}>
                <CalendarPlus className="size-3.5" /> 연도 등록
              </Button>
            )}
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
                {canEdit
                  ? "등록된 연간계획표가 없습니다. ‘연도 등록’으로 시작하세요."
                  : "등록된 연간계획표가 없습니다."}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            {editing && (
              <div className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm">
                <Pencil className="size-3.5 shrink-0" />
                {draft.year}년 계획표를 고치는 중입니다. 월 칸을 눌러 계획·실적을 켜고 끕니다. 다 고쳤으면
                &lsquo;수정 완료&rsquo;를 누르세요.
              </div>
            )}

            {/* 요약 — 전체 이행률과 결재자 */}
            <Card className="shadow-xs">
              <CardContent className="flex flex-wrap items-end justify-between gap-4 pt-6">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">{draft.year}년 전체 이행률</p>
                    <p className="font-heading text-2xl font-semibold tabular-nums">
                      {overall === null ? "-" : `${overall}%`}
                    </p>
                  </div>
                  <p className="max-w-md text-xs text-muted-foreground">
                    <Info className="mr-1 inline size-3.5" />
                    계획한 달 수 대비 실제로 실시한 달 수입니다(100% 상한). 계획을 표시하지 않은 줄은 계산에서
                    뺍니다.
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
                      {editing ? (
                        <Input
                          className="h-8 w-28"
                          list="ras-staff"
                          value={draft.approver[key]}
                          onChange={(e) =>
                            setDraft((d) => (d ? { ...d, approver: { ...d.approver, [key]: e.target.value } } : d))
                          }
                          placeholder={settings.org.approver[key] || "-"}
                        />
                      ) : (
                        <p className="flex h-8 w-28 items-center text-sm">
                          {draft.approver[key] || settings.org.approver[key] || "-"}
                        </p>
                      )}
                    </div>
                  ))}
                  <datalist id="ras-staff">
                    {settings.staff.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                  {editing && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={!canDelete}
                      className="mb-1 text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                      aria-label="이 연도 계획표 삭제"
                      title="이 연도 계획표 삭제"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="py-0 shadow-xs">
              <CardContent className="p-0">
                <PlanTable
                  plan={draft}
                  auto={auto}
                  editing={editing}
                  onPatchRow={patchRow}
                  onToggle={toggleMonth}
                />
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              <span className="mr-1 inline-block size-2.5 rounded-full ring-1 ring-foreground/40 align-middle" /> 계획 ·
              <span className="mx-1 inline-block size-2.5 rounded-full bg-series-1 align-middle" /> 자동 집계된 실적 ·
              <span className="mx-1 inline-block size-2.5 rounded-full bg-foreground align-middle" /> 손으로 표시한 실적
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
                : years.some((y) => y < Number(newYear))
                  ? `지난해(${Math.max(...years.filter((y) => y < Number(newYear)))}년) 계획을 그대로 가져오고 실적만 비웁니다.`
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
                setEditing(false);
                setYear(null);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </Dialog>
      </div>

      {draft && <AnnualPlanSheet plan={draft} auto={auto} />}
    </div>
  );
}

/**
 * 계획표 본체 — 보기와 수정이 **같은 표 구조**를 쓴다.
 * 절차구분·세부절차는 원본 서식처럼 연달아 같은 값을 세로로 묶는다(spanRuns).
 * 저장된 줄이 아니라 서식(PLAN_TEMPLATE) 순서로 돌아 옛 문서에 빠진 줄이 있어도 칸이 밀리지 않는다.
 */
function PlanTable({
  plan,
  auto,
  editing,
  onPatchRow,
  onToggle,
}: {
  plan: AnnualPlan;
  auto: Partial<Record<PlanItemKey, AutoActual>>;
  editing: boolean;
  onPatchRow: (key: string, p: Partial<PlanRow>) => void;
  onToggle: (key: string, kind: "plan" | "actual", m: number) => void;
}) {
  const byKey = new Map(plan.rows.map((r) => [r.key, r]));
  const groupRuns = spanRuns(PLAN_TEMPLATE, (t) => t.group);
  const stepRuns = spanRuns(PLAN_TEMPLATE, (t) => `${t.group}|${t.step}`);
  const subRuns = spanRuns(PLAN_TEMPLATE, (t) => `${t.group}|${t.step}|${t.sub ?? ""}`);
  const startOf = (runs: { start: number; len: number }[], i: number) => runs.find((r) => r.start === i);

  return (
    <TableWrap>
      <Table className="min-w-[76rem] [&_:is(th,td)]:px-2">
        <THead>
          <TR>
            <TH className="w-24">절차구분</TH>
            <TH className="w-28" colSpan={2}>
              세부절차
            </TH>
            <TH className="w-56">세부내용</TH>
            <TH className="w-20">대상</TH>
            <TH className="w-16">목표</TH>
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
          {PLAN_TEMPLATE.map((t, i) => {
            const row = byKey.get(t.key);
            if (!row) return null;
            const a = auto[t.key];
            const done = actualMonths(row, a);
            const rate = progressOf(row, a);
            const gRun = startOf(groupRuns, i);
            const sRun = startOf(stepRuns, i);
            const dRun = startOf(subRuns, i);
            // 세부절차 묶음에 아래 단계가 있으면 한 칸, 없으면 두 칸을 차지한다
            const stepStartsSub = sRun ? !!PLAN_TEMPLATE[sRun.start].sub : false;
            return (
              <React.Fragment key={t.key}>
                <TR className="border-t-2">
                  {gRun && (
                    // 수시평가·작업위험성은 원본에서 절차구분이 세부절차 칸까지 먹는다
                    <TD
                      rowSpan={gRun.len * 2}
                      colSpan={t.wide ? 3 : 1}
                      className="bg-muted/40 align-middle text-xs font-medium whitespace-nowrap"
                    >
                      {t.group.replace(/\n/g, " ")}
                    </TD>
                  )}
                  {!t.wide && sRun && (
                    <TD
                      rowSpan={sRun.len * 2}
                      colSpan={stepStartsSub ? 1 : 2}
                      className="align-middle text-xs whitespace-nowrap text-muted-foreground"
                    >
                      {t.step.replace(/\n/g, " ")}
                    </TD>
                  )}
                  {/* 아래 단계 칸은 **그 줄에 sub가 있는지**로 판단한다 — 묶음의 첫 줄 여부로
                      판단하면 첫 줄이 아닌 곳에서 시작하는 묶음이 빠져 칸이 밀린다 */}
                  {!t.wide && t.sub && dRun && (
                    <TD rowSpan={dRun.len * 2} className="align-middle text-xs whitespace-nowrap text-muted-foreground">
                      {t.sub.replace(/\n/g, " ")}
                    </TD>
                  )}
                  <TD rowSpan={2} className="align-top">
                    <CellText
                      editing={editing}
                      multiline
                      value={row.detail}
                      onChange={(v) => onPatchRow(t.key, { detail: v })}
                    />
                    {t.auto && (
                      <p className="mt-0.5 text-[11px] text-series-1">
                        자동 집계: {t.auto}
                        {a && a.count > 0 ? ` · ${a.count}건` : ""}
                      </p>
                    )}
                  </TD>
                  <TD rowSpan={2} className="align-top whitespace-nowrap">
                    <CellText editing={editing} value={row.target} onChange={(v) => onPatchRow(t.key, { target: v })} />
                  </TD>
                  <TD rowSpan={2} className="align-top">
                    <CellText editing={editing} value={row.goal} onChange={(v) => onPatchRow(t.key, { goal: v })} />
                  </TD>
                  <TD className="text-center text-xs text-muted-foreground">계획</TD>
                  {MONTHS.map((m) => (
                    <MonthCell
                      key={m}
                      on={row.plan.includes(m)}
                      tone="plan"
                      editing={editing}
                      onClick={() => onToggle(t.key, "plan", m)}
                    />
                  ))}
                  <TD rowSpan={2} className="align-top">
                    <CellText editing={editing} multiline value={row.note} onChange={(v) => onPatchRow(t.key, { note: v })} />
                  </TD>
                  <TD rowSpan={2} className="text-center align-middle">
                    <RateBadge rate={rate} />
                  </TD>
                </TR>
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
                        editing={editing && !fromData}
                        title={fromData ? `${t.auto} 기록이 있어 자동으로 표시됩니다` : undefined}
                        onClick={() => onToggle(t.key, "actual", m)}
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
  );
}

/** 수정 중이면 입력칸, 보기 중이면 글자만 — 완성본에는 빈 입력 상자가 보이지 않는다 */
function CellText({
  editing,
  value,
  onChange,
  /** 세부내용처럼 원문에 줄바꿈이 있는 칸만 켠다. 대상·목표 같은 짧은 낱말에 켜면
      좁은 칸에서 한 글자씩 쪼개져 읽기 나빠진다(전 구성원 → 전 구성 원) */
  multiline = false,
}: {
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  if (!editing) {
    return (
      <p className={cn("py-1 text-xs", multiline ? "whitespace-pre-line" : "whitespace-nowrap")}>{value || "-"}</p>
    );
  }
  return <Input className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />;
}

/** 월 칸 하나 — 수정 중에만 눌러서 켜고 끈다. 자동으로 잡힌 실적은 색을 달리해 구분한다 */
function MonthCell({
  on,
  tone,
  editing,
  title,
  onClick,
}: {
  on: boolean;
  tone: "plan" | "actual" | "auto";
  editing: boolean;
  title?: string;
  onClick: () => void;
}) {
  const dot = on && (
    <span
      className={cn(
        "block size-2.5 rounded-full",
        tone === "plan" ? "ring-1 ring-foreground/60" : tone === "auto" ? "bg-series-1" : "bg-foreground",
      )}
    />
  );
  if (!editing) {
    return (
      <TD className="p-0 text-center" title={title}>
        <span className="grid h-7 w-full place-content-center">{dot}</span>
      </TD>
    );
  }
  return (
    <TD className="p-0 text-center">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-pressed={on}
        className="grid h-7 w-full cursor-pointer place-content-center transition-colors hover:bg-muted"
      >
        {dot}
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
