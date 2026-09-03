import * as React from "react";
import { MessageSquarePlus, Plus, Trash2 } from "lucide-react";
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
import { SurveyDetail } from "@/pages/SurveyDetail";
import { inspectionMoved } from "@/lib/settings";
import { riskBadgeClass, riskOf } from "@/lib/risk";
import type { Survey } from "@/lib/types";
import { useStore } from "@/store";

export function SurveysPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { assessments, surveys, loading, createSurvey, removeSurvey, canSurvey } = useStore();
  const [deleteTarget, setDeleteTarget] = React.useState<Survey | null>(null);

  const current = surveys.find((v) => v.id === openId) ?? null;
  if (openId && current) return <SurveyDetail survey={current} onBack={() => onOpen(null)} />;

  // 작성일자 내림차순 — 최근 의견이 위로
  const sorted = [...surveys].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          현장에서 찾은 위험요인과 개선 의견을 제출합니다. 제출된 의견은 위험성평가표로 옮길 수 있습니다.
        </p>
        <Button
          size="icon-lg"
          disabled={!canSurvey}
          onClick={async () => {
            const v = await createSurvey();
            onOpen(v.id);
          }}
          aria-label="새 설문지"
          title={canSurvey ? undefined : "설문지 제출 권한이 없습니다"}
        >
          <Plus />
        </Button>
      </div>

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : surveys.length === 0 ? (
            <EmptyState icon={<MessageSquarePlus className="size-6 text-muted-foreground" />}>
              제출된 의견이 없습니다. &lsquo;새 설문지&rsquo;로 의견을 남겨주세요.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="[&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    <TH className="w-24">작성자</TH>
                    <TH className="w-32">작성일자</TH>
                    <TH className="w-32">공정명</TH>
                    <TH className="w-28">세부공정</TH>
                    <TH className="w-24">위험분류</TH>
                    <TH className="w-20 text-center">위험코드</TH>
                    <TH>유해위험요인</TH>
                    <TH className="w-20 text-center">위험성</TH>
                    <TH className="w-24 text-center">평가표 이관</TH>
                    <TH className="w-16" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((v) => {
                    const risk = riskOf(v.p, v.s);
                    return (
                      <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                        <TD className="font-medium">{v.author || "-"}</TD>
                        <TD className="tabular-nums">{v.date || "-"}</TD>
                        <TD className="text-muted-foreground">{v.process || "-"}</TD>
                        <TD className="text-muted-foreground">{v.subProcess || "-"}</TD>
                        <TD className="text-muted-foreground">{v.hazardClass || "-"}</TD>
                        <TD className="text-center tabular-nums text-muted-foreground">{v.hazardCode || "-"}</TD>
                        <TD className="max-w-md truncate whitespace-normal">{v.hazard || "-"}</TD>
                        <TD className="text-center">
                          <Badge className={riskBadgeClass(risk)}>{risk ?? "-"}</Badge>
                        </TD>
                        <TD className="text-center">
                          {inspectionMoved(assessments, v.movedTo) ? (
                            <Badge variant="outline" className="font-normal">
                              이관됨
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canSurvey}
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
          <DialogTitle>이 의견을 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.author || "-"} · {deleteTarget?.date || "-"} · {deleteTarget?.hazard?.slice(0, 30) || "-"}
          <br />
          삭제하면 되돌릴 수 없습니다. 이미 평가표로 옮긴 내용은 평가표에 그대로 남습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteTarget) await removeSurvey(deleteTarget.id);
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
