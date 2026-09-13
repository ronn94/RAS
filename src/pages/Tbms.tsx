/**
 * 상시평가 — 'TBM' 서브탭.
 *
 * 작업평가 목록과 같은 얼개다: 연도 드롭다운 + 부서 토글로 거르고, 행을 누르면
 * 완성본 미리보기가 열리며, 고칠 때만 '수정'으로 작성화면에 들어간다.
 * TBM은 하루에도 여러 건 나올 수 있어 발행 수를 제한하지 않는다.
 */
import * as React from "react";
import { ClipboardList, Lock, LockOpen, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { TbmDetail } from "@/pages/TbmDetail";
import { TbmPreview } from "@/pages/TbmPreview";
import { JOB_TEAMS } from "@/lib/jobAssessment";
import { signedTbmParticipants, tbmFullySigned, tbmWorkLine, type Tbm } from "@/lib/routine";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

export function TbmsPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { routines, loading, identity, canRoutine, createTbm, saveRoutine, removeRoutine } = useStore();
  const isAdmin = identity.role === "admin";
  const [draft, setDraft] = React.useState<Tbm | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Tbm | null>(null);
  const [q, setQ] = React.useState("");
  const [fTeam, setFTeam] = React.useState("");
  const [fYear, setFYear] = React.useState("");
  /** 행을 누르면(openId) 완성본을, '수정'을 누르면(editId) 작성화면을 연다 */
  const [editId, setEditId] = React.useState<string | null>(null);

  const tbms = React.useMemo(() => routines.filter((v) => v.kind === "tbm"), [routines]);
  const years = [...new Set(tbms.map((v) => (v.date || "").slice(0, 4)).filter(Boolean))].sort((a, b) =>
    b.localeCompare(a),
  );

  if (draft) {
    return (
      <TbmDetail
        tbm={draft}
        isNew
        onDone={(saved) => {
          setDraft(null);
          if (saved) onOpen(null);
        }}
      />
    );
  }

  const editing = tbms.find((v) => v.id === editId) ?? null;
  if (editId && editing) {
    return (
      <TbmDetail
        tbm={editing}
        onDone={(saved) => {
          setEditId(null);
          if (saved) onOpen(editing.id); // 저장하면 미리보기로 돌아가 바뀐 내용을 바로 확인한다
        }}
      />
    );
  }

  const current = tbms.find((v) => v.id === openId) ?? null;
  if (openId && current) {
    return (
      <TbmPreview
        tbm={current}
        canEdit={canRoutine}
        onBack={() => onOpen(null)}
        onEdit={() => setEditId(current.id)}
      />
    );
  }

  const query = q.trim().toLowerCase();
  const sorted = [...tbms]
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .filter((v) => {
      if (fYear && !(v.date || "").startsWith(fYear)) return false;
      if (fTeam && v.team !== fTeam) return false;
      if (!query) return true;
      return [v.location, v.otherLocation, tbmWorkLine(v), v.leaderName].some((t) =>
        (t || "").toLowerCase().includes(query),
      );
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          작업 직전에 그날의 위험요인과 안전대책을 짚고 참석자 서명을 받습니다. 참석자는 게스트로 들어와 직접 서명할 수
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
            size="icon"
            aria-label="등록"
            disabled={!canRoutine}
            onClick={() => setDraft(createTbm())}
            title={canRoutine ? "새 TBM을 등록합니다" : "등록 권한이 없습니다 (설정 → 게스트 권한)"}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      {tbms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
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
            placeholder="장소·작업내용·리더 검색…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <EmptyState>불러오는 중…</EmptyState>
          ) : tbms.length === 0 ? (
            <EmptyState icon={<ClipboardList className="size-6 text-muted-foreground" />}>
              {canRoutine ? "등록된 TBM이 없습니다. ‘+’로 시작하세요." : "등록된 TBM이 없습니다."}
            </EmptyState>
          ) : sorted.length === 0 ? (
            <EmptyState icon={<ClipboardList className="size-6 text-muted-foreground" />}>
              조건에 맞는 TBM이 없습니다.
            </EmptyState>
          ) : (
            <TableWrap>
              <Table className="min-w-[40rem] [&_:is(th,td)]:px-2">
                <THead>
                  <TR>
                    <TH className="w-24">일자</TH>
                    <TH className="w-14">시각</TH>
                    <TH className="w-16">구분</TH>
                    <TH className="w-28">장소</TH>
                    <TH className="min-w-48 sm:min-w-0">작업내용</TH>
                    <TH className="w-20">리더</TH>
                    <TH className="w-20 text-center">서명</TH>
                    <TH className="w-16 text-center">상태</TH>
                    {/* 수정 · 잠금 · 삭제 */}
                    <TH className="w-20" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((v) => {
                    const signed = signedTbmParticipants(v);
                    const done = tbmFullySigned(v);
                    return (
                      <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                        <TD className="tabular-nums font-medium">{v.date || "-"}</TD>
                        <TD className="tabular-nums text-muted-foreground">{v.time || "-"}</TD>
                        <TD className="text-muted-foreground">{v.team || "-"}</TD>
                        <TD className="text-muted-foreground">
                          {v.location === "기타" ? v.otherLocation || "기타" : v.location || "-"}
                        </TD>
                        <TD>{tbmWorkLine(v) || "-"}</TD>
                        <TD>{v.leaderName || "-"}</TD>
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
                        <TD className="text-center">
                          {done ? (
                            <Badge className="bg-series-1/10 font-normal text-series-1">완료</Badge>
                          ) : (
                            <Badge variant="outline" className="font-normal text-muted-foreground">
                              진행
                            </Badge>
                          )}
                        </TD>
                        <TD className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canRoutine || (v.locked && !isAdmin)}
                            onClick={() => setEditId(v.id)}
                            aria-label="수정"
                            title={
                              !canRoutine
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
                            onClick={() => void saveRoutine({ ...v, locked: !v.locked })}
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
                            disabled={!canRoutine || (v.locked && !isAdmin)}
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
          <DialogTitle>이 TBM을 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget?.date || "-"} {deleteTarget?.time} · {deleteTarget ? tbmWorkLine(deleteTarget) || "-" : "-"}
          <br />
          받아 둔 서명 {deleteTarget ? signedTbmParticipants(deleteTarget) : 0}건도 함께 사라집니다. 되돌릴 수 없습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteTarget) await removeRoutine(deleteTarget.id);
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
