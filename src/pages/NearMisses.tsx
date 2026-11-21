/**
 * 의견청취 › 아차사고(2026-11-21) — 근로자가 게스트로 접속해 아차사고·개선요청을 제보한다.
 * 항목: 요청일자 · 접수번호 · 요청인(소속·직급·성명·서명) · 개선요청 위치 · 개선분야(체크) · 현재상황 · 현장사진(개선 전·후).
 * 관리자는 처리 상태(접수/검토중/조치완료)를 바꾸고 삭제할 수 있다.
 */
import * as React from "react";
import { ArrowLeft, Plus, Trash2, TriangleAlert } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  EmptyState,
  Input,
  Label,
  Select,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from "@/components/ui";
import { PhotoSlot, PhotoThumb } from "@/components/photo";
import { SignatureField } from "@/components/signature";
import { deleteNearMiss, listNearMisses, putNearMiss } from "@/lib/db";
import { NEAR_MISS_FIELDS, emptyNearMiss, type NearMiss } from "@/lib/nearMiss";
import { nextDocNo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const STATUS_TONE: Record<string, string> = {
  접수: "text-muted-foreground",
  검토중: "bg-amber-500/10 text-amber-700",
  조치완료: "bg-series-1/10 text-series-1",
};

export function NearMissesPage({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { identity, canStopWork } = useStore();
  const isAdmin = identity.role === "admin";
  const [list, setList] = React.useState<NearMiss[] | null>(null);
  const [error, setError] = React.useState("");
  const [draft, setDraft] = React.useState<NearMiss | null>(null);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(() => {
    listNearMisses()
      .then((xs) => setList(xs))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  React.useEffect(load, [load]);

  const current = list?.find((v) => v.id === openId) ?? null;
  if (draft) return <NearMissForm value={draft} isNew canEdit={canStopWork} isAdmin={isAdmin} onDone={(saved) => { setDraft(null); if (saved) load(); }} />;
  if (openId && current)
    return <NearMissForm value={current} canEdit={canStopWork} isAdmin={isAdmin} onDone={(saved) => { onOpen(null); if (saved) load(); }} onDelete={async () => { await deleteNearMiss(current.id); onOpen(null); load(); }} />;

  const query = q.trim().toLowerCase();
  const rows = [...(list ?? [])]
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.no || "").localeCompare(a.no || "", "ko", { numeric: true }))
    .filter((v) => !query || [v.no, v.dept, v.name, v.location, v.situation, ...(v.fields ?? [])].some((t) => (t || "").toLowerCase().includes(query)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="접수번호·이름·위치·내용 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex-1" />
        {canStopWork && (
          <Button onClick={() => setDraft(emptyNearMiss(nextDocNo(list ?? [])))}>
            <Plus className="size-4" /> 아차사고 제보
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">불러오지 못했습니다: {error}</p>}
      <Card>
        <CardContent className="p-0">
          {list === null ? (
            <p className="p-6 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={<TriangleAlert className="size-8 text-muted-foreground" />}>
              {list.length ? "검색 결과가 없습니다." : "아직 제보된 아차사고가 없습니다. 위험했던 순간이나 개선이 필요한 곳을 알려 주세요."}
            </EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-24">접수번호</TH>
                    <TH className="w-28">요청일자</TH>
                    <TH>요청인</TH>
                    <TH>개선요청 위치</TH>
                    <TH>개선분야</TH>
                    <TH className="w-28">사진</TH>
                    <TH className="w-24">상태</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((v) => (
                    <TR key={v.id} className="cursor-pointer" onClick={() => onOpen(v.id)}>
                      <TD className="font-medium tabular-nums">{v.no}</TD>
                      <TD className="tabular-nums">{v.date}</TD>
                      <TD>
                        <div className="font-medium">{v.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{[v.dept, v.rank].filter(Boolean).join(" · ")}</div>
                      </TD>
                      <TD className="max-w-56 truncate">{v.location || "-"}</TD>
                      <TD>
                        <div className="flex flex-wrap gap-1">
                          {(v.fields ?? []).map((f) => (
                            <Badge key={f} variant="secondary" className={cn("font-normal", f === "아차사고" && "bg-destructive/10 text-destructive")}>{f}</Badge>
                          ))}
                        </div>
                      </TD>
                      <TD>
                        <div className="flex gap-1">
                          <PhotoThumb id={v.beforePhoto} />
                          <PhotoThumb id={v.afterPhoto} />
                        </div>
                      </TD>
                      <TD>
                        <Badge variant="outline" className={cn("font-normal", STATUS_TONE[v.status ?? "접수"])}>{v.status ?? "접수"}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NearMissForm({
  value,
  isNew,
  canEdit,
  isAdmin,
  onDone,
  onDelete,
}: {
  value: NearMiss;
  isNew?: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  onDone: (saved: boolean) => void;
  onDelete?: () => Promise<void>;
}) {
  const [v, setV] = React.useState<NearMiss>(value);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const set = (patch: Partial<NearMiss>) => setV((x) => ({ ...x, ...patch }));
  const disabled = !canEdit;

  const missing = [
    !v.date && "요청일자",
    !v.dept.trim() && "소속",
    !v.name.trim() && "성명",
    !v.location.trim() && "개선요청 위치",
    !v.fields.length && "개선분야",
    !v.situation.trim() && "현재상황",
  ].filter(Boolean) as string[];

  const submit = async () => {
    if (missing.length) return setErr(`다음 항목을 채워 주세요: ${missing.join(", ")}`);
    setBusy(true);
    setErr("");
    try {
      await putNearMiss({ ...v, facility: v.dept, process: v.location, updatedAt: Date.now() });
      onDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onDone(false)}>
          <ArrowLeft className="size-4" /> 목록
        </Button>
        <h2 className="text-lg font-semibold">{isNew ? "아차사고 제보" : `아차사고 제보 ${v.no}`}</h2>
        <div className="flex-1" />
        {!isNew && isAdmin && onDelete && (
          <Button variant="destructive" size="sm" onClick={async () => { if (confirm("이 제보를 삭제합니다. 되돌릴 수 없습니다.")) await onDelete(); }}>
            <Trash2 className="size-4" /> 삭제
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>요청일자 *</Label>
              <Input type="date" value={v.date} disabled={disabled} onChange={(e) => set({ date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>접수번호</Label>
              <Input value={v.no} readOnly className="bg-muted/60" title="자동으로 붙습니다" />
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">요청인</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>소속 *</Label>
                <Input value={v.dept} disabled={disabled} placeholder="예: (주)한빛 / 운영팀" onChange={(e) => set({ dept: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>직급</Label>
                <Input value={v.rank} disabled={disabled} placeholder="예: 반장" onChange={(e) => set({ rank: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>성명 *</Label>
                <Input value={v.name} disabled={disabled} placeholder="이름" onChange={(e) => set({ name: e.target.value })} />
              </div>
            </div>
            <SignatureField label="요청인 서명" signId={v.sign} disabled={disabled} onChange={(id) => set({ sign: id })} />
          </section>

          <div className="grid gap-1.5">
            <Label>개선요청 위치 *</Label>
            <Input value={v.location} disabled={disabled} placeholder="예: 2공장 펌프실 계단 입구" onChange={(e) => set({ location: e.target.value })} />
          </div>

          <div className="grid gap-1.5">
            <Label>개선분야 * <span className="font-normal text-muted-foreground">(여러 개 선택 가능)</span></Label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {NEAR_MISS_FIELDS.map((f) => (
                <label key={f} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={v.fields.includes(f)}
                    disabled={disabled}
                    onChange={(e) => set({ fields: e.target.checked ? NEAR_MISS_FIELDS.filter((x) => x === f || v.fields.includes(x)) : v.fields.filter((x) => x !== f) })}
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>현재상황 *</Label>
            <Textarea rows={5} value={v.situation} disabled={disabled} placeholder="어떤 위험이 있었는지, 무엇을 개선해야 하는지 적어 주세요." onChange={(e) => set({ situation: e.target.value })} />
          </div>

          <div className="grid gap-1.5">
            <Label>현장사진</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <PhotoSlot label="개선 전" photoId={v.beforePhoto} disabled={disabled} onChange={(id) => set({ beforePhoto: id })} />
              <PhotoSlot label="개선 후" photoId={v.afterPhoto} disabled={disabled} onChange={(id) => set({ afterPhoto: id })} />
            </div>
          </div>

          {isAdmin && !isNew && (
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label>처리 상태</Label>
              <Select value={v.status ?? "접수"} onChange={(e) => set({ status: e.target.value as NearMiss["status"] })}>
                <option value="접수">접수</option>
                <option value="검토중">검토중</option>
                <option value="조치완료">조치완료</option>
              </Select>
            </div>
          )}

          {err && <p className="text-sm text-destructive">{err}</p>}
          {canEdit && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onDone(false)}>취소</Button>
              <Button disabled={busy} onClick={() => void submit()}>{isNew ? "제보하기" : "저장"}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
