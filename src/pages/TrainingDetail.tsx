/**
 * 실시서·공람표 상세 — 원본 서식 세 종류를 한 화면에서 다룬다.
 * 들어가는 칸이 서식마다 달라 kind로 갈라 그린다:
 * - 사전 교육·회의 / 결과 교육: 회의내용·비고·사진 장수만 다르고 나머지는 같다
 * - 공람표: 결재란·사진·교육내용이 아예 없고, 대신 평가 구분·평가기간·대상시설이 붙는다.
 *   명단에도 소속 칸이 없다(원본 서식 그대로 순번·성명·서명 셋뿐).
 *
 * 다른 서식과 같은 규칙:
 * - 새 문서는 **등록을 눌러야** 서버에 남는다(자동 저장 안 함). 이미 등록된 건은 '저장'.
 * - 잠금(관리자만)이 걸리면 게스트는 읽기 전용 — 진짜 방어선은 워커다.
 *
 * 서명만은 예외다. 본문 저장과 **완전히 따로** 즉시 서버에 남긴다(전용 경로):
 * 교육장에서 직원이 한 명씩 서명하는 동안 관리자가 본문을 고치고 있을 수 있어서,
 * 서명을 본문 저장에 실어 보내면 서로의 내용을 덮어쓴다.
 */
