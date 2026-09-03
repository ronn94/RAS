import * as React from "react";
import { Lock, LockOpen, MessageSquarePlus, Plus, Trash2 } from "lucide-react";
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
import { SurveyDetail } from "@/pages/SurveyDetail";
import { classNames, inspectionMoved } from "@/lib/settings";
import { riskBadgeClass, riskOf } from "@/lib/risk";
import { REVIEW_STATUSES, reviewOf, type Survey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

/** 검토 상태별 색 — 반영은 확정, 반려는 경고로 읽히게 */
const REVIEW_TONE: Record<string, string> = {
  접수: "text-muted-foreground",
  검토중: "text-foreground",
  반영: "bg-series-1/10 text-series-1",
  반려: "bg-destructive/10 text-destructive",
};

export function SurveysPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { assessments, surveys, settings, loading, identity, createSurvey, saveSurvey, removeSurvey, canSurvey } =
    useStore();
  const [deleteTarget, setDeleteTarget] = React.useState<Survey | null>(null);
  /** 잠금은 관리자만 걸고 푼다 */
  const isAdmin = identity.role === "admin";
  const [q, setQ] = React.useState("");
  const [fClass, setFClass] = React.useState("");
  const [fReview, setFReview] = React.useState("");
  const [fLocked, setFLocked] = React.useState(false);
  /** 아직 제출하지 않은 새 설문지 — 서버에 없고 화면에서만 들고 있다 */
  const [draft, setDraft] = React.useState<Survey | null>(null);

  if (draft) {
    return (
      <SurveyDetail
        survey={draft}
        isNew
        onDone={(saved) => {
          setDraft(null);
          if (saved) onOpen(null); // 제출하면 목록으로 돌아가 등록된 것을 바로 본다
        }}
      />
    );
  }

  const current = surveys.find((v) => v.id === openId) ?? null;
  if (openId && current) return <SurveyDetail survey={current} onDone={() => onOpen(null)} />;

  // 작성일자 내림차순 — 최근 의견이 위로
  const query = q.trim().toLowerCase();
  const sorted = [...surveys]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .filter((v) => {
      if (fClass && v.hazardClass !== fClass) return false;
      if (fReview && reviewOf(v) !== fReview) return false;
      if (fLocked && !v.locked) return false;
      if (!query) return true;
      return [v.author, v.process, v.subProcess, v.hazard, v.measure]
        .some((t) => (t || "").toLowerCase().includes(query));
    });
  const lockedCount = surveys.filter((v) => v.locked).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          현장에서 찾은 위험요인과 개선 의견을 제출합니다. 제출된 의견은 위험성평가표로 옮길 수 있습니다.
        </p>
        <Button
          size="icon-lg"
          disabled={!canSurvey}
          onClick={() => setDraft(createSurvey())}
          aria-label="새 설문지"
          title={canSurvey ? undefined : "설문지 제출 권한이 없습니다"}
        >
          <Plus />
        </Button>
      </div>

      {/* 툴바 — 건수가 쌓였을 때 찾기 위한 것. 다른 목록 화면과 같은 구성이다 */}
      {surveys.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 max-w-sm"
            placeholder="작성자·공정·유해위험요인·개선대책 검색…"
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
          <Select className="h-9" value={fReview} onChange={(e) => setFReview(e.target.value)}>
            <option value="">검토상태 전체</option>
            {REVIEW_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>
          <Button variant={fLocked ? "default" : "outline"} className="h-9 py-2" onClick={() => setFLocked((v) => !v)}>
            잠긴 것만 ({lockedCount})
          </Button>
        </div>
      )}

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : surveys.length === 0 ? (
            <EmptyState icon={<MessageSquarePlus className="size-6 text-muted-foreground" />}>
              제출된 의견이 없습니다. &lsquo;새 설문지&rsquo;로 의견을 남겨주세요.
            </EmptyState>
          ) : sorted.length === 0 ? (
            <EmptyState icon={<MessageSquarePlus className="size-6 text-muted-foreground" />}>
              조건에 맞는 의견이 없습니다.
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
                    <TH className="w-24 text-center">검토</TH>
                    <TH className="w-24 text-center">평가표 이관</TH>
                    {/* 잠금 + 삭제 두 버튼이 들어간다 */}
                    <TH className="w-24" />
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
                          <Badge variant="outline" className={cn("font-normal", REVIEW_TONE[reviewOf(v)])}>
                            {reviewOf(v)}
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
                        <TD className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {/* 잠금 — 관리자만 걸고 푼다. 게스트에게는 상태만 보여준다 */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!isAdmin}
                            className={v.locked ? "text-foreground" : "text-muted-foreground"}
                            onClick={() => void saveSurvey({ ...v, locked: !v.locked })}
                            aria-label={v.locked ? "잠금 해제" : "잠금"}
                            title={
                              !isAdmin
                                ? v.locked
                                  ? "관리자가 잠근 의견입니다"
                                  : "잠금은 관리자만 할 수 있습니다"
                                : v.locked
                                  ? "잠금 해제 — 구성원이 다시 고칠 수 있게 합니다"
                                  : "잠금 — 구성원이 고치거나 지우지 못하게 합니다"
                            }
                          >
                            {v.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canSurvey || (v.locked && !isAdmin)}
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
