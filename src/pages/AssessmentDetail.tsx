import * as React from "react";
import { ArrowLeft, ArrowRightLeft, ChevronDown, ChevronUp, Copy, FileDown, FileUp, Plus, Printer, Trash2 } from "lucide-react";
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
} from "@/components/ui";
import {
  CellInput,
  CellTextarea,
  HazardClassSelect,
  HazardCodeSelect,
  OwnerInput,
  ProcessSelect,
  ScoreSelect,
  StatusSelect,
} from "@/components/fields";
import { exportAssessment, importRows } from "@/lib/excel";
import { AssessmentSheet } from "@/print/AssessmentSheet";
import { isHighRisk, riskAfter, riskBadgeClass, riskBefore } from "@/lib/risk";
import { emptyRow, type Assessment, type RiskItem } from "@/lib/types";
import { classNames } from "@/lib/settings";
import { useStore } from "@/store";

/**
 * 컬럼 너비 — 표는 table-fixed라 여기 값이 그대로 비율이 된다.
 * 점수·날짜처럼 내용 길이가 고정된 칸은 최소로 조이고, 긴 문장이 들어가는
 * 유해위험요인·안전보건조치·개선대책에 남는 폭을 몰아준다.
 */
const COLS: { key: string; label: string; sub?: string; className?: string }[] = [
  { key: "no", label: "No.", className: "w-10 text-center" },
  { key: "subProcess", label: "세부공정", className: "w-28" },
  { key: "hazardClass", label: "위험분류", className: "w-24" },
  { key: "hazardCode", label: "위험코드", sub: "분류별 유형", className: "w-24" },
  { key: "hazard", label: "유해위험요인", className: "w-64" },
  { key: "currentControl", label: "현재의 안전보건조치", className: "w-52" },
  { key: "p", label: "가능성", sub: "현재", className: "w-14 text-center" },
  { key: "s", label: "중대성", sub: "현재", className: "w-14 text-center" },
  { key: "risk", label: "위험성", sub: "현재", className: "w-14 text-center" },
  { key: "code", label: "평가코드", sub: "8점 이상", className: "w-24 text-center" },
  { key: "measure", label: "개선대책", className: "w-52" },
  { key: "dueDate", label: "개선예정일", className: "w-32" },
  { key: "improveDate", label: "개선일자", className: "w-32" },
  { key: "p2", label: "가능성", sub: "개선 후", className: "w-14 text-center" },
  { key: "s2", label: "중대성", sub: "개선 후", className: "w-14 text-center" },
  { key: "risk2", label: "위험성", sub: "개선 후", className: "w-14 text-center" },
  { key: "status", label: "조치상태", className: "w-24" },
  { key: "owner", label: "담당자", className: "w-20" },
  { key: "note", label: "비고", className: "w-40" },
  { key: "actions", label: "", className: "w-36" },
];

