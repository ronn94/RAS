/**
 * 작업 위험성평가 작성 — 원본 프로그램(위험성평가 작성 프로그램 ver.3.3)의 5단계 흐름을
 * 우리 앱 서식으로 옮긴 화면.
 *
 * 단계를 나눈 이유는 입력량 때문이다 — 매트릭스만 17칸이고 참여자·준비사항이 따로 붙어서
 * 한 화면에 다 펼치면 어디까지 했는지 놓친다. 단계 머리를 눌러 앞뒤로 자유롭게 오간다.
 *
 * 점수 축은 정기평가와 같다(피해강도 = 중대성 1~4, 사고빈도 = 가능성 1~5). 그래서
 * riskOf와 설정의 고위험군 기준점을 그대로 쓰고, 기준점 이상이면 '허용 불가능'으로 본다.
 *
 * 서명은 실시서·공람표와 같은 규칙이다 — 본문 저장과 따로 전용 경로로 즉시 남긴다.
 */
import * as React from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Lock,
  PenLine,
  Plus,
  Printer,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Textarea,
} from "@/components/ui";
import { SignatureCanvas, signatureDataUrl } from "@/components/signature";
import { usePhotoUrl } from "@/components/photo";
import { JobAssessmentSheet } from "@/print/JobAssessmentSheet";
import {
  ACTIONS_BY_CODE,
  emptyJobParticipant,
  emptyJobRow,
  FINISH_ITEMS,
  FREQUENCY_GUIDE,
  JOB_EVAL_TYPES,
  JOB_TEAMS,
  JRA_FREQUENCY,
  JRA_INTENSITY,
  JRA_PROBABILITY,
  jraLabel,
  PPE_ITEMS,
  PRE_JOB_ITEMS,
  SEVERITY_GUIDE,
  scoredRows,
  signedParticipants,
  type JobAssessment,
  type JobParticipant,
  type JobRow,
} from "@/lib/jobAssessment";
import { allTypes, codeLabel } from "@/lib/settings";
import { riskBadgeClass, riskOf } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const STEPS = ["기본 정보", "참여자", "위험성평가 실시", "작업 전 준비", "확인·인쇄"] as const;

