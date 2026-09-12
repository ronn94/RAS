/**
 * 위험성평가 — '작업평가' 탭.
 *
 * 정기평가(위험성평가표)가 공정 단위로 한 해 한 장을 쌓는다면, 작업평가는 **작업 한 건마다
 * 한 장**이다. 그래서 목록도 평가일자 내림차순으로 쌓인다.
 *
 * '등록'을 누르면 5단계로 나뉜 작성 화면이 열린다(JobAssessmentDetail).
 */
import * as React from "react";
import { ClipboardPen, Lock, LockOpen, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { JobAssessmentDetail } from "@/pages/JobAssessmentDetail";
import { JobAssessmentPreview } from "@/pages/JobAssessmentPreview";
import {
  jraGrade,
  jraLabel,
  jraScore,
  JOB_TEAMS,
  overLimitCount,
  scoredRows,
  signedParticipants,
  topRisk,
  type JobAssessment,
} from "@/lib/jobAssessment";
import { riskBadgeClass } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

/** JRA 등급별 색 — 목록에서 위험한 작업이 먼저 눈에 띄어야 한다 */
const JRA_TONE: Record<string, string> = {
  "A(고위험)": "bg-destructive/10 text-destructive",
  "B(중위험)": "bg-orange-500/10 text-orange-600",
  "C(저위험)": "text-muted-foreground",
};

export function JobAssessmentsPage({
  openId,
  onOpen,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
}) {
  const {
    jobAssessments,
    settings,
    loading,
    identity,
    canJobAssessment,
    createJobAssessment,
    saveJobAssessment,
    removeJobAssessment,
  } = useStore();
  const isAdmin = identity.role === "admin";
  const [draft, setDraft] = React.useState<JobAssessment | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<JobAssessment | null>(null);
  const [q, setQ] = React.useState("");
  /** 부서 구분 필터 — 다시 누르면 전체로 돌아간다 */
  const [fTeam, setFTeam] = React.useState("");
  /** 연도 구분 — 작업중지권처럼 상단 드롭다운으로 해를 고른다(기본은 전체) */
  const years = [...new Set(jobAssessments.map((v) => (v.date || "").slice(0, 4)).filter(Boolean))].sort((a, b) =>
    b.localeCompare(a),
  );
  const [fYear, setFYear] = React.useState("");
  /** 행을 클릭하면(openId) 완성본을, '수정'을 누르면(editId) 작성화면을 연다 — 서로 다른 상태다 */
  const [editId, setEditId] = React.useState<string | null>(null);

  if (draft) {
    return (
      <JobAssessmentDetail
        job={draft}
        isNew
        onDone={(saved) => {
          setDraft(null);
          if (saved) onOpen(null);
        }}
      />
    );
  }

  const editing = jobAssessments.find((v) => v.id === editId) ?? null;
  if (editId && editing) {
    return (
      <JobAssessmentDetail
        job={editing}
        onDone={(saved) => {
          setEditId(null);
          if (saved) onOpen(editing.id); // 저장하면 미리보기로 돌아가 바뀐 내용을 바로 확인한다
        }}
      />
    );
  }

  const current = jobAssessments.find((v) => v.id === openId) ?? null;
  if (openId && current) {
    return (
      <JobAssessmentPreview
        job={current}
        canEdit={canJobAssessment}
        onBack={() => onOpen(null)}
        onEdit={() => setEditId(current.id)}
      />
    );
  }

  const query = q.trim().toLowerCase();
  const sorted = [...jobAssessments]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .filter((v) => {
      if (fYear && !(v.date || "").startsWith(fYear)) return false;
      if (fTeam && v.team !== fTeam) return false;
      if (!query) return true;
      return [v.mainCategory, v.subCategory, v.detailCategory, v.content, v.evaluator].some((t) =>
        (t || "").toLowerCase().includes(query),
      );
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          작업 한 건을 시작하기 전에 그 작업의 단계별 위험을 훑고 기록합니다. 참여자는 게스트로 들어와 직접 서명할 수
          있습니다.
        </p>
        <div className="flex items-center gap-2">
          {years.length > 0 && (
            <Select className="h-9" value={fYear} onChange={(e) => setFYear(e.target.value)}>
              <option value="">연도 전체</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </Select>
          )}
          <Button
            disabled={!canJobAssessment}
            onClick={() => setDraft(createJobAssessment())}
            title={canJobAssessment ? "새 작업 위험성평가를 등록합니다" : "등록 권한이 없습니다 (설정 → 게스트 권한)"}
          >
            <Plus className="size-3.5" /> 등록
          </Button>
        </div>
      </div>

      {jobAssessments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* 부서 구분 토글 — 다시 누르면 선택이 풀리고 전체를 본다 */}
          <div className="flex flex-wrap gap-1">
            {JOB_TEAMS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFTeam((cur) => (cur === t ? "" : t))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  fTeam === t
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Input
            className="h-9 max-w-sm"
            placeholder="분류·내용·평가자 검색…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : jobAssessments.length === 0 ? (
            <EmptyState icon={<ClipboardPen className="size-6 text-muted-foreground" />}>
              {canJobAssessment ? "등록된 작업평가가 없습니다. ‘등록’으로 시작하세요." : "등록된 작업평가가 없습니다."}
            </EmptyState>
          ) : sorted.length === 0 ? (
            <EmptyState icon={<ClipboardPen className="size-6 text-muted-foreground" />}>
              조건에 맞는 작업평가가 없습니다.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="min-w-[64rem] [&_:is(th,td)]:px-4">
                <THead>
                  <TR>
                    <TH className="w-28">평가일자</TH>
                    <TH className="w-20">구분</TH>
                    <TH className="w-44">분류</TH>
                    <TH>작업내용</TH>
                    <TH className="w-28 text-center">JRA</TH>
                    <TH className="w-24">평가자</TH>
                    <TH className="w-20 text-center">항목</TH>
                    <TH className="w-24 text-center">최고위험</TH>
                    <TH className="w-24 text-center">서명</TH>
                    {/* 잠금 + 삭제 두 버튼이 들어간다 */}
                    <TH className="w-24" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((v) => {
                    const grade = jraGrade(jraScore(v));
                    const top = topRisk(v);
                    const over = overLimitCount(v, settings.risk.threshold);
                    const rows = scoredRows(v).length;
                    const signed = signedParticipants(v);
                    return (
                      <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                        <TD className="tabular-nums font-medium">{v.date || "-"}</TD>
                        <TD className="text-muted-foreground">{v.team || "-"}</TD>
                        <TD className="text-muted-foreground">
                          {[v.mainCategory, v.subCategory, v.detailCategory].filter(Boolean).join(" · ") || "-"}
                        </TD>
                        <TD className="max-w-md truncate whitespace-normal">{v.content || "-"}</TD>
                        <TD className="text-center">
                          <Badge variant="outline" className={cn("font-normal", JRA_TONE[grade])}>
                            {jraLabel(v)}
                          </Badge>
                        </TD>
                        <TD>{v.evaluator || "-"}</TD>
                        <TD className="text-center tabular-nums text-muted-foreground">{rows || "-"}</TD>
                        <TD className="text-center">
                          {top === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Badge className={riskBadgeClass(top)}>{top}</Badge>
                              {/* 허용 불가능(기준점 이상) 건수는 목록에서 바로 보여야 한다 */}
                              {over > 0 && <span className="text-xs text-destructive">{over}건</span>}
                            </span>
                          )}
                        </TD>
                        <TD className="text-center">
                          {v.participants.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 tabular-nums",
                                signed === v.participants.length ? "text-series-1" : "text-muted-foreground",
                              )}
                            >
                              <Users className="size-3.5" />
                              {signed}/{v.participants.length}
                            </span>
                          )}
                        </TD>
                        <TD className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canJobAssessment || (v.locked && !isAdmin)}
                            onClick={() => setEditId(v.id)}
                            aria-label="수정"
                            title={
                              !canJobAssessment
                                ? "수정 권한이 없습니다 (설정 → 게스트 권한)"
                                : v.locked && !isAdmin
                                  ? "관리자가 잠근 문서입니다"
                                  : "작성화면에서 고칩니다"
                            }
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!isAdmin}
                            className={v.locked ? "text-foreground" : "text-muted-foreground"}
                            onClick={() => void saveJobAssessment({ ...v, locked: !v.locked })}
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
                            disabled={!canJobAssessment || (v.locked && !isAdmin)}
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
          <DialogTitle>이 작업평가를 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.date || "-"} ·{" "}
          {[deleteTarget?.mainCategory, deleteTarget?.subCategory].filter(Boolean).join(" · ") || "-"}
          <br />
          받아 둔 서명 {deleteTarget ? signedParticipants(deleteTarget) : 0}건도 함께 사라집니다. 되돌릴 수 없습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteTarget) await removeJobAssessment(deleteTarget.id);
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
