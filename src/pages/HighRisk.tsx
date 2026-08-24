import * as React from "react";
import { ImageOff, Printer, ShieldAlert, SlidersHorizontal } from "lucide-react";
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
  Textarea,
} from "@/components/ui";
import { PhotoSlot, PhotoThumb } from "@/components/photo";
import { ScoreSelect } from "@/components/fields";
import { PhotoSheet, type SheetEntry } from "@/print/PhotoSheet";
import { isHighRisk, riskAfter, riskBadgeClass, riskBefore } from "@/lib/risk";
import type { RiskItem } from "@/lib/types";
import { useStore } from "@/store";

const statusBadge = (s: RiskItem["status"]) =>
  s === "개선완료"
    ? "bg-secondary text-secondary-foreground"
    : s === "조치중"
      ? "bg-accent text-accent-foreground"
      : "bg-destructive/10 text-destructive";

export function HighRiskPage() {
  const { assessments, updateRow, settings, canEdit, canUploadPhoto } = useStore();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editId, setEditId] = React.useState<string | null>(null);
  const [fClass, setFClass] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fSubProcess, setFSubProcess] = React.useState("");
  const [fNoPhoto, setFNoPhoto] = React.useState(false);
  const [q, setQ] = React.useState("");

  const all: SheetEntry[] = React.useMemo(
    () =>
      assessments.flatMap((a) =>
        a.rows.filter(isHighRisk).map((row) => ({ assessment: a, row })),
      ),
    [assessments],
  );

  const subProcesses = React.useMemo(
    () => [...new Set(all.map((e) => e.row.subProcess).filter(Boolean))],
    [all],
  );

  const entries = all.filter(({ assessment, row }) => {
    if (fClass && row.hazardClass !== fClass) return false;
    if (fStatus && row.status !== fStatus) return false;
    if (fSubProcess && row.subProcess !== fSubProcess) return false;
    if (fNoPhoto && row.beforePhoto && row.afterPhoto) return false;
    if (q) {
      const hay = [row.code, row.hazard, row.measure, row.improveContent, assessment.process].join(" ").toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // 평가코드 순 정렬 (사용자 확정: 출력 순서 = 평가코드순)
  const sorted = [...entries].sort((a, b) => a.row.code.localeCompare(b.row.code, "ko", { numeric: true }));

  const printEntries = sorted.filter((e) => selected.has(e.row.id));
  const editing = all.find((e) => e.row.id === editId) ?? null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = sorted.length > 0 && sorted.every((e) => selected.has(e.row.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(sorted.map((e) => e.row.id)));

  const patch = (entry: SheetEntry, p: Partial<RiskItem>) =>
    void updateRow(entry.assessment.id, entry.row.id, p);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            위험성 8점 이상 항목을 모든 평가표에서 자동으로 불러옵니다. 개선 전·후 사진을 첨부하고 선택 항목을
            사진대지로 출력하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon-lg"
            disabled={printEntries.length === 0}
            onClick={() => window.print()}
            aria-label={`선택 ${printEntries.length}건 PDF 출력`}
          >
            <Printer />
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <Input
          className="h-9 max-w-sm"
          placeholder="평가코드·위험내용·개선대책 검색…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select className="h-9" value={fSubProcess} onChange={(e) => setFSubProcess(e.target.value)}>
          <option value="">세부공정 전체</option>
          {subProcesses.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </Select>
        <Select className="h-9" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          <option value="">위험분류 전체</option>
          {settings.hazardClasses.map((c) => (
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
        <Button
          variant={fNoPhoto ? "default" : "outline"}
          size="icon-lg"
          onClick={() => setFNoPhoto((v) => !v)}
          aria-label="사진 미첨부만 보기"
        >
          <ImageOff />
        </Button>
        <span className="text-sm text-muted-foreground">총 {sorted.length}건</span>
      </div>

      {/* 데스크톱 표 */}
      <Card className="no-print hidden py-0 shadow-xs md:block">
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <EmptyState icon={<ShieldAlert className="size-6 text-muted-foreground" />}>
              고위험군(8점 이상) 항목이 없습니다.
            </EmptyState>
          ) : (
            <div className="scroll-slim max-h-[calc(100svh-20rem)] overflow-auto">
              <Table className="min-w-[1100px] [&_:is(th,td)]:px-3">
                <THead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                  <TR className="hover:bg-transparent">
                    <TH className="w-10">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="전체 선택"
                      />
                    </TH>
                    <TH className="w-28">평가코드</TH>
                    <TH className="w-40">대상시설 · 공정</TH>
                    <TH className="w-28">세부공정</TH>
                    <TH className="w-24">위험분류</TH>
                    <TH>위험내용</TH>
                    <TH className="w-20 text-center">개선 전</TH>
                    <TH className="w-20 text-center">개선 후</TH>
                    <TH className="w-24 text-center">사진</TH>
                    <TH className="w-24 text-center">상태</TH>
                    <TH className="w-20" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((e) => {
                    const before = riskBefore(e.row);
                    const after = riskAfter(e.row);
                    return (
                      <TR
                        key={e.row.id}
                        className="cursor-pointer"
                        data-state={selected.has(e.row.id) ? "selected" : undefined}
                        onClick={() => setEditId(e.row.id)}
                      >
                        <TD onClick={(ev) => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--primary)]"
                            checked={selected.has(e.row.id)}
                            onChange={() => toggle(e.row.id)}
                            aria-label={`${e.row.code} 선택`}
                          />
                        </TD>
                        <TD className="font-medium tabular-nums">{e.row.code || "-"}</TD>
                        <TD className="text-muted-foreground">
                          <span className="block truncate">{e.assessment.facility || "-"}</span>
                          <span className="block truncate text-xs">{e.assessment.process || "-"}</span>
                        </TD>
                        <TD className="text-muted-foreground">{e.row.subProcess || "-"}</TD>
                        <TD>
                          <Badge variant="outline" className="font-normal">
                            {e.row.hazardClass || "-"}
                          </Badge>
                        </TD>
                        <TD className="max-w-md truncate whitespace-normal">{e.row.hazard || "-"}</TD>
                        <TD className="text-center">
                          <Badge className={riskBadgeClass(before)}>{before ?? "-"}</Badge>
                        </TD>
                        <TD className="text-center">
                          <Badge className={riskBadgeClass(after)}>{after ?? "-"}</Badge>
                        </TD>
                        <TD>
                          <div className="flex justify-center gap-1">
                            <PhotoThumb id={e.row.beforePhoto} className="size-8" />
                            <PhotoThumb id={e.row.afterPhoto} className="size-8" />
                          </div>
                        </TD>
                        <TD className="text-center">
                          <Badge className={statusBadge(e.row.status)}>{e.row.status}</Badge>
                        </TD>
                        <TD onClick={(ev) => ev.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setEditId(e.row.id)}
                            aria-label="사진·개선내용 관리"
                          >
                            <SlidersHorizontal className="size-3.5" />
                          </Button>
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

      {/* 모바일 카드 */}
      <div className="no-print space-y-3 md:hidden">
        {sorted.length === 0 ? (
          <Card className="shadow-xs">
            <CardContent>
              <EmptyState icon={<ShieldAlert className="size-6 text-muted-foreground" />}>
                고위험군(8점 이상) 항목이 없습니다.
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          sorted.map((e) => (
            <Card key={e.row.id} className="shadow-xs" data-size="sm">
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--primary)]"
                    checked={selected.has(e.row.id)}
                    onChange={() => toggle(e.row.id)}
                    aria-label={`${e.row.code} 선택`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium tabular-nums">{e.row.code || "-"}</span>
                      <Badge variant="outline" className="font-normal">
                        {e.row.hazardClass || "-"}
                      </Badge>
                      <Badge className={statusBadge(e.row.status)}>{e.row.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm">{e.row.hazard || "-"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.assessment.facility || "-"} · {e.assessment.process || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={riskBadgeClass(riskBefore(e.row))}>개선 전 {riskBefore(e.row) ?? "-"}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge className={riskBadgeClass(riskAfter(e.row))}>개선 후 {riskAfter(e.row) ?? "-"}</Badge>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="ml-auto"
                    onClick={() => setEditId(e.row.id)}
                    aria-label="사진·개선내용 관리"
                  >
                    <SlidersHorizontal className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 관리 다이얼로그 */}
      <Dialog open={!!editing} onClose={() => setEditId(null)} className="sm:max-w-2xl">
        {editing && (
          <>
            <DialogHeader>
              <DialogTitle>
                {editing.row.code || "평가코드 미부여"} · {editing.assessment.process || "공정 미입력"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <PhotoSlot
                  label="개선 전 사진"
                  photoId={editing.row.beforePhoto}
                  onChange={(id) => patch(editing, { beforePhoto: id })}
                  disabled={!canUploadPhoto}
                />
                <PhotoSlot
                  label="개선 후 사진"
                  photoId={editing.row.afterPhoto}
                  onChange={(id) => patch(editing, { afterPhoto: id })}
                  disabled={!canUploadPhoto}
                />
              </div>
              <fieldset disabled={!canEdit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>위험내용</Label>
                <Textarea
                  value={editing.row.hazard}
                  onChange={(ev) => patch(editing, { hazard: ev.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>개선내용</Label>
                <Textarea
                  value={editing.row.improveContent}
                  placeholder={editing.row.measure || "개선대책 내용을 입력하세요"}
                  onChange={(ev) => patch(editing, { improveContent: ev.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>개선일자</Label>
                  <Input
                    type="date"
                    value={editing.row.improveDate}
                    onChange={(ev) => patch(editing, { improveDate: ev.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>개선 후 가능성</Label>
                  <ScoreSelect
                    kind="p"
                    value={editing.row.p2}
                    onChange={(v) => patch(editing, { p2: v })}
                    className="h-8 bg-input/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>개선 후 중대성</Label>
                  <ScoreSelect
                    kind="s"
                    value={editing.row.s2}
                    onChange={(v) => patch(editing, { s2: v })}
                    className="h-8 bg-input/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>조치상태</Label>
                  <Select
                    value={editing.row.status}
                    onChange={(ev) => patch(editing, { status: ev.target.value as RiskItem["status"] })}
                    className="w-full"
                  >
                    {settings.statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              </fieldset>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditId(null)}>
                닫기
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* 인쇄용 사진대지 (화면에서는 숨김) */}
      <PhotoSheet entries={printEntries} />
    </div>
  );
}