export function JobAssessmentDetail({
  job,
  isNew,
  onDone,
}: {
  job: JobAssessment;
  isNew?: boolean;
  onDone: (saved: boolean) => void;
}) {
  const { saveJobAssessment, signJobAssessment, settings, identity, canJobAssessment } = useStore();
  const [draft, setDraft] = React.useState<JobAssessment>(job);
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [signTarget, setSignTarget] = React.useState<JobParticipant | null>(null);

  const isAdmin = identity.role === "admin";
  const readOnly = !!draft.locked && !isAdmin;
  const canWrite = canJobAssessment && !readOnly;
  /** 서명도 같은 권한(jobAssessment)을 본다 — 서버의 서명 전용 경로도 이 권한을 요구한다.
      다만 아직 등록되지 않은 문서에는 서명할 수 없다(서버에 참여자가 없다) */
  const canSign = canJobAssessment && !isNew && !readOnly;
  const threshold = settings.risk.threshold;
  const codes = React.useMemo(() => allTypes(settings), [settings]);

  const patch = (p: Partial<JobAssessment>) => setDraft((d) => ({ ...d, ...p }));

  const missing = [
    !draft.mainCategory && "대분류",
    !draft.content && "내용",
    !draft.date && "평가일자",
    !draft.team && "구분",
    !draft.evaluator && "평가자",
  ].filter(Boolean) as string[];

  const submit = async () => {
    if (missing.length) return;
    setSaving(true);
    try {
      await saveJobAssessment(draft);
      onDone(true);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    const touched = JSON.stringify(draft) !== JSON.stringify(job);
    if (touched && !confirm("작성 중인 내용이 저장되지 않습니다. 나갈까요?")) return;
    onDone(false);
  };

  /* ── 매트릭스 ──────────────────────────────────────────── */
  const patchRow = (id: string, p: Partial<JobRow>) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) }));

  /** 위험코드를 바꾸면 그 코드의 조치사항 후보를 **전부 켠 상태**로 갈아 끼운다(원본과 같다) */
  const changeCode = (id: string, code: string) =>
    patchRow(id, { hazardCode: code, actions: [...(ACTIONS_BY_CODE[code] ?? [])] });

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const addRow = (kind: JobRow["kind"]) =>
    setDraft((d) => ({ ...d, rows: [...d.rows, emptyJobRow(kind)] }));

  const moveRow = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const i = d.rows.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.rows.length) return d;
      const rows = [...d.rows];
      [rows[i], rows[j]] = [rows[j], rows[i]];
      return { ...d, rows };
    });

  /* ── 참여자 ────────────────────────────────────────────── */
  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));
  const internalNames = new Set(draft.participants.filter((p) => !p.external).map((p) => p.name.trim()));

  const toggleStaff = (name: string) =>
    setDraft((d) => {
      const found = d.participants.find((p) => !p.external && p.name.trim() === name);
      if (!found) return { ...d, participants: [...d.participants, emptyJobParticipant(false, name)] };
      if (found.sign && !confirm(`${name} 님은 이미 서명했습니다. 명단에서 빼면 서명도 지워집니다. 계속할까요?`)) {
        return d;
      }
      return { ...d, participants: d.participants.filter((p) => p.id !== found.id) };
    });

  /** '전체 선택'은 아직 안 담긴 직원만 채워 넣고, '전체 해제'는 서명 받은 사람이 있으면 물어본다 */
  const selectAllStaff = () =>
    setDraft((d) => {
      const already = new Set(d.participants.filter((p) => !p.external).map((p) => p.name.trim()));
      const added = staff.filter((n) => !already.has(n)).map((n) => emptyJobParticipant(false, n));
      return added.length ? { ...d, participants: [...d.participants, ...added] } : d;
    });

  const deselectAllStaff = () =>
    setDraft((d) => {
      const internalStaff = d.participants.filter((p) => !p.external && staff.includes(p.name.trim()));
      const signedCount = internalStaff.filter((p) => p.sign).length;
      if (signedCount > 0 && !confirm(`이미 서명한 내부 참여자 ${signedCount}명도 함께 빠집니다. 계속할까요?`)) {
        return d;
      }
      const removeIds = new Set(internalStaff.map((p) => p.id));
      return { ...d, participants: d.participants.filter((p) => !removeIds.has(p.id)) };
    });

  const patchParticipant = (id: string, p: Partial<JobParticipant>) =>
    setDraft((d) => ({ ...d, participants: d.participants.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  /** 서명은 즉시 서버에 남기고 돌아온 문서로 화면 사본도 맞춘다 */
  const applySign = async (participantId: string, image: string | null) => {
    const next = await signJobAssessment(draft.id, participantId, image);
    setDraft((d) => ({ ...d, participants: next.participants, updatedAt: next.updatedAt }));
  };

  const signed = signedParticipants(draft);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={goBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">
              {isNew ? "새 작업 위험성평가" : "작업 위험성평가"}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {draft.date || "일자 미입력"} ·{" "}
              {[draft.mainCategory, draft.subCategory].filter(Boolean).join(" · ") || "분류 미입력"}
              <Badge variant="outline" className="font-normal">
                JRA {jraLabel(draft)}
              </Badge>
              {draft.participants.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  서명 {signed}/{draft.participants.length}
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            disabled={isNew}
            onClick={() => window.print()}
            aria-label="작업평가 인쇄"
            title={isNew ? "등록한 뒤에 인쇄할 수 있습니다" : "작업 위험성평가 인쇄 (A4 가로)"}
          >
            <Printer />
          </Button>
          {canWrite && (
            <Button disabled={saving || missing.length > 0} onClick={() => void submit()}>
              {saving ? "저장 중…" : isNew ? "등록" : "저장"}
            </Button>
          )}
        </div>
      </div>

      {missing.length > 0 && canWrite && (
        <p className="no-print text-sm text-muted-foreground">
          <TriangleAlert className="mr-1 inline size-3.5" />
          {missing.join(" · ")}을(를) 채워야 {isNew ? "등록" : "저장"}할 수 있습니다.
        </p>
      )}

      {readOnly && (
        <div className="no-print flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          관리자가 잠근 문서입니다. 내용은 볼 수 있지만 고치거나 서명할 수 없습니다.
        </div>
      )}

      {!canJobAssessment && !readOnly && (
        <div className="no-print rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          관리자가 게스트의 작업평가 권한을 껐습니다(설정 → 게스트 권한). 내용은 볼 수 있지만 고치거나
          서명할 수 없습니다.
        </div>
      )}

      {/* 단계 머리 — 눌러서 자유롭게 오간다 */}
      <div className="no-print flex flex-wrap gap-1.5">
        {STEPS.map((name, i) => {
          const n = i + 1;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setStep(n)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                n === step ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-content-center rounded-full text-[11px] font-bold",
                  n === step ? "bg-primary-foreground/20" : "bg-background",
                )}
              >
                {n}
              </span>
              {name}
            </button>
          );
        })}
      </div>

      <div className="no-print">
        {step === 1 && (
          <StepBasic draft={draft} patch={patch} canWrite={canWrite} processes={settings.processes} />
        )}
        {step === 2 && (
          <StepParticipants
            draft={draft}
            patch={patch}
            canWrite={canWrite}
            canSign={canSign}
            isNew={!!isNew}
            staff={staff}
            internalNames={internalNames}
            toggleStaff={toggleStaff}
            selectAllStaff={selectAllStaff}
            deselectAllStaff={deselectAllStaff}
            patchParticipant={patchParticipant}
            setDraft={setDraft}
            onSign={setSignTarget}
            onClearSign={(id) => void applySign(id, null)}
          />
        )}
        {step === 3 && (
          <StepMatrix
            draft={draft}
            canWrite={canWrite}
            threshold={threshold}
            codes={codes}
            settings={settings}
            patchRow={patchRow}
            changeCode={changeCode}
            toggleIn={toggleIn}
            addRow={addRow}
            moveRow={moveRow}
            setDraft={setDraft}
          />
        )}
        {step === 4 && <StepPreJob draft={draft} patch={patch} canWrite={canWrite} toggleIn={toggleIn} />}
        {step === 5 && <StepReview draft={draft} patch={patch} canWrite={canWrite} threshold={threshold} />}
      </div>

      {/* 단계 이동 */}
      <div className="no-print flex items-center justify-between">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
          <ChevronLeft className="size-3.5" /> 이전
        </Button>
        <span className="text-xs text-muted-foreground">
          {step} / {STEPS.length} 단계
        </span>
        <Button
          variant="outline"
          disabled={step === STEPS.length}
          onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
        >
          다음 <ChevronRight className="size-3.5" />
        </Button>
      </div>

      <SignDialog
        participant={signTarget}
        onClose={() => setSignTarget(null)}
        onSave={async (dataUrl) => {
          if (!signTarget) return;
          await applySign(signTarget.id, dataUrl);
          setSignTarget(null);
        }}
      />

      <JobAssessmentSheet job={draft} />
    </div>
  );
}

