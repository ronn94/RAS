import * as React from "react";
import { FileSpreadsheet, FileUp, Plus, Trash2 } from "lucide-react";
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
import { AssessmentDetail } from "@/pages/AssessmentDetail";
import { importAssessment } from "@/lib/excel";
import { isHighRisk } from "@/lib/risk";
import type { Assessment } from "@/lib/types";
import { useStore } from "@/store";

export function AssessmentsPage({
  openId,
  onOpen,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
}) {
  const { assessments, loading, createAssessment, saveAssessment, removeAssessment, canEdit, canDelete } = useStore();
  const [deleteTarget, setDeleteTarget] = React.useState<Assessment | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const current = assessments.find((a) => a.id === openId) ?? null;
  if (openId && current) return <AssessmentDetail assessment={current} onBack={() => onOpen(null)} />;

  const handleImport = async (file: File) => {
    try {
      const a = await importAssessment(file);
      await saveAssessment(a);
      onOpen(a.id);
    } catch (e) {
      alert(`엑셀을 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            대상시설·공정별 위험성평가표를 관리합니다. 평가표를 열어 행을 추가·수정하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="icon-lg"
            disabled={!canEdit}
            onClick={() => fileRef.current?.click()}
            aria-label="엑셀 가져오기"
            title={canEdit ? undefined : "보기 전용 계정입니다"}
          >
            <FileUp />
          </Button>
          <Button
            size="icon-lg"
            disabled={!canEdit}
            onClick={async () => {
              const a = await createAssessment();
              onOpen(a.id);
            }}
            aria-label="새 평가표"
            title={canEdit ? undefined : "보기 전용 계정입니다"}
          >
            <Plus />
          </Button>
        </div>
      </div>

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : assessments.length === 0 ? (
            <EmptyState icon={<FileSpreadsheet className="size-6 text-muted-foreground" />}>
              등록된 평가표가 없습니다. &lsquo;새 평가표&rsquo;를 만들거나 기존 엑셀을 가져오세요.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="[&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    <TH>대상시설</TH>
                    <TH>공정명</TH>
                    <TH className="w-32">평가일시</TH>
                    <TH className="w-20 text-right">항목</TH>
                    <TH className="w-24 text-right">고위험군</TH>
                    <TH className="w-28 text-center">개선완료</TH>
                    <TH className="w-16" />
                  </TR>
                </THead>
                <TBody>
                  {assessments.map((a) => {
                    const high = a.rows.filter(isHighRisk);
                    const done = high.filter((r) => r.status === "개선완료").length;
                    return (
                      <TR key={a.id} className="cursor-pointer" onClick={() => onOpen(a.id)}>
                        <TD className="font-medium">{a.facility || "-"}</TD>
                        <TD className="text-muted-foreground">{a.process || "-"}</TD>
                        <TD className="tabular-nums">{a.date || "-"}</TD>
                        <TD className="text-right tabular-nums">{a.rows.length}</TD>
                        <TD className="text-right">
                          {high.length > 0 ? (
                            <Badge className="bg-destructive/10 text-destructive tabular-nums">{high.length}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TD>
                        <TD className="text-center tabular-nums text-muted-foreground">
                          {high.length ? `${done}/${high.length}` : "-"}
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canDelete}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(a)}
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
          <DialogTitle>평가표를 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.facility || "-"} · {deleteTarget?.process || "-"} ({deleteTarget?.rows.length ?? 0}건)
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
              if (deleteTarget) await removeAssessment(deleteTarget.id);
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