export function AssessmentDetail({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
  const { assessments, saveAssessment, settings, canEdit, canDelete } = useStore();
  const [draft, setDraft] = React.useState<Assessment>(assessment);
  const [q, setQ] = React.useState("");
  const [fClass, setFClass] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fHigh, setFHigh] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<RiskItem[] | null>(null);
  const [moveRowId, setMoveRowId] = React.useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = React.useState("");

  // 입력 중에는 로컬 상태로 두고, 멈추면 저장한다
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void saveAssessment(draft), 400);
    return () => clearTimeout(t);
  }, [draft, saveAssessment]);

  const patch = (p: Partial<Assessment>) => setDraft((d) => ({ ...d, ...p }));
  const patchRow = (id: string, p: Partial<RiskItem>) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) }));

  const addRow = () => setDraft((d) => ({ ...d, rows: [...d.rows, emptyRow()] }));

  /** 엑셀에서 읽은 행을 현재 평가표에 반영 */
  const readFile = async (file: File) => {
    try {
      setPending(await importRows(file));
    } catch (e) {
      alert(`엑셀을 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const applyRows = (mode: "append" | "replace") => {
    if (!pending) return;
    setDraft((d) => ({ ...d, rows: mode === "append" ? [...d.rows, ...pending] : pending }));
    setPending(null);
  };
  const duplicateRow = (id: string) =>
    setDraft((d) => {
      const i = d.rows.findIndex((r) => r.id === id);
      if (i < 0) return d;
      const copy = { ...d.rows[i], id: crypto.randomUUID(), code: "" };
      const rows = [...d.rows];
      rows.splice(i + 1, 0, copy);
      return { ...d, rows };
    });
  const removeRow = (id: string) => setDraft((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== id) }));

  const moveTargets = assessments.filter((a) => a.id !== draft.id);
  const moveRowToAssessment = async () => {
    const row = draft.rows.find((r) => r.id === moveRowId);
    const target = assessments.find((a) => a.id === moveTargetId);
    if (!row || !target) return;
    // 평가코드는 평가표마다 다시 매겨지므로 옮긴 뒤 저장 시 자동으로 재계산되게 비워 둔다
    const moved: RiskItem = { ...row, code: "" };
    setDraft((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== moveRowId) }));
    await saveAssessment({ ...target, rows: [...target.rows, moved] });
    setMoveRowId(null);
    setMoveTargetId("");
  };
  const moveRow = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const i = d.rows.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.rows.length) return d;
      const rows = [...d.rows];
      [rows[i], rows[j]] = [rows[j], rows[i]];
      return { ...d, rows };
    });

  const visible = draft.rows.filter((r) => {
    if (fClass && r.hazardClass !== fClass) return false;
    if (fStatus && r.status !== fStatus) return false;
    if (fHigh && !isHighRisk(r)) return false;
    if (q) {
      const hay = [r.subProcess, r.hazard, r.currentControl, r.measure, r.note, r.owner, r.code].join(" ").toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const highCount = draft.rows.filter(isHighRisk).length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">
              {draft.facility || "대상시설 미입력"} · {draft.process || "공정명 미입력"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              항목 {draft.rows.length}건 · 고위험군 {highCount}건 · 평가일시 {draft.date || "-"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void readFile(f);
            }}
          />
          <Button
            variant="outline"
            size="icon-lg"
            disabled={!canEdit}
            onClick={() => fileRef.current?.click()}
            aria-label="엑셀 불러오기"
            title={canEdit ? undefined : "보기 전용 계정입니다"}
          >
            <FileUp />
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => void exportAssessment(draft)} aria-label="엑셀 내보내기">
            <FileDown />
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => window.print()} aria-label="PDF 출력">
            <Printer />
          </Button>
          <Button
            size="icon-lg"
            disabled={!canEdit}
            onClick={addRow}
            aria-label="행 추가"
            title={canEdit ? undefined : "보기 전용 계정입니다"}
          >
            <Plus />
          </Button>
        </div>
      </div>

      {/* 문서 정보 */}
      <Card className="no-print shadow-xs">
        <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>대상시설</Label>
            <Input
              disabled={!canEdit}
              value={draft.facility}
              onChange={(e) => patch({ facility: e.target.value })}
              placeholder="○○공공하수처리시설"
            />
          </div>
          <div className="space-y-1.5">
            <Label>공정명</Label>
            <ProcessSelect value={draft.process} onChange={(v) => patch({ process: v })} disabled={!canEdit} />
          </div>
          <div className="space-y-1.5">
            <Label>평가일시</Label>
            <Input disabled={!canEdit} type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>공정순번 <span className="text-muted-foreground">(평가코드 중간 숫자)</span></Label>
            <Input
              disabled={!canEdit}
              type="number"
              min={1}
              value={draft.processNo}
              onChange={(e) => patch({ processNo: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 툴바 */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <Input
          className="h-9 max-w-sm"
          placeholder="세부공정·유해위험요인·개선대책 검색…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select className="h-9" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          <option value="">위험분류 전체</option>
          {classNames(settings).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select className="h-9" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">조치상태 전체</option>
          {settings.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Button variant={fHigh ? "default" : "outline"} className="h-9 py-2" onClick={() => setFHigh((v) => !v)}>
          고위험군만 ({highCount})
        </Button>
      </div>

      {/* 표 — 상단 컬럼 고정 */}
      <Card className="no-print py-0 shadow-xs">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <EmptyState>조건에 맞는 항목이 없습니다. 우측 상단 &lsquo;행 추가&rsquo;로 시작하세요.</EmptyState>
          ) : (
            <div className="scroll-slim max-h-[calc(100svh-24rem)] min-h-64 overflow-auto">
              <Table className="min-w-[1680px] table-fixed [&_:is(th,td)]:px-1.5">
                <THead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                  <TR className="hover:bg-transparent">
                    {COLS.map((c) => (
                      <TH key={c.key} className={c.className}>
                        <span className="block leading-tight">{c.label}</span>
                        {c.sub && <span className="block text-[10px] font-normal text-muted-foreground">{c.sub}</span>}
                      </TH>
                    ))}
                  </TR>
                </THead>
                <TBody>
                  {visible.map((r) => {
                    const before = riskBefore(r);
                    const after = riskAfter(r);
                    const idx = draft.rows.findIndex((x) => x.id === r.id);
                    return (
                      <TR
                        key={r.id}
                        className={
                          r.status === "미조치"
                            ? "align-top bg-destructive/5 hover:bg-destructive/10"
                            : "align-top"
                        }
                      >
                        <TD className="text-center text-muted-foreground tabular-nums">{idx + 1}</TD>
                        <TD className="whitespace-normal">
                          <CellTextarea
                            disabled={!canEdit}
                            value={r.subProcess}
                            onChange={(e) => patchRow(r.id, { subProcess: e.target.value })}
                          />
                        </TD>
                        <TD>
                          <HazardClassSelect
                            disabled={!canEdit}
                            value={r.hazardClass}
                            // 분류가 바뀌면 그 분류에 속하지 않는 위험코드는 남겨둘 수 없다
                            onChange={(e) =>
                              patchRow(r.id, { hazardClass: e.target.value as RiskItem["hazardClass"], hazardCode: "" })
                            }
                          />
                        </TD>
                        <TD>
                          <HazardCodeSelect
                            disabled={!canEdit}
                            hazardClass={r.hazardClass}
                            value={r.hazardCode ?? ""}
                            onChange={(e) => patchRow(r.id, { hazardCode: e.target.value })}
                          />
                        </TD>
                        <TD className="whitespace-normal">
                          <CellTextarea
                            disabled={!canEdit}
                            value={r.hazard}
                            onChange={(e) => patchRow(r.id, { hazard: e.target.value })}
                          />
                        </TD>
                        <TD className="whitespace-normal">
                          <CellTextarea
                            disabled={!canEdit}
                            value={r.currentControl}
                            onChange={(e) => patchRow(r.id, { currentControl: e.target.value })}
                          />
                        </TD>
                        <TD>
                          <ScoreSelect disabled={!canEdit} kind="p" value={r.p} onChange={(v) => patchRow(r.id, { p: v })} />
                        </TD>
                        <TD>
                          <ScoreSelect disabled={!canEdit} kind="s" value={r.s} onChange={(v) => patchRow(r.id, { s: v })} />
                        </TD>
                        <TD className="text-center">
                          <Badge variant="secondary" className={riskBadgeClass(before)}>
                            {before ?? "-"}
                          </Badge>
                        </TD>
                        <TD className="text-center">
                          <CellInput
                            disabled={!canEdit}
                            className="text-center tabular-nums"
                            value={r.code}
                            placeholder={isHighRisk(r) ? "" : "-"}
                            onChange={(e) => patchRow(r.id, { code: e.target.value })}
                          />
                        </TD>
                        <TD className="whitespace-normal">
                          <CellTextarea
                            disabled={!canEdit}
                            value={r.measure}
                            onChange={(e) => patchRow(r.id, { measure: e.target.value })}
                          />
                        </TD>
                        <TD>
                          <CellInput
                            disabled={!canEdit}
                            type="date"
                            value={r.dueDate}
                            onChange={(e) => patchRow(r.id, { dueDate: e.target.value })}
                          />
                        </TD>
                        <TD>
                          <CellInput
                            disabled={!canEdit}
                            type="date"
                            value={r.improveDate}
                            onChange={(e) => patchRow(r.id, { improveDate: e.target.value })}
                          />
                        </TD>
                        <TD>
                          <ScoreSelect disabled={!canEdit} kind="p" value={r.p2} onChange={(v) => patchRow(r.id, { p2: v })} />
                        </TD>
                        <TD>
                          <ScoreSelect disabled={!canEdit} kind="s" value={r.s2} onChange={(v) => patchRow(r.id, { s2: v })} />
                        </TD>
                        <TD className="text-center">
                          <Badge variant="secondary" className={riskBadgeClass(after)}>
                            {after ?? "-"}
                          </Badge>
                        </TD>
                        <TD>
                          <StatusSelect
                            disabled={!canEdit}
                            value={r.status}
                            onChange={(e) => patchRow(r.id, { status: e.target.value as RiskItem["status"] })}
                          />
                        </TD>
                        <TD>
                          <OwnerInput disabled={!canEdit} value={r.owner} onChange={(e) => patchRow(r.id, { owner: e.target.value })} />
                        </TD>
                        <TD className="whitespace-normal">
                          <CellTextarea disabled={!canEdit} value={r.note} onChange={(e) => patchRow(r.id, { note: e.target.value })} />
                        </TD>
                        <TD>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!canEdit}
                              onClick={() => moveRow(r.id, -1)}
                              aria-label="위로"
                            >
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!canEdit}
                              onClick={() => moveRow(r.id, 1)}
                              aria-label="아래로"
                            >
                              <ChevronDown className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!canEdit}
                              onClick={() => duplicateRow(r.id)}
                              aria-label="복제"
                            >
                              <Copy className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!canEdit || moveTargets.length === 0}
                              onClick={() => setMoveRowId(r.id)}
                              aria-label="다른 공정으로 이동"
                              title={moveTargets.length === 0 ? "이동할 다른 평가표가 없습니다" : undefined}
                            >
                              <ArrowRightLeft className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!canDelete}
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeRow(r.id)}
                              aria-label="삭제"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="no-print flex justify-center">
        <Button variant="outline" size="icon-lg" disabled={!canEdit} onClick={addRow} aria-label="행 추가">
          <Plus />
        </Button>
      </div>

      <Dialog open={!!pending} onClose={() => setPending(null)}>
        <DialogHeader>
          <DialogTitle>엑셀에서 {pending?.length ?? 0}건을 읽었습니다</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>컬럼 머리말을 읽어 세부공정·유해위험요인·위험성 점수 등을 자동으로 맞췄습니다.</p>
          {pending && pending.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-muted/40 p-3 text-xs">
              {pending.slice(0, 5).map((r, i) => (
                <li key={r.id} className="truncate">
                  {i + 1}. {r.hazard || r.subProcess || "(내용 없음)"} · {r.p ?? "-"}×{r.s ?? "-"}
                </li>
              ))}
              {pending.length > 5 && <li>… 외 {pending.length - 5}건</li>}
            </ul>
          )}
          <p>현재 평가표에는 {draft.rows.length}건이 있습니다. 어떻게 할까요?</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPending(null)}>
            취소
          </Button>
          <Button variant="destructive" onClick={() => applyRows("replace")}>
            기존 행 교체
          </Button>
          <Button onClick={() => applyRows("append")}>아래에 추가</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!moveRowId} onClose={() => setMoveRowId(null)}>
        <DialogHeader>
          <DialogTitle>다른 공정으로 이동</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            이 행을 아래에서 고른 평가표로 옮깁니다. 평가코드는 옮긴 평가표 기준으로 다시 매겨집니다.
          </p>
          <Select className="w-full" value={moveTargetId} onChange={(e) => setMoveTargetId(e.target.value)}>
            <option value="">이동할 평가표 선택</option>
            {moveTargets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.facility || "시설 미입력"} · {a.process || "공정 미입력"} ({a.date || "날짜 미입력"})
              </option>
            ))}
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMoveRowId(null)}>
            취소
          </Button>
          <Button disabled={!moveTargetId} onClick={() => void moveRowToAssessment()}>
            이동
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 인쇄용 위험성 평가표 (화면에서는 숨김) */}
      <AssessmentSheet assessment={draft} />
    </div>
  );
}
