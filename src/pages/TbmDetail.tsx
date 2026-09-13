/**
 * TBM 작성 화면 — 등록·수정을 함께 맡는다.
 *
 * 작업평가처럼 여러 단계로 나누지 않고 **한 화면에 쭉** 둔다. TBM은 작업 직전에
 * 현장에서 몇 분 안에 적는 서류라, 단계를 오가는 것보다 위에서 아래로 훑는 편이 빠르다.
 *
 * 필수 규칙은 원본 프로그램과 같다 — **고른 위험요인마다 안전대책을 하나 이상** 골라야
 * 등록된다. 위험요인만 찍고 대책을 비워 두면 회의록으로서 의미가 없기 때문이다.
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
  Select,
  Textarea,
} from "@/components/ui";
import { TbmSheet } from "@/print/TbmSheet";
import {
  TBM_PMIS_GROUPS,
  TBM_WORK_TYPES,
  emptyTbmParticipant,
  everyRiskHasMeasure,
  measureValue,
  type Tbm,
  type TbmParticipant,
} from "@/lib/routine";
import { JOB_TEAMS } from "@/lib/jobAssessment";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

export function TbmDetail({
  tbm,
  isNew,
  onDone,
}: {
  tbm: Tbm;
  isNew?: boolean;
  onDone: (saved: boolean) => void;
}) {
  const { settings, saveRoutine, identity, canRoutine, jobAssessments } = useStore();
  const [draft, setDraft] = React.useState<Tbm>(tbm);
  const [saving, setSaving] = React.useState(false);

  const isAdmin = identity.role === "admin";
  const readOnly = !!draft.locked && !isAdmin;
  const canWrite = canRoutine && !readOnly;
  const risks = settings.tbmRisks;

  const patch = (p: Partial<Tbm>) => setDraft((d) => ({ ...d, ...p }));

  const missing = [
    !draft.date && "TBM 일자",
    !draft.team && "구분",
    !draft.location && "장소",
    !draft.workDescription.trim() && "작업내용",
    !draft.leaderName && "TBM 리더",
    draft.risks.length === 0 && "위험요인",
    draft.risks.length > 0 && !everyRiskHasMeasure(draft) && "안전대책(고른 위험요인마다 1개 이상)",
  ].filter(Boolean) as string[];

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

  /** 위험요인을 끄면 거기 딸린 안전대책도 같이 지운다 — 남겨 두면 인쇄물에 유령 항목이 남는다 */
  const toggleRisk = (key: string) =>
    setDraft((d) =>
      d.risks.includes(key)
        ? { ...d, risks: d.risks.filter((x) => x !== key), measures: d.measures.filter((m) => !m.startsWith(`${key}:`)) }
        : { ...d, risks: [...d.risks, key] },
    );

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  /* ── 참석자 ────────────────────────────────────────────── */
  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));
  const internalNames = new Set(draft.participants.filter((p) => !p.external).map((p) => p.name.trim()));

  const toggleStaff = (name: string) =>
    setDraft((d) => {
      const found = d.participants.find((p) => !p.external && p.name.trim() === name);
      if (!found) return { ...d, participants: [...d.participants, emptyTbmParticipant(false, name)] };
      if (found.sign && !confirm(`${name} 님은 이미 서명했습니다. 명단에서 빼면 서명도 지워집니다. 계속할까요?`)) {
        return d;
      }
      return { ...d, participants: d.participants.filter((p) => p.id !== found.id) };
    });

  const selectAllStaff = () =>
    setDraft((d) => {
      const already = new Set(d.participants.filter((p) => !p.external).map((p) => p.name.trim()));
      const added = staff.filter((n) => !already.has(n) && n !== d.leaderName).map((n) => emptyTbmParticipant(false, n));
      return added.length ? { ...d, participants: [...d.participants, ...added] } : d;
    });

  const deselectAllStaff = () =>
    setDraft((d) => {
      const internals = d.participants.filter((p) => !p.external && staff.includes(p.name.trim()));
      const signed = internals.filter((p) => p.sign).length;
      if (signed > 0 && !confirm(`이미 서명한 참석자 ${signed}명도 함께 빠집니다. 계속할까요?`)) return d;
      const ids = new Set(internals.map((p) => p.id));
      return { ...d, participants: d.participants.filter((p) => !ids.has(p.id)) };
    });

  const patchParticipant = (id: string, p: Partial<TbmParticipant>) =>
    setDraft((d) => ({ ...d, participants: d.participants.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  /** 그날 등록된 작업평가 — 이으면 작업내용·위험분류를 참고할 수 있다 */
  const sameDayJobs = jobAssessments.filter((j) => j.date === draft.date);
  const linked = jobAssessments.find((j) => j.id === draft.jobAssessmentId) ?? null;

  /** 작업평가를 이으면 작업내용을 끌어온다 — 이미 적은 내용이 있으면 건드리지 않는다 */
  const linkJob = (id: string) => {
    const job = jobAssessments.find((j) => j.id === id) ?? null;
    setDraft((d) => ({
      ...d,
      jobAssessmentId: id || null,
      workDescription: d.workDescription.trim() || job?.content || "",
      team: d.team || job?.team || "",
    }));
  };

  const external = draft.participants.filter((p) => p.external);
  const internal = draft.participants.filter((p) => !p.external);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => onDone(false)} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">{isNew ? "새 TBM" : "TBM"}</div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {draft.date || "일자 미입력"} {draft.time}
              {draft.team && (
                <Badge variant="outline" className="font-normal">
                  {draft.team}
                </Badge>
              )}
              {draft.participants.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  참석 {draft.participants.length}명
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
            aria-label="TBM 인쇄"
            title={isNew ? "등록한 뒤에 인쇄할 수 있습니다" : "TBM 회의록 인쇄 (A4 세로)"}
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

      {!canRoutine && (
        <div className="no-print rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          관리자가 게스트의 상시평가 권한을 껐습니다(설정 → 게스트 권한). 내용은 볼 수 있지만 고치거나 서명할 수
          없습니다.
        </div>
      )}

      <div className="no-print space-y-4">
        {/* 개요 */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>TBM 개요</CardTitle>
            <CardDescription>언제·어디서·무슨 작업을 하는지 적습니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>TBM 일자</Label>
              <Input
                type="date"
                disabled={!canWrite}
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>시각</Label>
              <Input
                type="time"
                disabled={!canWrite}
                value={draft.time}
                onChange={(e) => patch({ time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>구분</Label>
              <Select
                className="w-full"
                disabled={!canWrite}
                value={draft.team}
                onChange={(e) => patch({ team: e.target.value })}
              >
                <option value="">선택</option>
                {JOB_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>작업날짜와 동일</Label>
              <div className="flex gap-1">
                {[true, false].map((yes) => (
                  <Button
                    key={String(yes)}
                    variant={draft.sameWorkDate === yes ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    disabled={!canWrite}
                    onClick={() => patch({ sameWorkDate: yes })}
                  >
                    {yes ? "예" : "아니오"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>TBM 장소</Label>
              <Select
                className="w-full"
                disabled={!canWrite}
                value={draft.location}
                onChange={(e) => patch({ location: e.target.value })}
              >
                <option value="">선택</option>
                {settings.processes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {/* 공정명 목록에 이미 '기타'가 있으면 또 넣지 않는다 */}
                {!settings.processes.includes("기타") && <option value="기타">기타</option>}
              </Select>
            </div>
            {draft.location === "기타" && (
              <div className="space-y-1.5">
                <Label>장소 직접 입력</Label>
                <Input
                  disabled={!canWrite}
                  value={draft.otherLocation}
                  onChange={(e) => patch({ otherLocation: e.target.value })}
                  placeholder="예: 정문 앞 야적장"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>위험성평가 및 교육실시</Label>
              <div className="flex gap-1">
                {[true, false].map((yes) => (
                  <Button
                    key={String(yes)}
                    variant={draft.riskAssessmentDone === yes ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    disabled={!canWrite}
                    onClick={() => patch({ riskAssessmentDone: yes })}
                  >
                    {yes ? "예" : "아니오"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>작업평가 연결 (선택)</Label>
              <Select
                className="w-full"
                disabled={!canWrite}
                value={draft.jobAssessmentId ?? ""}
                onChange={(e) => linkJob(e.target.value)}
              >
                <option value="">연결 안 함</option>
                {sameDayJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {[j.mainCategory, j.subCategory].filter(Boolean).join(" · ")} — {j.content || "내용 없음"}
                  </option>
                ))}
              </Select>
              {draft.jobAssessmentId && !linked && (
                <p className="text-xs text-muted-foreground">연결한 작업평가가 삭제되었거나 다른 날짜입니다.</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-4">
              <Label>작업유형</Label>
              <div className="flex flex-wrap gap-1.5">
                {TBM_WORK_TYPES.map((t) => (
                  <Button
                    key={t}
                    variant={draft.workTypes.includes(t) ? "default" : "outline"}
                    size="sm"
                    disabled={!canWrite}
                    onClick={() => patch({ workTypes: toggleIn(draft.workTypes, t) })}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-4">
              <Label>작업내용</Label>
              <Textarea
                rows={2}
                disabled={!canWrite}
                value={draft.workDescription}
                onChange={(e) => patch({ workDescription: e.target.value })}
                placeholder="오늘 할 작업을 적습니다"
              />
            </div>
          </CardContent>
        </Card>

        {/* 위험요인·안전대책 */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>위험요인과 안전대책</CardTitle>
            <CardDescription>
              위험요인을 고르면 그 아래에 대책 후보가 펼쳐집니다. 고른 위험요인마다 대책을 하나 이상 골라야 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {risks.map((r) => (
                <Button
                  key={r.key}
                  variant={draft.risks.includes(r.key) ? "default" : "outline"}
                  size="sm"
                  disabled={!canWrite}
                  onClick={() => toggleRisk(r.key)}
                >
                  {r.label}
                </Button>
              ))}
            </div>

            {draft.risks.length === 0 ? (
              <p className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                위험요인을 고르면 관련 안전대책이 표시됩니다.
              </p>
            ) : (
              <div className="space-y-3">
                {risks
                  .filter((r) => draft.risks.includes(r.key))
                  .map((r) => {
                    const picked = draft.measures.some((m) => m.startsWith(`${r.key}:`));
                    return (
                      <div key={r.key} className="rounded-xl bg-muted/40 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-medium">{r.label}</span>
                          {!picked && (
                            <Badge variant="outline" className="font-normal text-destructive">
                              대책 필요
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {r.measures.map((m, i) => {
                            const value = measureValue(r.key, i);
                            return (
                              <Button
                                key={value}
                                variant={draft.measures.includes(value) ? "default" : "outline"}
                                size="sm"
                                disabled={!canWrite}
                                onClick={() => patch({ measures: toggleIn(draft.measures, value) })}
                              >
                                {m}
                              </Button>
                            );
                          })}
                          {r.measures.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              이 위험요인에는 대책 후보가 없습니다(설정 → TBM 위험요인에서 추가하세요).
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PMIS */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>작업자 PMIS Check</CardTitle>
            <CardDescription>문제가 있는 항목만 바꿉니다(기본값은 이상 없음).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TBM_PMIS_GROUPS.map((g) => (
              <div key={g.title} className="space-y-2">
                <Label>
                  {g.title} ({g.korean})
                </Label>
                {g.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="flex gap-1">
                      {[item.first, item.second].map((choice) => (
                        <Button
                          key={choice}
                          variant={draft.pmis[item.key] === choice ? "default" : "outline"}
                          size="sm"
                          disabled={!canWrite}
                          onClick={() => patch({ pmis: { ...draft.pmis, [item.key]: choice } })}
                        >
                          {choice}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 리더·참석자 */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>TBM 리더와 참석자</CardTitle>
            <CardDescription>
              손 서명은 등록한 뒤 미리보기 화면의 &lsquo;서명하기&rsquo;에서 받습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 sm:max-w-xs">
              <Label>TBM 리더</Label>
              <Select
                className="w-full"
                disabled={!canWrite}
                value={draft.leaderName}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    leaderName: e.target.value,
                    // 리더는 참석자 명단에서 뺀다 — 인쇄물에서 서명 자리가 따로 있다
                    participants: d.participants.filter((p) => p.name !== e.target.value),
                  }))
                }
              >
                <option value="">직원 명단에서 고르세요</option>
                {staff.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>

            {canWrite &&
              (staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  설정 → 직원 명단이 비어 있습니다. 먼저 직원을 등록하면 여기서 체크할 수 있습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>참석자 (우리 직원)</Label>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={selectAllStaff}>
                        전체 선택
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllStaff}>
                        전체 해제
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6">
                    {staff.map((name) => {
                      const isLeader = name === draft.leaderName;
                      return (
                        <label
                          key={name}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm",
                            isLeader ? "opacity-50" : "cursor-pointer hover:bg-muted",
                          )}
                          title={isLeader ? "TBM 리더로 따로 서명합니다" : undefined}
                        >
                          <Checkbox
                            checked={internalNames.has(name)}
                            disabled={isLeader}
                            onChange={() => toggleStaff(name)}
                          />
                          <span className="truncate">{name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* 외부업체 참석자 */}
            <div className="space-y-2">
              <Label>외부업체 참석자</Label>
              {external.length === 0 && (
                <p className="text-sm text-muted-foreground">용역업체 직원이 참석하면 아래에서 추가합니다.</p>
              )}
              {external.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-6 text-center text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                  <Input
                    className="max-w-xs"
                    disabled={!canWrite}
                    value={p.name}
                    onChange={(e) => patchParticipant(p.id, { name: e.target.value })}
                    placeholder="성명"
                  />
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label="참석자 삭제"
                      onClick={() => {
                        if (p.sign && !confirm("이미 받은 서명도 함께 지워집니다. 계속할까요?")) return;
                        setDraft((d) => ({ ...d, participants: d.participants.filter((x) => x.id !== p.id) }));
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((d) => ({ ...d, participants: [...d.participants, emptyTbmParticipant(true)] }))
                  }
                >
                  <Plus className="size-3.5" /> 외부업체 참석자 추가
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              현재 참석자 {internal.length + external.length}명 (내부 {internal.length} · 외부 {external.length})
            </p>

            <div className="space-y-1.5 sm:max-w-md">
              <Label>퇴거조치자</Label>
              <Input
                disabled={!canWrite}
                value={draft.removalPerson}
                onChange={(e) => patch({ removalPerson: e.target.value })}
                placeholder="PMIS 불가·안전조치 미이행으로 퇴거시킨 사람 (없으면 비워 둡니다)"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <TbmSheet tbm={draft} />
    </div>
  );
}
