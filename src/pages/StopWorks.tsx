/**
 * 작업중지권 — 작업중지 요청서와 우선조치 요청서를 한 메뉴에서 다룬다.
 *
 * 두 서식은 성격이 달라(전자는 근로자의 권리 행사, 후자는 점검자·본사의 발행)
 * 목록을 탭으로 나눈다. 작업중지명령서는 별도 문서가 아니라 **작업중지 1건의
 * 게시용 출력물**이라 상세 화면의 인쇄 버튼으로만 나온다.
 */
import * as React from "react";
import { FileWarning, OctagonAlert, Plus, Printer, Trash2 } from "lucide-react";
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
import { StopWorkDetail } from "@/pages/StopWorkDetail";
import { PriorityActionDetail } from "@/pages/PriorityActionDetail";
import { StopWorkReportSheet, availableHalves, halfLabel } from "@/print/StopWorkReportSheet";
import { inspectionMoved } from "@/lib/settings";
import {
  PRIORITY_STATUSES,
  STOP_STATUSES,
  type PriorityAction,
  type StopWork,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

/** 상태별 색 — '중지'는 지금 멈춰 있다는 뜻이라 가장 강하게 */
const STOP_TONE: Record<string, string> = {
  중지: "bg-destructive/10 text-destructive",
  조치중: "text-foreground",
  재개: "bg-series-1/10 text-series-1",
  중단: "bg-destructive/10 text-destructive",
};
const PRIORITY_TONE: Record<string, string> = {
  발행: "bg-destructive/10 text-destructive",
  조치중: "text-foreground",
  완료: "bg-series-1/10 text-series-1",
};

type Tab = "stop" | "priority";

export function StopWorksPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const {
    assessments,
    stopWorks,
    priorityActions,
    loading,
    identity,
    createStopWork,
    removeStopWork,
    canStopWork,
    createPriorityAction,
    removePriorityAction,
    canEdit,
  } = useStore();
  const isAdmin = identity.role === "admin";
  const [tab, setTab] = React.useState<Tab>("stop");
  const [q, setQ] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [deleteStop, setDeleteStop] = React.useState<StopWork | null>(null);
  const [deletePriority, setDeletePriority] = React.useState<PriorityAction | null>(null);
  /** 아직 등록하지 않은 새 문서 — 설문지와 같이 화면에서만 들고 있다 */
  const [stopDraft, setStopDraft] = React.useState<StopWork | null>(null);
  const [priorityDraft, setPriorityDraft] = React.useState<PriorityAction | null>(null);

  /* 반기 실적표 인쇄 — 목록 화면에서만 쓴다 */
  const halves = React.useMemo(() => availableHalves(stopWorks), [stopWorks]);
  const [half, setHalf] = React.useState(halves[0]);
  const [printTick, setPrintTick] = React.useState(0);
  React.useEffect(() => {
    if (printTick > 0) window.print();
  }, [printTick]);

  if (stopDraft) {
    return (
      <StopWorkDetail
        stopWork={stopDraft}
        isNew
        onDone={(saved) => {
          setStopDraft(null);
          if (saved) onOpen(null);
        }}
      />
    );
  }
  if (priorityDraft) {
    return (
      <PriorityActionDetail
        action={priorityDraft}
        isNew
        onDone={(saved) => {
          setPriorityDraft(null);
          if (saved) onOpen(null);
        }}
      />
    );
  }

  const openStop = stopWorks.find((v) => v.id === openId) ?? null;
  if (openId && openStop) return <StopWorkDetail stopWork={openStop} onDone={() => onOpen(null)} />;
  const openPriority = priorityActions.find((v) => v.id === openId) ?? null;
  if (openId && openPriority) return <PriorityActionDetail action={openPriority} onDone={() => onOpen(null)} />;

  const query = q.trim().toLowerCase();
  const stopRows = [...stopWorks]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .filter((v) => {
      if (fStatus && v.status !== fStatus) return false;
      if (!query) return true;
      return [v.no, v.dept, v.process, v.workName, v.requesterName, v.reason, v.result]
        .some((t) => (t || "").toLowerCase().includes(query));
    });
  const priorityRows = [...priorityActions]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .filter((v) => {
      if (fStatus && v.status !== fStatus) return false;
      if (!query) return true;
      return [v.no, v.site, v.rep, v.finding, v.request]
        .some((t) => (t || "").toLowerCase().includes(query));
    });

  const isStop = tab === "stop";
  const empty = isStop ? stopWorks.length === 0 : priorityActions.length === 0;
  const rowsShown = isStop ? stopRows.length : priorityRows.length;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          {isStop
            ? "급박한 위험이 있을 때 근로자가 작업을 멈추고 요청서를 냅니다. 현장에는 작업중지명령서를 인쇄해 붙입니다."
            : "점검에서 중대한 이슈가 확인되면 사업부문에 우선조치를 요청합니다(48시간 이내 처리)."}
        </p>
        <div className="flex items-center gap-2">
          {isStop && (
            <>
              <Select
                className="h-9"
                value={half}
                onChange={(e) => setHalf(e.target.value)}
                aria-label="실적표 대상 반기"
              >
                {halves.map((h) => (
                  <option key={h} value={h}>
                    {halfLabel(h)}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => setPrintTick((t) => t + 1)}
                aria-label="반기 운영 현황 인쇄"
                title="작업중지권 운영 현황 (반기 실적표 · 본사 보고용)"
              >
                <Printer />
              </Button>
            </>
          )}
          <Button
            size="icon-lg"
            disabled={isStop ? !canStopWork : !canEdit}
            onClick={() => (isStop ? setStopDraft(createStopWork()) : setPriorityDraft(createPriorityAction()))}
            aria-label={isStop ? "새 작업중지 요청서" : "새 우선조치 요청서"}
            title={
              isStop
                ? canStopWork
                  ? undefined
                  : "작업중지 요청 권한이 없습니다"
                : canEdit
                  ? undefined
                  : "우선조치 요청서는 관리자만 발행합니다"
            }
          >
            <Plus />
          </Button>
        </div>
      </div>

      {/* 탭 — 두 서식은 성격이 달라 목록을 나눈다 */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-muted p-0.5">
          {(
            [
              ["stop", `작업중지 요청서 (${stopWorks.length})`],
              ["priority", `우선조치 요청서 (${priorityActions.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setFStatus("");
              }}
              className={cn(
                "rounded-[0.6rem] px-3 py-1.5 text-sm transition-colors",
                tab === key ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {!empty && (
          <>
            <Input
              className="h-9 max-w-sm"
              placeholder={isStop ? "접수번호·소속·작업명·요청자·사유 검색…" : "발행번호·사업장·확인내용 검색…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select className="h-9" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">상태 전체</option>
              {(isStop ? STOP_STATUSES : PRIORITY_STATUSES).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>

      <Card className="no-print py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : empty ? (
            <EmptyState
              icon={
                isStop ? (
                  <OctagonAlert className="size-6 text-muted-foreground" />
                ) : (
                  <FileWarning className="size-6 text-muted-foreground" />
                )
              }
            >
              {isStop
                ? "접수된 작업중지 요청이 없습니다. 급박한 위험을 발견하면 즉시 작업을 멈추고 요청서를 내세요."
                : "발행한 우선조치 요청서가 없습니다."}
            </EmptyState>
          ) : rowsShown === 0 ? (
            <EmptyState>조건에 맞는 문서가 없습니다.</EmptyState>
          ) : isStop ? (
            <TableWrap>
              {/* PC에서는 표가 화면 안에 들어가고(가로 스크롤 없음), 좁은 화면에서만 스크롤된다 —
                  min-w는 모바일용 최소 폭이고 md부터 풀어 100%를 나눠 쓴다(평가표 목록과 같은 방식).
                  긴 글이 들어가는 작업명·중지 사유는 잘라내지 않고 줄바꿈한다 */}
              <Table className="min-w-[64rem] table-fixed md:min-w-0 [&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    {/* 폭은 %로 나눈다 — rem 고정폭은 화면이 좁아지면 합이 100%를 넘어
                        마지막 칸이 한 글자씩 세로로 접힌다(실제로 겪은 문제) */}
                    <TH className="w-[8%]">접수번호</TH>
                    <TH className="w-[9%]">작성일</TH>
                    <TH className="w-[12%]">소속(업체)</TH>
                    <TH className="w-[7%]">요청자</TH>
                    <TH className="w-[19%]">작업명</TH>
                    <TH className="w-[27%]">중지 사유</TH>
                    <TH className="w-[6%] text-center">상태</TH>
                    <TH className="w-[7%] text-center">평가표 이관</TH>
                    <TH className="w-[5%]" />
                  </TR>
                </THead>
                <TBody>
                  {stopRows.map((v) => (
                    <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                      <TD className="font-medium tabular-nums">{v.no || "-"}</TD>
                      <TD className="tabular-nums">{v.date || "-"}</TD>
                      <TD className="truncate text-muted-foreground">{v.dept || "-"}</TD>
                      <TD className="truncate text-muted-foreground">{v.requesterName || "-"}</TD>
                      <TD className="whitespace-normal break-words">
                        {[v.process, v.workName].filter(Boolean).join(" · ") || "-"}
                      </TD>
                      <TD className="whitespace-normal break-words">{v.reason || "-"}</TD>
                      <TD className="text-center">
                        <Badge variant="outline" className={cn("font-normal", STOP_TONE[v.status])}>
                          {v.status}
                        </Badge>
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
                          disabled={!canStopWork || (!!v.locked && !isAdmin)}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteStop(v)}
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
          ) : (
            <TableWrap>
              <Table className="min-w-[64rem] table-fixed md:min-w-0 [&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    <TH className="w-[8%]">발행번호</TH>
                    <TH className="w-[9%]">발행일</TH>
                    <TH className="w-[15%]">사업장명</TH>
                    <TH className="w-[40%]">확인내용</TH>
                    <TH className="w-[9%]">조치기간</TH>
                    <TH className="w-[6%] text-center">상태</TH>
                    <TH className="w-[8%] text-center">평가표 이관</TH>
                    <TH className="w-[5%]" />
                  </TR>
                </THead>
                <TBody>
                  {priorityRows.map((v) => (
                    <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                      <TD className="font-medium tabular-nums">{v.no || "-"}</TD>
                      <TD className="tabular-nums">{v.date || "-"}</TD>
                      <TD className="truncate text-muted-foreground">{v.site || "-"}</TD>
                      <TD className="whitespace-normal break-words">{v.finding || "-"}</TD>
                      <TD className="tabular-nums text-muted-foreground">{v.dueDate || "-"}</TD>
                      <TD className="text-center">
                        <Badge variant="outline" className={cn("font-normal", PRIORITY_TONE[v.status])}>
                          {v.status}
                        </Badge>
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
                          disabled={!canEdit}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletePriority(v)}
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

      <Dialog open={!!deleteStop} onClose={() => setDeleteStop(null)}>
        <DialogHeader>
          <DialogTitle>이 작업중지 요청서를 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteStop?.no || "-"} · {[deleteStop?.process, deleteStop?.workName].filter(Boolean).join(" · ") || "-"} ·{" "}
          {deleteStop?.requesterName || "-"}
          <br />
          삭제하면 되돌릴 수 없습니다. 반기 실적표에서도 빠집니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteStop(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteStop) await removeStopWork(deleteStop.id);
              setDeleteStop(null);
            }}
          >
            삭제
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!deletePriority} onClose={() => setDeletePriority(null)}>
        <DialogHeader>
          <DialogTitle>이 우선조치 요청서를 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deletePriority?.no || "-"} · {deletePriority?.site || "-"}
          <br />
          삭제하면 되돌릴 수 없습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeletePriority(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deletePriority) await removePriorityAction(deletePriority.id);
              setDeletePriority(null);
            }}
          >
            삭제
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 반기 실적표 — 목록에서 인쇄 버튼을 눌렀을 때만 찍힌다 */}
      {printTick > 0 && <StopWorkReportSheet stopWorks={stopWorks} half={half} />}
    </div>
  );
}