/* ── 1단계: 기본 정보 ───────────────────────────────────── */
function StepBasic({
  draft,
  patch,
  canWrite,
  processes,
}: {
  draft: JobAssessment;
  patch: (p: Partial<JobAssessment>) => void;
  canWrite: boolean;
  processes: string[];
}) {
  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>어떤 작업을 어디서 하는지 적습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>대분류</Label>
              {/* 설정의 공정명 목록을 그대로 쓴다 — 다른 메뉴와 같은 이름을 쓰기 위해서다 */}
              <Select
                className="w-full"
                disabled={!canWrite}
                value={draft.mainCategory}
                onChange={(e) => patch({ mainCategory: e.target.value })}
              >
                <option value="">선택하세요</option>
                {(draft.mainCategory && !processes.includes(draft.mainCategory)
                  ? [...processes, draft.mainCategory]
                  : processes
                ).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>중분류</Label>
              <Input
                disabled={!canWrite}
                value={draft.subCategory}
                onChange={(e) => patch({ subCategory: e.target.value })}
                placeholder="예: 침사지 조목스크린"
              />
            </div>
            <div className="space-y-1.5">
              <Label>세분류</Label>
              <Input
                disabled={!canWrite}
                value={draft.detailCategory}
                onChange={(e) => patch({ detailCategory: e.target.value })}
                placeholder="예: 스크린 구동부"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1.5">
              <Label>내용</Label>
              <Input
                disabled={!canWrite}
                value={draft.content}
                onChange={(e) => patch({ content: e.target.value })}
                placeholder="상세 작업 내용"
              />
            </div>
            <div className="space-y-1.5">
              <Label>위험성평가 구분</Label>
              <Select
                className="w-full"
                disabled={!canWrite}
                value={draft.evalType}
                onChange={(e) => patch({ evalType: e.target.value as JobAssessment["evalType"] })}
              >
                {JOB_EVAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>JRA 평가 설정</CardTitle>
          <CardDescription>
            작업 자체의 위험도를 미리 가늠하는 등급입니다. 아래 매트릭스 점수(강도 × 빈도)와는 별개로, 세 값을{" "}
            <strong>더해서</strong> A·B·C를 정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>강도</Label>
            <Select
              className="w-full"
              disabled={!canWrite}
              value={String(draft.jraI)}
              onChange={(e) => patch({ jraI: Number(e.target.value) })}
            >
              {JRA_INTENSITY.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>빈도</Label>
            <Select
              className="w-full"
              disabled={!canWrite}
              value={String(draft.jraF)}
              onChange={(e) => patch({ jraF: Number(e.target.value) })}
            >
              {JRA_FREQUENCY.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>가능성</Label>
            <Select
              className="w-full"
              disabled={!canWrite}
              value={String(draft.jraP)}
              onChange={(e) => patch({ jraP: Number(e.target.value) })}
            >
              {JRA_PROBABILITY.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label>위험등급 결과</Label>
            <p className="flex h-9 items-center font-heading text-lg font-semibold">{jraLabel(draft)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── 2단계: 참여자 ──────────────────────────────────────── */
function StepParticipants({
  draft,
  patch,
  canWrite,
  canSign,
  isNew,
  staff,
  internalNames,
  toggleStaff,
  selectAllStaff,
  deselectAllStaff,
  patchParticipant,
  setDraft,
  onSign,
  onClearSign,
}: {
  draft: JobAssessment;
  patch: (p: Partial<JobAssessment>) => void;
  canWrite: boolean;
  canSign: boolean;
  isNew: boolean;
  staff: string[];
  internalNames: Set<string>;
  toggleStaff: (name: string) => void;
  selectAllStaff: () => void;
  deselectAllStaff: () => void;
  patchParticipant: (id: string, p: Partial<JobParticipant>) => void;
  setDraft: React.Dispatch<React.SetStateAction<JobAssessment>>;
  onSign: (p: JobParticipant) => void;
  onClearSign: (id: string) => void;
}) {
  const external = draft.participants.filter((p) => p.external);
  const internal = draft.participants.filter((p) => !p.external);

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>평가 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>평가일자</Label>
            <Input
              type="date"
              disabled={!canWrite}
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>구분</Label>
            <Select disabled={!canWrite} value={draft.team} onChange={(e) => patch({ team: e.target.value })}>
              <option value="">선택</option>
              {JOB_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>위험성 평가자</Label>
            <Input
              disabled={!canWrite}
              list="ras-staff"
              value={draft.evaluator}
              onChange={(e) => patch({ evaluator: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>승인자 (사업소장)</Label>
            <Input
              disabled={!canWrite}
              list="ras-staff"
              value={draft.approvedBy}
              onChange={(e) => patch({ approvedBy: e.target.value })}
            />
          </div>
          <datalist id="ras-staff">
            {staff.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>참여자 명단</CardTitle>
          <CardDescription>
            {canWrite
              ? "내부 참여자는 설정의 직원 명단에서 체크하고, 용역업체 직원은 아래에서 직접 추가합니다."
              : "본인 이름을 찾아 서명 칸을 눌러 주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite &&
            (staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                설정 → 직원 명단이 비어 있습니다. 먼저 직원을 등록하면 여기서 체크할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>내부 참여자 (우리 직원)</Label>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={selectAllStaff}>
                      전체 선택
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllStaff}>
                      전체 해제
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6">
                  {staff.map((name) => (
                    <label
                      key={name}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox checked={internalNames.has(name)} onChange={() => toggleStaff(name)} />
                      <span className="truncate">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

          {draft.participants.length > 0 && (
            <TableWrap>
              <Table className="min-w-[34rem]">
                <THead>
                  <TR>
                    <TH className="w-10 text-center">No.</TH>
                    <TH className="w-24">구분</TH>
                    <TH className="w-32">성명</TH>
                    <TH className="w-40 text-center">서명</TH>
                    {canWrite && <TH className="w-12" />}
                  </TR>
                </THead>
                <TBody>
                  {[...internal, ...external].map((p, i) => (
                    <TR key={p.id}>
                      <TD className="text-center tabular-nums text-muted-foreground">{i + 1}</TD>
                      <TD>
                        <Badge variant="outline" className={cn("font-normal", p.external && "bg-series-2/10 text-series-2")}>
                          {p.external ? "외부" : "내부"}
                        </Badge>
                      </TD>
                      <TD>
                        {/* '미정'은 아직 누가 올지 모를 때 쓴다 — 원본의 토글을 그대로 옮겼다 */}
                        {p.undecided ? (
                          <span className="text-sm text-muted-foreground">미정</span>
                        ) : (
                          <Input
                            disabled={!canWrite}
                            className="h-8"
                            value={p.name}
                            onChange={(e) => patchParticipant(p.id, { name: e.target.value })}
                            placeholder="성명"
                          />
                        )}
                      </TD>
                      <TD>
                        <SignCell
                          participant={p}
                          disabled={!canSign || p.undecided}
                          hint={
                            isNew
                              ? "등록한 뒤에 서명할 수 있습니다"
                              : p.undecided
                                ? "'미정'인 자리에는 서명할 수 없습니다"
                                : undefined
                          }
                          onOpen={() => onSign(p)}
                          onClear={() => onClearSign(p.id)}
                        />
                      </TD>
                      {canWrite && (
                        <TD className="whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => patchParticipant(p.id, { undecided: !p.undecided })}
                            aria-label="미정 토글"
                            title={p.undecided ? "이름을 적습니다" : "아직 누가 올지 모를 때"}
                            className={p.undecided ? "text-foreground" : "text-muted-foreground"}
                          >
                            <span className="text-[11px]">미정</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (p.sign && !confirm("이미 받은 서명도 함께 지워집니다. 계속할까요?")) return;
                              setDraft((d) => ({ ...d, participants: d.participants.filter((x) => x.id !== p.id) }));
                            }}
                            aria-label="참여자 삭제"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}

          {canWrite && (
            <div className="flex items-center justify-center gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">외부 참여자(용역업체 직원)를 직접 추가</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDraft((d) => ({ ...d, participants: [...d.participants, emptyJobParticipant(true)] }))}
                aria-label="외부 참여자 추가"
              >
                <Plus />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── 3단계: 위험성평가 매트릭스 ─────────────────────────── */
function StepMatrix({
  draft,
  canWrite,
  threshold,
  codes,
  settings,
  patchRow,
  changeCode,
  toggleIn,
  addRow,
  moveRow,
  setDraft,
}: {
  draft: JobAssessment;
  canWrite: boolean;
  threshold: number;
  codes: { code: string; label: string; className: string }[];
  settings: ReturnType<typeof useStore>["settings"];
  patchRow: (id: string, p: Partial<JobRow>) => void;
  changeCode: (id: string, code: string) => void;
  toggleIn: (list: string[], v: string) => string[];
  addRow: (kind: JobRow["kind"]) => void;
  moveRow: (id: string, dir: -1 | 1) => void;
  setDraft: React.Dispatch<React.SetStateAction<JobAssessment>>;
}) {
  return (
    <div className="space-y-4">
      {/* 척도 안내 — 원본의 설명표를 그대로 옮겼다. 점수를 매기며 바로 옆에서 본다 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr]">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm">피해강도 추정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {SEVERITY_GUIDE.map((g) => (
              <p key={g.value}>
                <strong className="mr-1.5">{g.value}점</strong>
                {g.label}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm">사고빈도 추정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {FREQUENCY_GUIDE.map((g) => (
              <p key={g.value}>
                <strong className="mr-1.5">{g.value}점</strong>
                {g.label}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => addRow("normal")}>
            <Plus className="size-3.5" /> 작업순서 추가
          </Button>
          <Button variant="outline" onClick={() => addRow("finish")}>
            <Check className="size-3.5" /> 작업종료 행 추가
          </Button>
        </div>
      )}

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          <TableWrap>
            <Table className="min-w-[104rem] [&_:is(th,td)]:px-2 [&_:is(th,td)]:align-top">
              <THead>
                <TR>
                  <TH className="w-10 text-center">No.</TH>
                  <TH className="w-40">공정/작업순서</TH>
                  <TH className="w-48">보호구</TH>
                  <TH className="w-44">위험분류</TH>
                  <TH className="w-40">위험요인</TH>
                  <TH className="w-64">현재 조치사항</TH>
                  <TH className="w-16 text-center">강도</TH>
                  <TH className="w-16 text-center">빈도</TH>
                  <TH className="w-16 text-center">등급</TH>
                  <TH className="w-24 text-center">허용여부</TH>
                  <TH className="w-52">감소대책</TH>
                  <TH className="w-16 text-center">조치후 강도</TH>
                  <TH className="w-16 text-center">조치후 빈도</TH>
                  <TH className="w-16 text-center">조치후 등급</TH>
                  <TH className="w-28">담당자</TH>
                  <TH className="w-36">종사자 의견</TH>
                  {canWrite && <TH className="w-20" />}
                </TR>
              </THead>
              <TBody>
                {draft.rows.map((r, i) => (
                  <MatrixRow
                    key={r.id}
                    row={r}
                    index={i}
                    canWrite={canWrite}
                    threshold={threshold}
                    codes={codes}
                    settings={settings}
                    patchRow={patchRow}
                    changeCode={changeCode}
                    toggleIn={toggleIn}
                    moveRow={moveRow}
                    onRemove={() => setDraft((d) => ({ ...d, rows: d.rows.filter((x) => x.id !== r.id) }))}
                  />
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </CardContent>
      </Card>
    </div>
  );
}

function MatrixRow({
  row,
  index,
  canWrite,
  threshold,
  codes,
  settings,
  patchRow,
  changeCode,
  toggleIn,
  moveRow,
  onRemove,
}: {
  row: JobRow;
  index: number;
  canWrite: boolean;
  threshold: number;
  codes: { code: string; label: string; className: string }[];
  settings: ReturnType<typeof useStore>["settings"];
  patchRow: (id: string, p: Partial<JobRow>) => void;
  changeCode: (id: string, code: string) => void;
  toggleIn: (list: string[], v: string) => string[];
  moveRow: (id: string, dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const risk = riskOf(row.p, row.s);
  const post = riskOf(row.p2, row.s2);
  const candidates = ACTIONS_BY_CODE[row.hazardCode] ?? [];
  /** 감소대책을 적기 전에는 조치 후 점수를 매길 수 없다 — 원본과 같은 규칙 */
  const canScorePost = row.measure.trim().length > 0;

  if (row.kind === "finish") {
    return (
      <TR className="bg-muted/40">
        <TD className="text-center tabular-nums text-muted-foreground">{index + 1}</TD>
        <TD className="font-medium">작업 완료</TD>
        {/* 마무리 행은 점수를 매기지 않는다 — 확인 항목과 담당자·의견만 받는다 */}
        <TD colSpan={8} className="text-xs text-muted-foreground">
          작업을 마칠 때 확인하는 항목입니다. 점수는 매기지 않습니다.
        </TD>
        <TD colSpan={4}>
          <div className="space-y-1">
            {FINISH_ITEMS.map((item) => (
              <label key={item} className="flex cursor-pointer items-start gap-1.5 text-xs">
                <Checkbox
                  className="mt-0.5"
                  disabled={!canWrite}
                  checked={row.finishItems.includes(item)}
                  onChange={() => patchRow(row.id, { finishItems: toggleIn(row.finishItems, item) })}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </TD>
        <TD>
          <Input
            className="h-8 text-xs"
            disabled={!canWrite}
            value={row.owner}
            onChange={(e) => patchRow(row.id, { owner: e.target.value })}
            placeholder="담당자"
          />
        </TD>
        <TD>
          <Input
            className="h-8 text-xs"
            disabled={!canWrite}
            value={row.opinion}
            onChange={(e) => patchRow(row.id, { opinion: e.target.value })}
            placeholder="근로자 피드백"
          />
        </TD>
        {canWrite && <RowTools id={row.id} moveRow={moveRow} onRemove={onRemove} />}
      </TR>
    );
  }

  return (
    <TR>
      <TD className="text-center tabular-nums text-muted-foreground">{index + 1}</TD>
      <TD>
        <Textarea
          rows={2}
          className="text-xs"
          disabled={!canWrite}
          value={row.stepName}
          onChange={(e) => patchRow(row.id, { stepName: e.target.value })}
          placeholder="예: 밸브 개폐 조작"
        />
      </TD>
      <TD>
        <div className="max-h-32 space-y-0.5 overflow-auto rounded-lg bg-muted/40 p-1.5">
          {PPE_ITEMS.map((item) => (
            <label key={item} className="flex cursor-pointer items-center gap-1.5 text-[11px]">
              <Checkbox
                disabled={!canWrite}
                checked={row.ppes.includes(item)}
                onChange={() => patchRow(row.id, { ppes: toggleIn(row.ppes, item) })}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <Input
          className="mt-1 h-7 text-[11px]"
          disabled={!canWrite}
          value={row.ppeEtc}
          onChange={(e) => patchRow(row.id, { ppeEtc: e.target.value })}
          placeholder="기타 보호구"
        />
      </TD>
      <TD>
        {/* 설정 분류표의 위험코드를 그대로 쓴다 — 고르면 조치사항 후보가 딸려온다 */}
        <Select
          className="h-8 w-full text-xs"
          disabled={!canWrite}
          value={row.hazardCode}
          onChange={(e) => changeCode(row.id, e.target.value)}
        >
          <option value="">선택하세요</option>
          {codes.map((t) => (
            <option key={t.code} value={t.code}>
              {t.code} {t.label}
            </option>
          ))}
        </Select>
      </TD>
      <TD>
        <Textarea
          rows={2}
          className="text-xs"
          disabled={!canWrite}
          value={row.factor}
          onChange={(e) => patchRow(row.id, { factor: e.target.value })}
          placeholder="위험요인"
        />
      </TD>
      <TD>
        {candidates.length > 0 ? (
          <div className="max-h-32 space-y-0.5 overflow-auto rounded-lg bg-muted/40 p-1.5">
            {candidates.map((item) => (
              <label key={item} className="flex cursor-pointer items-start gap-1.5 text-[11px]">
                <Checkbox
                  className="mt-0.5"
                  disabled={!canWrite}
                  checked={row.actions.includes(item)}
                  onChange={() => patchRow(row.id, { actions: toggleIn(row.actions, item) })}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-muted/40 p-1.5 text-[11px] text-muted-foreground">
            {row.hazardCode ? "이 분류에는 준비된 항목이 없습니다. 아래에 직접 적어 주세요." : "위험분류를 먼저 고르세요."}
          </p>
        )}
        {/* 목록에 없는 조치는 직접 적는다 */}
        {row.customActions.map((text, i) => (
          <div key={i} className="mt-1 flex items-center gap-1">
            <Input
              className="h-7 text-[11px]"
              disabled={!canWrite}
              value={text}
              onChange={(e) =>
                patchRow(row.id, { customActions: row.customActions.map((x, j) => (j === i ? e.target.value : x)) })
              }
              placeholder="직접 입력"
            />
            {canWrite && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive"
                onClick={() => patchRow(row.id, { customActions: row.customActions.filter((_, j) => j !== i) })}
                aria-label="항목 삭제"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        ))}
        {canWrite && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 w-full text-[11px]"
            onClick={() => patchRow(row.id, { customActions: [...row.customActions, ""] })}
          >
            <Plus className="size-3" /> 항목 추가
          </Button>
        )}
      </TD>
      <TD>
        <ScoreSelect
          disabled={!canWrite}
          value={row.s}
          max={4}
          onChange={(v) => patchRow(row.id, { s: v })}
          labels={settings.risk.severity}
        />
      </TD>
      <TD>
        <ScoreSelect
          disabled={!canWrite}
          value={row.p}
          max={5}
          onChange={(v) => patchRow(row.id, { p: v })}
          labels={settings.risk.likelihood}
        />
      </TD>
      <TD className="text-center">
        <Badge className={riskBadgeClass(risk)}>{risk ?? "-"}</Badge>
      </TD>
      <TD className="text-center">
        {/* 기준점(설정의 고위험군 기준) 이상이면 그대로 두면 안 되는 위험이다 */}
        {risk === null ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : risk >= threshold ? (
          <span className="text-xs font-medium text-destructive">허용 불가능</span>
        ) : (
          <span className="text-xs font-medium text-series-1">허용 가능</span>
        )}
      </TD>
      <TD>
        <Textarea
          rows={3}
          className="text-xs"
          disabled={!canWrite}
          value={row.measure}
          onChange={(e) => {
            const measure = e.target.value;
            // 감소대책을 지우면 조치 후 점수도 함께 비운다(근거 없는 점수가 남지 않게)
            patchRow(row.id, measure.trim() ? { measure } : { measure, s2: null, p2: null });
          }}
          placeholder={risk !== null && risk >= threshold ? "기준점 이상 — 감소대책 필수" : "감소대책"}
        />
      </TD>
      <TD>
        <ScoreSelect
          disabled={!canWrite || !canScorePost}
          hint={canScorePost ? undefined : "감소대책을 먼저 적어야 합니다"}
          value={row.s2}
          max={4}
          onChange={(v) => patchRow(row.id, { s2: v })}
          labels={settings.risk.severity}
        />
      </TD>
      <TD>
        <ScoreSelect
          disabled={!canWrite || !canScorePost}
          hint={canScorePost ? undefined : "감소대책을 먼저 적어야 합니다"}
          value={row.p2}
          max={5}
          onChange={(v) => patchRow(row.id, { p2: v })}
          labels={settings.risk.likelihood}
        />
      </TD>
      <TD className="text-center">
        <Badge className={riskBadgeClass(post)}>{post ?? "-"}</Badge>
      </TD>
      <TD>
        <Input
          className="h-8 text-xs"
          disabled={!canWrite}
          value={row.owner}
          onChange={(e) => patchRow(row.id, { owner: e.target.value })}
          placeholder="담당자"
        />
      </TD>
      <TD>
        <Textarea
          rows={2}
          className="text-xs"
          disabled={!canWrite}
          value={row.opinion}
          onChange={(e) => patchRow(row.id, { opinion: e.target.value })}
          placeholder="근로자 피드백"
        />
      </TD>
      {canWrite && <RowTools id={row.id} moveRow={moveRow} onRemove={onRemove} />}
    </TR>
  );
}

/** 행 순서 바꾸기·삭제 — 원본은 드래그였지만 터치에서는 버튼이 확실하다 */
function RowTools({
  id,
  moveRow,
  onRemove,
}: {
  id: string;
  moveRow: (id: string, dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <TD className="whitespace-nowrap">
      <Button variant="ghost" size="icon-xs" onClick={() => moveRow(id, -1)} aria-label="위로">
        ▲
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={() => moveRow(id, 1)} aria-label="아래로">
        ▼
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-destructive hover:text-destructive"
        onClick={onRemove}
        aria-label="행 삭제"
      >
        <Trash2 className="size-3" />
      </Button>
    </TD>
  );
}

function ScoreSelect({
  value,
  max,
  onChange,
  disabled,
  hint,
  labels,
}: {
  value: number | null;
  max: number;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  hint?: string;
  labels: { value: number; label: string }[];
}) {
  return (
    <Select
      className="h-8 w-full text-xs"
      disabled={disabled}
      title={hint}
      value={value === null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    >
      <option value="">-</option>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n} title={labels.find((l) => l.value === n)?.label}>
          {n}
        </option>
      ))}
    </Select>
  );
}

/* ── 4단계: 작업 전 준비 ────────────────────────────────── */
function StepPreJob({
  draft,
  patch,
  canWrite,
  toggleIn,
}: {
  draft: JobAssessment;
  patch: (p: Partial<JobAssessment>) => void;
  canWrite: boolean;
  toggleIn: (list: string[], v: string) => string[];
}) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>작업 전 준비사항</CardTitle>
        <CardDescription>작업을 시작하기 전에 한 번 훑습니다. 해당 없는 항목만 끄세요.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PRE_JOB_ITEMS.map((item) => (
          <label key={item} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-muted">
            <Checkbox
              disabled={!canWrite}
              checked={draft.preJobs.includes(item)}
              onChange={() => patch({ preJobs: toggleIn(draft.preJobs, item) })}
            />
            <span>{item}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

/* ── 5단계: 확인·인쇄 ───────────────────────────────────── */
function StepReview({
  draft,
  patch,
  canWrite,
  threshold,
}: {
  draft: JobAssessment;
  patch: (p: Partial<JobAssessment>) => void;
  canWrite: boolean;
  threshold: number;
}) {
  const { settings } = useStore();
  const rows = scoredRows(draft);
  const over = rows.filter((r) => r.p && r.s && r.p * r.s >= threshold);
  const noMeasure = over.filter((r) => !r.measure.trim());

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>확인</CardTitle>
          <CardDescription>등록하기 전에 빠진 것이 없는지 봅니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            평가 항목 <strong>{rows.length}건</strong> · 허용 불가능(기준 {threshold}점 이상){" "}
            <strong className={over.length ? "text-destructive" : undefined}>{over.length}건</strong> · 참여자{" "}
            <strong>{draft.participants.length}명</strong> · 작업 전 준비 <strong>{draft.preJobs.length}항목</strong>
          </p>
          {noMeasure.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-destructive">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                허용 불가능인데 감소대책이 비어 있는 항목이 {noMeasure.length}건 있습니다 (
                {noMeasure.map((r) => r.stepName || "이름 없는 작업").join(", ")}). 3단계에서 채워 주세요.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>결재란</CardTitle>
          <CardDescription>인쇄물 상단에 들어갑니다. 비워 두면 설정의 기본값이 쓰입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                disabled={!canWrite}
                list="ras-staff"
                value={draft.approver[key]}
                onChange={(e) => patch({ approver: { ...draft.approver, [key]: e.target.value } })}
                placeholder={settings.org.approver[key] || "-"}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── 서명 ───────────────────────────────────────────────── */
function SignCell({
  participant,
  disabled,
  hint,
  onOpen,
  onClear,
}: {
  participant: JobParticipant;
  disabled: boolean;
  hint?: string;
  onOpen: () => void;
  onClear: () => void;
}) {
  const url = usePhotoUrl(participant.sign);
  if (!participant.sign) {
    return (
      <Button variant="outline" size="sm" className="w-full" disabled={disabled} onClick={onOpen} title={hint}>
        <PenLine className="size-3.5" /> 서명
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        onContextMenu={(e) => e.preventDefault()}
        title={disabled ? hint : "다시 서명"}
        className={cn(
          // no-callout: 받아 둔 서명을 길게 눌러도 '이미지 저장' 메뉴가 뜨지 않게 한다
          "no-callout h-9 flex-1 overflow-hidden rounded-xl bg-input/40 ring-1 ring-foreground/5",
          disabled ? "cursor-default" : "cursor-pointer hover:bg-input/70",
        )}
      >
        {url && <img src={url} alt={`${participant.name} 서명`} className="h-full w-full object-contain p-0.5" />}
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        className="text-destructive hover:text-destructive"
        onClick={onClear}
        aria-label="서명 지우기"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function SignDialog({
  participant,
  onClose,
  onSave,
}: {
  participant: JobParticipant | null;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = React.useState(false);

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      await onSave(signatureDataUrl(canvas));
    } catch (e) {
      alert(`서명을 저장하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!participant} onClose={onClose} className="no-callout max-w-lg sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{participant?.name || "참여자"} 서명</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">아래 칸에 손가락이나 펜으로 서명해 주세요.</p>
      {participant && <SignatureCanvas onReady={(c) => (canvasRef.current = c)} />}
      <DialogFooter>
        <Button variant="outline" onClick={clear}>
          <Eraser className="size-3.5" /> 지우기
        </Button>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "저장 중…" : "저장"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** 인쇄물에서도 쓰도록 내보낸다 — 위험코드 번호를 '1.4 부딪힘'으로 편다 */
export { codeLabel };
