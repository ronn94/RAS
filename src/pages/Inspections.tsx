import * as React from "react";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
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
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableWrap,
} from "@/components/ui";
import { InspectionDetail } from "@/pages/InspectionDetail";
import type { Inspection } from "@/lib/types";
import { useStore } from "@/store";

export function InspectionsPage({
  openId,
  onOpen,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
}) {
  const { inspections, loading, createInspection, removeInspection, canEdit, canDelete } = useStore();
  const [deleteTarget, setDeleteTarget] = React.useState<Inspection | null>(null);

  const current = inspections.find((v) => v.id === openId) ?? null;
  if (openId && current) return <InspectionDetail inspection={current} onBack={() => onOpen(null)} />;

  // 점검일자 내림차순 — 최근 점검이 위로
  const sorted = [...inspections].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          순회점검으로 발굴한 유해·위험요인을 기록합니다. 발굴 항목은 위험성평가표로 옮길 수 있습니다.
        </p>
        <Button
          size="icon-lg"
          disabled={!canEdit}
          onClick={async () => {
            const v = await createInspection();
            onOpen(v.id);
          }}
          aria-label="새 순회점검"
          title={canEdit ? undefined : "보기 전용 계정입니다"}
        >
          <Plus />
        </Button>
      </div>

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : inspections.length === 0 ? (
            <EmptyState icon={<ClipboardCheck className="size-6 text-muted-foreground" />}>
              등록된 순회점검이 없습니다. &lsquo;새 순회점검&rsquo;을 만드세요.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="[&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    <TH>시설명</TH>
                    <TH>공정명</TH>
                    <TH className="w-32">점검일자</TH>
                    <TH className="w-24">점검자</TH>
                    <TH className="w-24 text-right">발굴</TH>
                    <TH className="w-24 text-right">참석자</TH>
                    <TH className="w-28 text-center">평가표 이관</TH>
                    <TH className="w-16" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((v) => {
                    const filled = v.items.filter((it) => it.content.trim());
                    const moved = v.items.filter((it) => it.movedTo).length;
                    return (
                      <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                        <TD className="font-medium">{v.facility || "-"}</TD>
                        <TD className="text-muted-foreground">{v.process || "-"}</TD>
                        <TD className="tabular-nums">{v.date || "-"}</TD>
                        <TD className="text-muted-foreground">{v.inspector || "-"}</TD>
                        <TD className="text-right tabular-nums">{filled.length}</TD>
                        <TD className="text-right tabular-nums text-muted-foreground">
                          {v.attendees.filter((a) => a.name.trim()).length}
                        </TD>
                        <TD className="text-center">
                          {moved > 0 ? (
                            <Badge variant="outline" className="font-normal tabular-nums">
                              {moved}건
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
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
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>순회점검 기록을 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.facility || "-"} · {deleteTarget?.process || "-"} ({deleteTarget?.date || "-"})
          <br />
          삭제하면 되돌릴 수 없습니다. 이미 평가표로 옮긴 항목은 평가표에 그대로 남습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteTarget) await removeInspection(deleteTarget.id);
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
