/**
 * 이력 관리 · 실시서·공람표 목록.
 *
 * 서식이 세 종류(사전 교육·회의 / 결과 교육 / 공람표)라 **발행 버튼도 세 개**다.
 * 누르면 그 서식의 새 문서가 전체 화면으로 열리고, '등록'을 눌러야 서버에 남는다
 * (설문지·작업중지권과 같은 규칙 — 쓰다 만 문서가 목록에 쌓이지 않게).
 *
 * 공람표는 교육 서식이 아니지만 **서명 구조가 같아** 같은 목록·같은 저장소를 쓴다.
 * 대신 목록의 칸 이름은 두 성격을 모두 담도록 중립적으로 뒀다(강사·평가자 / 인원).
 */
import * as React from "react";
import { GraduationCap, Lock, LockOpen, Trash2, Users } from "lucide-react";
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
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableWrap,
} from "@/components/ui";
import { TrainingDetail } from "@/pages/TrainingDetail";
import {
  headcountOf,
  isCircular,
  signedCount,
  trainingLabel,
  TRAINING_KINDS,
  type Training,
  type TrainingKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

/** 구분별 색 — 세 서식을 목록에서 한눈에 가르기 위한 것 */
const KIND_TONE: Record<TrainingKind, string> = {
  "사전 교육·회의": "bg-series-1/10 text-series-1",
  "결과 교육": "text-foreground",
  "공람표": "bg-series-2/10 text-series-2",
};

export function TrainingsPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { trainings, loading, identity, canEdit, canDelete, createTraining, saveTraining, removeTraining } = useStore();
  const isAdmin = identity.role === "admin";
  const [draft, setDraft] = React.useState<Training | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Training | null>(null);
  const [q, setQ] = React.useState("");
  const [fKind, setFKind] = React.useState("");

  if (draft) {
    return (
      <TrainingDetail
        training={draft}
        isNew
        onDone={(saved) => {
          setDraft(null);
          if (saved) onOpen(null); // 등록하면 목록으로 돌아가 바로 확인한다
        }}
      />
    );
  }

  const current = trainings.find((v) => v.id === openId) ?? null;
  if (openId && current) return <TrainingDetail training={current} onDone={() => onOpen(null)} />;

  const query = q.trim().toLowerCase();
  const sorted = [...trainings]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .filter((v) => {
      if (fKind && v.kind !== fKind) return false;
      if (!query) return true;
      return [v.instructor, v.place, v.facility, v.eduContent, v.meetContent].some((t) => (t || "").toLowerCase().includes(query));
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          실시한 교육·회의와 위험성평가 결과 공람을 서식 그대로 남깁니다. 참석자는 게스트로 들어와
          자기 이름 옆에 직접 서명할 수 있습니다.
        </p>
        {/* 발행 버튼 세 개 — 서식마다 들어가는 칸이 달라 처음부터 종류를 고르게 한다 */}
        <div className="flex flex-wrap gap-2">
          {TRAINING_KINDS.map((kind) => (
            <Button
              key={kind}
              variant={kind === "사전 교육·회의" ? "default" : "outline"}
              disabled={!canEdit}
              onClick={() => setDraft(createTraining(kind))}
              title={
                canEdit
                  ? `${kind}${kind === "공람표" ? "를" : " 실시서를"} 새로 발행합니다`
                  : "발행은 관리자만 할 수 있습니다"
              }
            >
              {kind} 발행
            </Button>
          ))}
        </div>
      </div>

      {trainings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 max-w-sm"
            placeholder="강사·평가자·장소·내용 검색…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select className="h-9" value={fKind} onChange={(e) => setFKind(e.target.value)}>
            <option value="">구분 전체</option>
            {TRAINING_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
      )}

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : trainings.length === 0 ? (
            <EmptyState icon={<GraduationCap className="size-6 text-muted-foreground" />}>
              발행된 문서가 없습니다. 위의 발행 버튼으로 시작하세요.
            </EmptyState>
          ) : sorted.length === 0 ? (
            <EmptyState icon={<GraduationCap className="size-6 text-muted-foreground" />}>
              조건에 맞는 문서가 없습니다.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="[&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    <TH className="w-32">날짜</TH>
                    <TH className="w-40">구분</TH>
                    <TH className="w-32">강사·평가자</TH>
                    <TH className="w-24 text-center">인원</TH>
                    <TH className="w-28 text-center">서명 현황</TH>
                    <TH>장소·대상시설</TH>
                    {/* 잠금 + 삭제 두 버튼이 들어간다 */}
                    <TH className="w-24" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((v) => {
                    const signed = signedCount(v);
                    const total = v.attendees.length;
                    return (
                      <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                        <TD className="tabular-nums font-medium">{v.date || "-"}</TD>
                        <TD>
                          <Badge variant="outline" className={cn("font-normal", KIND_TONE[v.kind])}>
                            {trainingLabel(v)}
                          </Badge>
                        </TD>
                        <TD>{v.instructor || "-"}</TD>
                        <TD className="text-center tabular-nums">{headcountOf(v) || "-"}</TD>
                        <TD className="text-center">
                          {total === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 tabular-nums",
                                signed === total ? "text-series-1" : "text-muted-foreground",
                              )}
                            >
                              <Users className="size-3.5" />
                              {signed}/{total}
                            </span>
                          )}
                        </TD>
                        <TD className="text-muted-foreground">{(isCircular(v) ? v.facility : v.place) || "-"}</TD>
                        <TD className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {/* 잠금 — 잠그면 게스트는 서명도 못 한다 */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!isAdmin}
                            className={v.locked ? "text-foreground" : "text-muted-foreground"}
                            onClick={() => void saveTraining({ ...v, locked: !v.locked })}
                            aria-label={v.locked ? "잠금 해제" : "잠금"}
                            title={
                              !isAdmin
                                ? v.locked
                                  ? "관리자가 잠근 문서입니다"
                                  : "잠금은 관리자만 할 수 있습니다"
                                : v.locked
                                  ? "잠금 해제 — 다시 서명을 받을 수 있게 합니다"
                                  : "잠금 — 더 이상 고치거나 서명하지 못하게 합니다"
                            }
                          >
                            {v.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canDelete || (v.locked && !isAdmin)}
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
          <DialogTitle>이 문서를 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.date || "-"} · {deleteTarget ? trainingLabel(deleteTarget) : "-"} · {deleteTarget?.instructor || "미입력"}
          <br />
          받아 둔 서명 {deleteTarget ? signedCount(deleteTarget) : 0}건도 함께 사라집니다. 되돌릴 수 없습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteTarget) await removeTraining(deleteTarget.id);
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
