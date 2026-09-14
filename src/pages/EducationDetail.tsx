/**
 * 일일교육(안전보건교육일지) 작성 화면 — 등록·수정을 함께 맡는다.
 *
 * TBM과 같이 **한 화면에 쭉** 둔다. 아침조회 직후 몇 분 안에 적는 서류라 단계를
 * 오가는 것보다 위에서 아래로 훑는 편이 빠르다.
 *
 * 교육내용은 설정(일일교육 교육내용)의 기본 목록으로 채워진 채 열리고, 그날 필요한
 * 만큼 줄을 더하거나 빼거나 고친다 — 매일 같은 내용을 다시 적지 않게 하되, 그날만
 * 다른 내용을 넣는 것도 막지 않기 위해서다.
 */
import * as React from "react";
import { ArrowLeft, Plus, Printer, Trash2, TriangleAlert } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { EducationSheet } from "@/print/EducationSheet";
import {
  EDUCATION_MATERIALS,
  educationCounts,
  educationMinutes,
  educationMissing,
  emptyEducationAttendee,
  type Education,
} from "@/lib/routine";
import { supervisorNames } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

export function EducationDetail({
  education,
  isNew,
  onDone,
}: {
  education: Education;
  isNew?: boolean;
  onDone: (saved: boolean) => void;
}) {
  const { settings, saveRoutine, identity, canRoutine } = useStore();
  const [draft, setDraft] = React.useState<Education>(education);
  const [saving, setSaving] = React.useState(false);

  const isAdmin = identity.role === "admin";
  const readOnly = !!draft.locked && !isAdmin;
  const canWrite = canRoutine && !readOnly;

  const patch = (p: Partial<Education>) => setDraft((d) => ({ ...d, ...p }));

  // 등록 가능 기준은 화면과 저장이 어긋나지 않게 한 곳(routine.ts)에서 판단한다
  const missing = educationMissing(draft);
  const minutes = educationMinutes(draft);
  const counts = educationCounts(draft, settings.staff.length);

  const submit = async () => {
    if (missing.length) return;
    setSaving(true);
    try {
      await saveRoutine(draft);
      onDone(true);
    } finally {
      setSaving(false);
    }
  };

  /* ── 교육내용 ──────────────────────────────────────────── */
  const patchTopic = (i: number, p: Partial<{ text: string; note: string }>) =>
    setDraft((d) => ({ ...d, topics: d.topics.map((t, x) => (x === i ? { ...t, ...p } : t)) }));

  const addTopic = () => setDraft((d) => ({ ...d, topics: [...d.topics, { text: "", note: "" }] }));
  const removeTopic = (i: number) => setDraft((d) => ({ ...d, topics: d.topics.filter((_, x) => x !== i) }));

  /** 설정 기본 목록으로 되돌린다 — 그날 이것저것 고치다 엉켰을 때 쓰는 자리다 */
  const resetTopics = () => {
    if (!confirm("설정의 기본 교육내용으로 되돌립니다. 지금 적은 내용은 사라집니다.")) return;
    setDraft((d) => ({ ...d, topics: settings.educationTopics.map((t) => ({ ...t })) }));
  };

  const toggleMaterial = (m: string) =>
    setDraft((d) => ({
      ...d,
      materials: d.materials.includes(m) ? d.materials.filter((x) => x !== m) : [...d.materials, m],
    }));

  /* ── 참석자 ────────────────────────────────────────────── */
  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));
  const supervisors = supervisorNames(settings);
  const picked = new Set(draft.attendees.map((a) => a.name.trim()));

  const toggleStaff = (name: string) =>
    setDraft((d) => {
      const found = d.attendees.find((a) => a.name.trim() === name);
      if (!found) return { ...d, attendees: [...d.attendees, emptyEducationAttendee(name, settings.org.dept)] };
      if (found.sign && !confirm(`${name} 님은 이미 서명했습니다. 명단에서 빼면 서명도 지워집니다. 계속할까요?`)) {
        return d;
      }
      return { ...d, attendees: d.attendees.filter((a) => a.id !== found.id) };
    });

  const selectAllStaff = () =>
    setDraft((d) => {
      const already = new Set(d.attendees.map((a) => a.name.trim()));
      const added = staff
        .filter((n) => !already.has(n))
        .map((n) => emptyEducationAttendee(n, settings.org.dept));
      return added.length ? { ...d, attendees: [...d.attendees, ...added] } : d;
    });

  const deselectAllStaff = () =>
    setDraft((d) => {
      const signed = d.attendees.filter((a) => a.sign).length;
      if (signed > 0 && !confirm(`이미 서명한 참석자 ${signed}명도 함께 빠집니다. 계속할까요?`)) return d;
      return { ...d, attendees: [] };
    });

  /** 숫자 칸 — 비우면 자동 계산(null)으로 돌아간다 */
  const countInput = (value: number | null, auto: number, onChange: (v: number | null) => void) => (
    <Input
      className="h-8 w-24 text-center"
      type="number"
      min={0}
      disabled={!canWrite}
      value={value ?? ""}
      placeholder={String(auto)}
      onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
    />
  );

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => onDone(false)} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">{isNew ? "새 교육일지" : "교육일지"}</div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {draft.date || "일자 미입력"} {draft.startTime}~{draft.endTime}
              {minutes > 0 && (
                <Badge variant="outline" className="font-normal">
                  {minutes}분
                </Badge>
              )}
              {draft.attendees.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  참석 {draft.attendees.length}명
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            disabled={isNew}
            onClick={() => window.print()}
            aria-label="교육일지 인쇄"
            title={isNew ? "등록한 뒤에 인쇄할 수 있습니다" : "안전보건교육일지 인쇄 (A4 세로)"}
          >
            <Printer />
          </Button>
          {canWrite && (
            <Button disabled={saving || missing.length > 0} onClick={() => void submit()}>
              {saving ? "저장 중…" : isNew ? "등록" : "저장"}
            </Button>
          )}
        </div>
      </div>

      {missing.length > 0 && canWrite && (
        <p className="no-print text-sm text-muted-foreground">
          <TriangleAlert className="mr-1 inline size-3.5" />
          {missing.join(" · ")}을(를) 채워야 {isNew ? "등록" : "저장"}할 수 있습니다.
        </p>
      )}

      {readOnly && (
        <div className="no-print rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          잠긴 문서입니다 — 서명 접수가 끝나면 저절로 잠깁니다. 내용은 볼 수 있지만 고칠 수 없습니다.
        </div>
      )}

      <div className="no-print space-y-4">
        {/* 교육 개요 */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>교육 개요</CardTitle>
            <CardDescription>언제·무슨 교육을 했는지 적습니다. 서식 기본값이 채워져 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>교육제목</Label>
              <Input
                className="mt-1"
                disabled={!canWrite}
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </div>
            <div>
              <Label>교육구분</Label>
              <Input
                className="mt-1"
                disabled={!canWrite}
                value={draft.category}
                onChange={(e) => patch({ category: e.target.value })}
              />
            </div>
            <div>
              <Label>교육목표</Label>
              <Input
                className="mt-1"
                disabled={!canWrite}
                value={draft.goal}
                onChange={(e) => patch({ goal: e.target.value })}
              />
            </div>
            <div>
              <Label>교육일자</Label>
              <Input
                className="mt-1"
                type="date"
                disabled={!canWrite}
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div>
              <Label>시작 시각</Label>
              <Input
                className="mt-1"
                type="time"
                disabled={!canWrite}
                value={draft.startTime}
                onChange={(e) => patch({ startTime: e.target.value })}
              />
            </div>
            <div>
              <Label>끝나는 시각</Label>
              <Input
                className="mt-1"
                type="time"
                disabled={!canWrite}
                value={draft.endTime}
                onChange={(e) => patch({ endTime: e.target.value })}
              />
            </div>
            <div>
              <Label>교육 소요 시간</Label>
              <p className="mt-1 flex h-9 items-center text-sm text-muted-foreground">
                {minutes > 0 ? `${minutes}분 (자동 계산)` : "시각을 확인하세요"}
              </p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Label>교육자료</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {EDUCATION_MATERIALS.map((m) => (
                  <Button
                    key={m}
                    variant={draft.materials.includes(m) ? "default" : "outline"}
                    size="sm"
                    disabled={!canWrite}
                    onClick={() => toggleMaterial(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 교육내용 */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>교육내용</CardTitle>
            <CardDescription>
              설정 → 일일교육 교육내용의 기본 목록입니다. 그날 필요한 만큼 고치거나 줄을 더할 수 있습니다. 근거 조항을
              적으면 인쇄물에 빨간 글씨로 덧붙습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {draft.topics.length === 0 ? (
              <p className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                교육내용이 비어 있습니다. &lsquo;줄 추가&rsquo;로 적어 주세요.
              </p>
            ) : (
              draft.topics.map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-4 shrink-0 text-center text-sm text-muted-foreground">•</span>
                  <div className="grid flex-1 gap-1.5 sm:grid-cols-[1fr_16rem]">
                    <Input
                      disabled={!canWrite}
                      value={t.text}
                      placeholder="교육내용"
                      onChange={(e) => patchTopic(i, { text: e.target.value })}
                    />
                    <Input
                      disabled={!canWrite}
                      value={t.note}
                      placeholder="근거 조항 (선택)"
                      onChange={(e) => patchTopic(i, { note: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canWrite}
                    className="mt-1 text-destructive hover:text-destructive"
                    onClick={() => removeTopic(i)}
                    aria-label="줄 삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" disabled={!canWrite} onClick={addTopic}>
                <Plus className="size-3.5" /> 줄 추가
              </Button>
              <Button variant="outline" size="sm" disabled={!canWrite} onClick={resetTopics}>
                설정 기본값으로 되돌리기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 실시자 · 교육인원 */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>실시자와 교육인원</CardTitle>
            <CardDescription>
              교육인원은 직원 명단과 아래 참석자 수로 자동 계산됩니다. 칸에 직접 적으면 그 값이 우선합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>직명</Label>
                <Input
                  className="mt-1"
                  disabled={!canWrite}
                  value={draft.instructorRole}
                  placeholder="예: 안전관리자"
                  onChange={(e) => patch({ instructorRole: e.target.value })}
                />
              </div>
              <div>
                <Label>교육실시자</Label>
                <Input
                  className="mt-1"
                  list="ras-supervisors"
                  disabled={!canWrite}
                  value={draft.instructorName}
                  placeholder="성명"
                  onChange={(e) => patch({ instructorName: e.target.value })}
                />
                <datalist id="ras-supervisors">
                  {supervisors.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>교육실시 장소</Label>
                <Input
                  className="mt-1"
                  disabled={!canWrite}
                  value={draft.place}
                  placeholder="예: 관리동 회의실"
                  onChange={(e) => patch({ place: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label>교육대상자수</Label>
                <div className="mt-1">{countInput(draft.targetCount, counts.target, (v) => patch({ targetCount: v }))}</div>
              </div>
              <div>
                <Label>교육실시자수</Label>
                <div className="mt-1">{countInput(draft.doneCount, counts.done, (v) => patch({ doneCount: v }))}</div>
              </div>
              <div>
                <Label>교육미실시자수</Label>
                <div className="mt-1">{countInput(draft.undoneCount, counts.undone, (v) => patch({ undoneCount: v }))}</div>
              </div>
              <div className="min-w-48 flex-1">
                <Label>비고</Label>
                <Input
                  className="mt-1"
                  disabled={!canWrite}
                  value={draft.countNote}
                  placeholder="예: 휴가 2명"
                  onChange={(e) => patch({ countNote: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>특이사항</Label>
              <Textarea
                className="mt-1"
                rows={2}
                disabled={!canWrite}
                value={draft.remark}
                onChange={(e) => patch({ remark: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 참석자 */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>참석자 명단</CardTitle>
            <CardDescription>
              체크한 사람이 명단에 오릅니다. 손 서명은 등록한 뒤 미리보기 화면의 ‘서명하기’에서 받습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                설정 → 직원 명단이 비어 있습니다. 먼저 직원을 등록하면 여기서 체크할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    참석자 ({draft.attendees.length}/{staff.length}명)
                  </Label>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={!canWrite} onClick={selectAllStaff}>
                      전체 선택
                    </Button>
                    <Button variant="outline" size="sm" disabled={!canWrite} onClick={deselectAllStaff}>
                      전체 해제
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6">
                  {staff.map((name) => (
                    <label
                      key={name}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm",
                        canWrite ? "cursor-pointer hover:bg-muted" : "opacity-60",
                      )}
                    >
                      <Checkbox checked={picked.has(name)} disabled={!canWrite} onChange={() => toggleStaff(name)} />
                      <span className="truncate">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 인쇄용 — 화면에는 안 보이고 인쇄할 때만 나온다 */}
      <EducationSheet education={draft} />
    </div>
  );
}