import * as React from "react";
import { ArrowLeft, Eraser, ListChecks, ListX, Lock, PenLine, Plus, Printer, Trash2, TriangleAlert } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableWrap,
  Textarea,
} from "@/components/ui";
import { PhotoSlot, usePhotoUrl } from "@/components/photo";
import { SignatureCanvas, signatureDataUrl } from "@/components/signature";
import { TrainingSheet } from "@/print/TrainingSheet";
import {
  ASSESS_KINDS,
  CIRCULAR_NOTICE,
  emptyTrainingAttendee,
  isCircular,
  signedCount,
  TRAINING_PHOTO_LABELS,
  trainingMinutes,
  type AssessKind,
  type Training,
  type TrainingAttendee,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

export function TrainingDetail({
  training,
  isNew,
  onDone,
}: {
  training: Training;
  isNew?: boolean;
  onDone: (saved: boolean) => void;
}) {
  const { saveTraining, signTraining, settings, identity, canEdit, canUploadPhoto } = useStore();
  const [draft, setDraft] = React.useState<Training>(training);
  const [saving, setSaving] = React.useState(false);
  const [signTarget, setSignTarget] = React.useState<TrainingAttendee | null>(null);

  const isAdmin = identity.role === "admin";
  const readOnly = !!draft.locked && !isAdmin;
  const canWrite = canEdit && !readOnly;
  /** 서명은 편집 권한과 무관하다 — 게스트가 직접 남기는 것이 이 서식의 목적이다.
      다만 아직 등록되지 않은 문서에는 서명할 수 없다(서버에 참석자가 없다) */
  const canSign = !isNew && !readOnly;
  const isPre = draft.kind === "사전 교육·회의";
  /** 공람표는 교육 서식이 아니다 — 결재란·사진·교육내용이 없고 평가 구분·기간·대상시설이 붙는다 */
  const circular = isCircular(draft);
  const photoLabels = TRAINING_PHOTO_LABELS[draft.kind];
  const minutes = trainingMinutes(draft);
  const signed = signedCount(draft);

  const patch = (p: Partial<Training>) => setDraft((d) => ({ ...d, ...p }));

  // 안내 문구도 서식에 맞춘다 — 결과 교육에는 '회의'라는 말이, 공람표에는 '교육'이라는 말이 없다
  const missing = (
    circular
      ? [!draft.date && "평가 시작일", !draft.facility && "대상시설", !draft.instructor && "평가자"]
      : [
          !draft.date && (isPre ? "교육·회의일자" : "교육일자"),
          !draft.place && (isPre ? "교육·회의장소" : "교육장소"),
          !draft.instructor && "교육강사",
        ]
  ).filter(Boolean) as string[];

  const submit = async () => {
    if (missing.length) return;
    setSaving(true);
    try {
      await saveTraining(draft);
      onDone(true);
    } finally {
      setSaving(false);
    }
  };

  /** 다른 서식과 같은 규칙 — 작성하다 만 내용이 있으면 뒤로가기 전에 한 번 확인한다 */
  const goBack = () => {
    const touched = JSON.stringify(draft) !== JSON.stringify(training);
    if (touched && !confirm("작성 중인 내용이 저장되지 않습니다. 나갈까요?")) return;
    onDone(false);
  };

  /* ── 참석자 ────────────────────────────────────────────── */
  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));
  const attendeeNames = new Set(draft.attendees.map((a) => a.name.trim()).filter(Boolean));

  const toggleStaff = (name: string) => {
    setDraft((d) => {
      const found = d.attendees.find((a) => a.name.trim() === name);
      if (!found) {
        return { ...d, attendees: [...d.attendees, emptyTrainingAttendee(settings.org.dept, name)] };
      }
      // 이미 서명을 받은 사람을 빼면 그 서명도 사라진다 — 실수로 지우지 않게 한 번 묻는다
      if (found.sign && !confirm(`${name} 님은 이미 서명했습니다. 명단에서 빼면 서명도 지워집니다. 계속할까요?`)) {
        return d;
      }
      return { ...d, attendees: d.attendees.filter((a) => a.id !== found.id) };
    });
  };

  /* 전체 선택·해제는 **직원 명단(체크박스)에만** 적용한다 — 명단에 없는 협력업체 인원은
     체크박스가 없으니 '해제'할 대상도 아니다. 실수로 지워지지 않게 그대로 둔다. */
  const checkedStaffCount = staff.filter((n) => attendeeNames.has(n)).length;
  const allStaffChecked = staff.length > 0 && checkedStaffCount === staff.length;

  const selectAllStaff = () =>
    setDraft((d) => {
      const have = new Set(d.attendees.map((a) => a.name.trim()));
      const added = staff.filter((n) => !have.has(n)).map((n) => emptyTrainingAttendee(settings.org.dept, n));
      return { ...d, attendees: [...d.attendees, ...added] };
    });

  const clearAllStaff = () => {
    const staffSet = new Set(staff);
    const signedOff = draft.attendees.filter((a) => staffSet.has(a.name.trim()) && a.sign);
    // 서명까지 지우는 것은 되돌릴 수 없다 — 한 번만 묻는다(사람마다 묻지 않는다)
    if (
      signedOff.length > 0 &&
      !confirm(`이미 서명한 ${signedOff.length}명(${signedOff.map((a) => a.name).join(", ")})의 서명도 함께 지워집니다. 계속할까요?`)
    ) {
      return;
    }
    setDraft((d) => ({ ...d, attendees: d.attendees.filter((a) => !staffSet.has(a.name.trim())) }));
  };

  const patchAttendee = (id: string, p: Partial<TrainingAttendee>) =>
    setDraft((d) => ({ ...d, attendees: d.attendees.map((a) => (a.id === id ? { ...a, ...p } : a)) }));

  /** 서명은 즉시 서버에 남기고, 돌아온 문서로 화면의 사본도 맞춘다 */
  const applySign = async (attendeeId: string, image: string | null) => {
    const next = await signTraining(draft.id, attendeeId, image);
    setDraft((d) => ({ ...d, attendees: next.attendees, updatedAt: next.updatedAt }));
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={goBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">
              {circular ? (isNew ? "새 공람표" : "위험성평가 결과 공람표") : `${isNew ? "새 " : ""}${draft.kind} 실시서`}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {draft.date || "일자 미입력"} ·{" "}
              {circular ? draft.facility || "대상시설 미입력" : draft.place || "장소 미입력"}
              {draft.attendees.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  서명 {signed}/{draft.attendees.length}
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
            aria-label={circular ? "공람표 인쇄" : "실시서 인쇄"}
            title={isNew ? "등록한 뒤에 인쇄할 수 있습니다" : circular ? "공람표 인쇄" : "실시서 인쇄 (본문 + 참석자 명단)"}
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
        <div className="no-print flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          관리자가 잠근 문서입니다. 내용은 볼 수 있지만 고치거나 서명할 수 없습니다.
        </div>
      )}

      {!canEdit && !readOnly && (
        <div className="no-print rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          내용은 관리자가 작성합니다. 아래 <strong>참석자 명단</strong>에서 본인 이름을 찾아 서명해 주세요.
        </div>
      )}

      {/* 개요 — 공람표는 서식이 아예 달라 통째로 갈라 그린다 */}
      {circular ? (
        <Card className="no-print shadow-xs">
          <CardHeader>
            <CardTitle>공람 개요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>위험성평가 구분</Label>
              {/* 원본은 최초·정기·수시 셋 중 하나에 표시한다 */}
              <div className="flex flex-wrap gap-2">
                {ASSESS_KINDS.map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={(draft.assessKind ?? "정기평가") === k ? "default" : "outline"}
                    disabled={!canWrite}
                    onClick={() => patch({ assessKind: k as AssessKind })}
                  >
                    {k}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>대상시설</Label>
                <Input
                  disabled={!canWrite}
                  value={draft.facility ?? ""}
                  onChange={(e) => patch({ facility: e.target.value })}
                  placeholder="예: 기흥공공하수처리시설"
                />
              </div>
              <div className="space-y-1.5">
                <Label>평가자</Label>
                <Input
                  disabled={!canWrite}
                  list="ras-staff"
                  value={draft.instructor}
                  onChange={(e) => patch({ instructor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>대상인원</Label>
                {/* 비워 두면 명단 인원 수가 그대로 쓰인다 */}
                <Input
                  type="number"
                  min={0}
                  disabled={!canWrite}
                  value={draft.headcount ?? ""}
                  onChange={(e) => patch({ headcount: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder={`${draft.attendees.length}명 (명단 인원)`}
                />
              </div>
              {/* 평가일시는 기간이다 — 원본이 '00월 00일 ~ 00월 00일' 형태다 */}
              <div className="space-y-1.5">
                <Label>평가 시작일</Label>
                <Input
                  type="date"
                  disabled={!canWrite}
                  value={draft.date}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>평가 종료일</Label>
                <Input
                  type="date"
                  disabled={!canWrite}
                  value={draft.dateTo ?? ""}
                  onChange={(e) => patch({ dateTo: e.target.value })}
                />
              </div>
              <datalist id="ras-staff">
                {settings.staff.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            {/* 게시 선언문 — 법정 게시 문구라 고치지 않는다 */}
            <div className="space-y-1.5">
              <Label>게시 문구 (고정)</Label>
              {/* 원본의 줄바꿈은 종이 칸 폭에 맞춘 것이라 화면에서는 그냥 흐르게 둔다(인쇄물은 그대로 지킨다) */}
              <p className="rounded-xl bg-muted px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
                {CIRCULAR_NOTICE.replace(/\n/g, " ")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>{isPre ? "교육·회의 개요" : "교육 개요"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>{isPre ? "교육·회의일자" : "교육일자"}</Label>
              <Input
                type="date"
                disabled={!canWrite}
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>시작 시각</Label>
              <Input
                type="time"
                disabled={!canWrite}
                value={draft.startAt}
                onChange={(e) => patch({ startAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>종료 시각</Label>
              <Input
                type="time"
                disabled={!canWrite}
                value={draft.endAt}
                onChange={(e) => patch({ endAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>소요시간</Label>
              {/* 시작·종료를 빼서 서식의 '( 분 )' 칸을 자동으로 채운다 */}
              <p className="flex h-9 items-center text-sm tabular-nums">
                {minutes !== null ? `${minutes}분` : "시각을 넣으면 자동으로 계산됩니다"}
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{isPre ? "교육·회의장소" : "교육장소"}</Label>
              <Input
                disabled={!canWrite}
                value={draft.place}
                onChange={(e) => patch({ place: e.target.value })}
                placeholder="예: 관리동 회의실"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{isPre ? "교육강사 (회의주관자)" : "교육강사"}</Label>
              <Input
                disabled={!canWrite}
                list="ras-staff"
                value={draft.instructor}
                onChange={(e) => patch({ instructor: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{isPre ? "참여인원" : "교육인원"}</Label>
              {/* 비워 두면 참석자 수가 그대로 쓰인다 — 명단에 없는 참관자가 있을 때만 직접 적는다 */}
              <Input
                type="number"
                min={0}
                disabled={!canWrite}
                value={draft.headcount ?? ""}
                onChange={(e) => patch({ headcount: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder={`${draft.attendees.length}명 (참석자 수)`}
              />
            </div>
            <datalist id="ras-staff">
              {settings.staff.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          {/* 결재란 — 설정의 기본값이 들어가고, 이 문서에서만 다르게 할 수도 있다 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                ["charge", "담당"],
                ["review", "검토"],
                ["approve", "승인"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  disabled={!canWrite}
                  list="ras-staff"
                  value={draft.approver[key]}
                  onChange={(e) => patch({ approver: { ...draft.approver, [key]: e.target.value } })}
                  placeholder={settings.org.approver[key] || "설정의 결재자 기본값"}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* 교육·회의 내용 — 공람표에는 없다(게시 문구가 개요 카드 안에 있다) */}
      {!circular && (
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>{isPre ? "교육 · 회의사항" : "교육내용"}</CardTitle>
          {/* 작성 단계의 안내라 읽기만 하는 사람에게는 띄우지 않는다 */}
          {canWrite && (
            <CardDescription>
              서식의 표준문구가 미리 채워져 있습니다. 그날 실제로 다룬 내용에 맞게 고쳐 주세요.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>교육내용</Label>
            <Textarea
              disabled={!canWrite}
              rows={10}
              value={draft.eduContent}
              onChange={(e) => patch({ eduContent: e.target.value })}
            />
          </div>
          {isPre && (
            <>
              <div className="space-y-1.5">
                <Label>회의내용</Label>
                <Textarea
                  disabled={!canWrite}
                  rows={14}
                  value={draft.meetContent}
                  onChange={(e) => patch({ meetContent: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>비고</Label>
                <Textarea
                  disabled={!canWrite}
                  rows={2}
                  value={draft.note}
                  onChange={(e) => patch({ note: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* 사진 — 칸 수는 서식이 정한다(사전 2장 / 결과 1장). 공람표에는 사진 칸이 없다 */}
      {photoLabels.length > 0 && (
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>{isPre ? "교육 · 회의 사진" : "교육 실시 사진"}</CardTitle>
        </CardHeader>
        <CardContent
          className={cn("grid grid-cols-1 gap-4", photoLabels.length > 1 ? "sm:grid-cols-2" : "sm:max-w-md")}
        >
          {photoLabels.map((name, i) => (
            <PhotoSlot
              key={name}
              label={name}
              photoId={draft.photos[i]}
              onChange={(id) => {
                const photos = [...draft.photos];
                photos[i] = id ?? "";
                patch({ photos });
              }}
              disabled={!canWrite || !canUploadPhoto}
            />
          ))}
        </CardContent>
      </Card>
      )}

      {/* 참석자 명단 (공람표에서는 공람 명단) */}
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>{circular ? "공람 명단" : "참석자 명단"}</CardTitle>
          <CardDescription>
            {canWrite
              ? `설정의 직원 명단에서 ${circular ? "공람한" : "참석한"} 사람을 체크하세요. 명단에 없는 분은 아래에서 직접 추가할 수 있습니다.`
              : "본인 이름을 찾아 서명 칸을 눌러 주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite &&
            (staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                설정 → 직원 명단이 비어 있습니다. 먼저 직원을 등록하면 여기서 체크할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {/* 교육은 전원 참석이 흔해서 하나씩 누르는 것보다 전체를 켜고 빠진 사람만 빼는 편이 빠르다 */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={allStaffChecked} onClick={selectAllStaff}>
                    <ListChecks className="size-3.5" /> 전체 선택
                  </Button>
                  <Button variant="outline" size="sm" disabled={checkedStaffCount === 0} onClick={clearAllStaff}>
                    <ListX className="size-3.5" /> 전체 해제
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    직원 {checkedStaffCount}/{staff.length}명 선택
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6">
                  {staff.map((name) => (
                    <label
                      key={name}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox checked={attendeeNames.has(name)} onChange={() => toggleStaff(name)} />
                      <span className="truncate">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

          {draft.attendees.length > 0 && (
            <TableWrap>
              {/* 좁은 화면에서 성명 칸이 눌려 한 글자만 보이는 것을 막는다 — 넘치면 가로로 넘긴다 */}
              <Table className={circular ? "min-w-[24rem]" : "min-w-[34rem]"}>
                <THead>
                  <TR>
                    <TH className="w-10 text-center">순번</TH>
                    {/* 공람표 원본에는 소속 칸이 없다 — 순번·성명·서명 셋뿐이다 */}
                    {!circular && <TH className="w-40">소속</TH>}
                    <TH className="w-32">성명</TH>
                    <TH className="w-40 text-center">서명</TH>
                    {canWrite && <TH className="w-12" />}
                  </TR>
                </THead>
                <TBody>
                  {draft.attendees.map((a, i) => (
                    <TR key={a.id}>
                      <TD className="text-center tabular-nums text-muted-foreground">{i + 1}</TD>
                      {!circular && (
                        <TD>
                          <Input
                            disabled={!canWrite}
                            className="h-8"
                            value={a.dept}
                            onChange={(e) => patchAttendee(a.id, { dept: e.target.value })}
                            placeholder="예: 운영팀"
                          />
                        </TD>
                      )}
                      <TD>
                        <Input
                          disabled={!canWrite}
                          className="h-8"
                          value={a.name}
                          onChange={(e) => patchAttendee(a.id, { name: e.target.value })}
                          placeholder="성명"
                        />
                      </TD>
                      <TD>
                        <SignCell
                          attendee={a}
                          disabled={!canSign}
                          hint={isNew ? "등록한 뒤에 서명할 수 있습니다" : undefined}
                          onOpen={() => setSignTarget(a)}
                          onClear={() => void applySign(a.id, null)}
                        />
                      </TD>
                      {canWrite && (
                        <TD>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (a.sign && !confirm("이미 받은 서명도 함께 지워집니다. 계속할까요?")) return;
                              setDraft((d) => ({ ...d, attendees: d.attendees.filter((x) => x.id !== a.id) }));
                            }}
                            aria-label="참석자 삭제"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}

          {canWrite && (
            <div className="flex items-center justify-center gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">
                명단에 없는 {circular ? "인원" : "참석자(협력업체 등)"}를 직접 추가
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setDraft((d) => ({ ...d, attendees: [...d.attendees, emptyTrainingAttendee(settings.org.dept)] }))
                }
                aria-label="참석자 추가"
              >
                <Plus />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SignDialog
        attendee={signTarget}
        onClose={() => setSignTarget(null)}
        onSave={async (dataUrl) => {
          if (!signTarget) return;
          await applySign(signTarget.id, dataUrl);
          setSignTarget(null);
        }}
      />

      <TrainingSheet training={draft} />
    </div>
  );
}

/** 표 안의 서명 칸 — 서명이 있으면 그림을, 없으면 '서명' 버튼을 보여준다 */
function SignCell({
  attendee,
  disabled,
  hint,
  onOpen,
  onClear,
}: {
  attendee: TrainingAttendee;
  disabled: boolean;
  hint?: string;
  onOpen: () => void;
  onClear: () => void;
}) {
  const url = usePhotoUrl(attendee.sign);
  if (!attendee.sign) {
    return (
      <Button variant="outline" size="sm" className="w-full" disabled={disabled} onClick={onOpen} title={hint}>
        <PenLine className="size-3.5" /> 서명
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        title={disabled ? hint : "다시 서명"}
        className={cn(
          "h-9 flex-1 overflow-hidden rounded-xl bg-input/40 ring-1 ring-foreground/5",
          disabled ? "cursor-default" : "cursor-pointer hover:bg-input/70",
        )}
      >
        {url && <img src={url} alt={`${attendee.name} 서명`} className="h-full w-full object-contain p-0.5" />}
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        className="text-destructive hover:text-destructive"
        onClick={onClear}
        aria-label="서명 지우기"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

/** 손서명 팝업 — 그린 그림을 PNG로 굳혀 서버에 바로 보낸다 */
function SignDialog({
  attendee,
  onClose,
  onSave,
}: {
  attendee: TrainingAttendee | null;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = React.useState(false);

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      await onSave(signatureDataUrl(canvas));
    } catch (e) {
      alert(`서명을 저장하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!attendee} onClose={onClose} className="max-w-lg sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{attendee?.name || "참석자"} 서명</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">아래 칸에 손가락이나 펜으로 서명해 주세요.</p>
      {attendee && <SignatureCanvas onReady={(c) => (canvasRef.current = c)} />}
      <DialogFooter>
        <Button variant="outline" onClick={clear}>
          <Eraser className="size-3.5" /> 지우기
        </Button>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "저장 중…" : "저장"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
