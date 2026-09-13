/**
 * 이력 관리 · 정기·사후심사 — 위험성평가 인정심사(최초·재인정·사후) 이력.
 *
 * 다른 이력 서식과 달리 완성본 미리보기나 서명이 없다 — 관리자가 심사 결과를 받은 뒤
 * 표 한 줄로 정리해 남기는 기록이라, 목록 위에서 다이얼로그 하나로 등록·수정을 끝낸다.
 */
import * as React from "react";
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";
import {
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
  Textarea,
} from "@/components/ui";
import {
  CERT_REVIEW_CATEGORIES,
  CERT_REVIEW_RESULTS,
  emptyCertReview,
  sortCertReviews,
  type CertReview,
} from "@/lib/certReview";
import { useStore } from "@/store";

const RESULT_TONE: Record<string, string> = {
  인정: "bg-series-1/10 text-series-1",
  불인정: "bg-destructive/10 text-destructive",
  보류: "bg-muted text-muted-foreground",
};

export function CertReviewsPage() {
  const { certReviews, loading, canEdit, canDelete, saveCertReview, removeCertReview } = useStore();
  const [draft, setDraft] = React.useState<CertReview | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CertReview | null>(null);

  const sorted = sortCertReviews(certReviews);

  const startNew = () => setDraft(emptyCertReview());
  const startEdit = (v: CertReview) => setDraft({ ...v });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveCertReview({ ...draft, updatedAt: Date.now() });
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          안전보건공단 등 외부 기관의 위험성평가 인정심사(최초·재인정·사후) 결과를 기록합니다.
        </p>
        <Button
          size="icon-lg"
          disabled={!canEdit}
          onClick={startNew}
          aria-label="새 심사 이력"
          title={canEdit ? undefined : "보기 전용 계정입니다"}
        >
          <Plus />
        </Button>
      </div>

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : sorted.length === 0 ? (
            <EmptyState icon={<BadgeCheck className="size-6 text-muted-foreground" />}>
              등록된 심사 이력이 없습니다. &lsquo;+&rsquo;로 시작하세요.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="[&_:is(th,td)]:px-3">
                <THead>
                  <TR>
                    <TH className="w-12 text-right">번호</TH>
                    <TH className="w-44">항목</TH>
                    <TH className="w-28">심사날짜</TH>
                    <TH className="w-20 text-center">결과</TH>
                    <TH className="w-16 text-right">점수</TH>
                    <TH className="w-28">주관</TH>
                    <TH className="w-28">심사위원</TH>
                    <TH className="min-w-40">총평</TH>
                    <TH className="min-w-32">비고</TH>
                    <TH className="w-16" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((v, i) => (
                    <TR key={v.id} className="cursor-pointer" onClick={() => canEdit && startEdit(v)}>
                      <TD className="text-right tabular-nums text-muted-foreground">{sorted.length - i}</TD>
                      <TD className="font-medium">{v.category || "-"}</TD>
                      <TD className="tabular-nums">{v.date || "-"}</TD>
                      <TD className="text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            RESULT_TONE[v.result] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          {v.result || "-"}
                        </span>
                      </TD>
                      <TD className="text-right tabular-nums">{v.score ?? "-"}</TD>
                      <TD className="text-muted-foreground">{v.organizer || "-"}</TD>
                      <TD className="text-muted-foreground">{v.examiners || "-"}</TD>
                      <TD className="whitespace-pre-line text-muted-foreground">{v.summary || "-"}</TD>
                      <TD className="whitespace-pre-line text-muted-foreground">{v.note || "-"}</TD>
                      <TD className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canEdit}
                          onClick={() => startEdit(v)}
                          aria-label="수정"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canDelete}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(v)}
                          aria-label="삭제"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!draft} onClose={() => setDraft(null)}>
        <DialogHeader>
          <DialogTitle>{certReviews.some((v) => v.id === draft?.id) ? "심사 이력 수정" : "새 심사 이력"}</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="space-y-3">
            <div>
              <Label>항목</Label>
              <Input
                className="mt-1"
                list="cert-review-categories"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="위험성평가 최초 인정심사"
              />
              <datalist id="cert-review-categories">
                {CERT_REVIEW_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>심사날짜</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div>
                <Label>결과</Label>
                <Select
                  className="mt-1"
                  value={draft.result}
                  onChange={(e) => setDraft({ ...draft, result: e.target.value })}
                >
                  {CERT_REVIEW_RESULTS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>점수</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={draft.score ?? ""}
                  onChange={(e) => setDraft({ ...draft, score: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="없으면 비워 둠"
                />
              </div>
              <div>
                <Label>주관</Label>
                <Input
                  className="mt-1"
                  value={draft.organizer}
                  onChange={(e) => setDraft({ ...draft, organizer: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>심사위원</Label>
              <Input
                className="mt-1"
                value={draft.examiners}
                onChange={(e) => setDraft({ ...draft, examiners: e.target.value })}
                placeholder="여러 명이면 쉼표로 구분"
              />
            </div>
            <div>
              <Label>총평</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />
            </div>
            <div>
              <Label>비고</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDraft(null)}>
            취소
          </Button>
          <Button onClick={() => void save()} disabled={saving || !draft?.category || !draft?.date}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>이 심사 이력을 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.date || "-"} · {deleteTarget?.category || "-"}
          <br />
          삭제하면 되돌릴 수 없습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteTarget) await removeCertReview(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            삭제
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
