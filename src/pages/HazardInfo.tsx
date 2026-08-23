import * as React from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import {
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
import { HazardInfoDetail } from "@/pages/HazardInfoDetail";
import type { HazardInfo } from "@/lib/types";
import { useStore } from "@/store";

export function HazardInfoPage({
  openId,
  onOpen,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
}) {
  const { hazardInfos, loading, createHazardInfo, removeHazardInfo } = useStore();
  const [deleteTarget, setDeleteTarget] = React.useState<HazardInfo | null>(null);

  const current = hazardInfos.find((h) => h.id === openId) ?? null;
  if (openId && current) return <HazardInfoDetail info={current} onBack={() => onOpen(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            공정별 유해·위험 정보를 등록하고 원본 서식(A4 가로)으로 출력합니다.
          </p>
        </div>
        <Button
          size="icon-lg"
          onClick={async () => {
            const h = await createHazardInfo();
            onOpen(h.id);
          }}
          aria-label="새 유해위험정보"
        >
          <Plus />
        </Button>
      </div>

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : hazardInfos.length === 0 ? (
            <EmptyState icon={<ClipboardList className="size-6 text-muted-foreground" />}>
              등록된 유해위험정보가 없습니다. &lsquo;새 유해위험정보&rsquo;로 시작하세요.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="[&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    <TH>대상시설</TH>
                    <TH>공정명</TH>
                    <TH className="w-32">작성일</TH>
                    <TH className="w-24 text-right">작업단계</TH>
                    <TH className="w-28 text-center">평가표 연동</TH>
                    <TH className="w-16" />
                  </TR>
                </THead>
                <TBody>
                  {hazardInfos.map((h) => (
                    <TR key={h.id} className="cursor-pointer" onClick={() => onOpen(h.id)}>
                      <TD className="font-medium">{h.facility || "-"}</TD>
                      <TD className="text-muted-foreground">{h.process || "-"}</TD>
                      <TD className="tabular-nums">{h.date || "-"}</TD>
                      <TD className="text-right tabular-nums">{h.steps.length}</TD>
                      <TD className="text-center text-muted-foreground">{h.assessmentId ? "연동" : "-"}</TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(h)}
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>유해위험정보를 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.facility || "-"} · {deleteTarget?.process || "-"}
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
              if (deleteTarget) await removeHazardInfo(deleteTarget.id);
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
