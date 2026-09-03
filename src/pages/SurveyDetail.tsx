/**
 * 설문지 작성 화면 — 세로로 흐르는 폼(A안).
 * 현장에서 폰으로 한 건씩 올리는 흐름이라 표가 아니라 한 줄에 한 항목씩 둔다.
 */
import * as React from "react";
import { ArrowLeft, ArrowRightLeft, Lock, Printer } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { HazardClassSelect, HazardCodeSelect, ProcessSelect, ScoreSelect } from "@/components/fields";
import { PhotoSlot } from "@/components/photo";
import { SurveySheet } from "@/print/SurveySheet";
import { classOfCode, inspectionMoved } from "@/lib/settings";
import { riskBadgeClass, riskOf } from "@/lib/risk";
import {
  emptyRow,
  REVIEW_STATUSES,
  reviewOf,
  SURVEY_MAX_PHOTOS,
  type ReviewStatus,
  type RiskItem,
  type Survey,
} from "@/lib/types";
import { useStore } from "@/store";

/** 사진을 뺀 나머지는 전부 채워야 제출할 수 있다 */
const REQUIRED: { key: keyof Survey; label: string }[] = [
  { key: "author", label: "작성자" },
  { key: "date", label: "작성일자" },
  { key: "process", label: "공정명" },
  { key: "subProcess", label: "세부공정" },
  { key: "hazardClass", label: "위험분류" },
  { key: "hazardCode", label: "위험코드" },
  { key: "hazard", label: "유해위험요인" },
  { key: "p", label: "가능성" },
  { key: "s", label: "중대성" },
  { key: "measure", label: "개선대책" },
  { key: "dueDate", label: "개선예정일" },
];

function missingFields(v: Survey): string[] {
  return REQUIRED.filter(({ key }) => {
    const val = v[key];
    return val === null || val === undefined || String(val).trim() === "";
  }).map((f) => f.label);
}

export function SurveyDetail({
  survey,
  isNew = false,
  onDone,
}: {
  survey: Survey;
  isNew?: boolean;
  /** saved=true면 제출·저장이 끝난 것 */
  onDone: (saved: boolean) => void;
}) {
  const { assessments, saveAssessment, saveSurvey, settings, identity, canEdit, canSurvey } = useStore();
  const isAdmin = identity.role === "admin";
  const [draft, setDraft] = React.useState<Survey>(survey);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveTargetId, setMoveTargetId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  /* 자동 저장하지 않는다 — '제출'을 눌러야 서버에 등록된다 */
  const missing = missingFields(draft);
  /** 잠긴 의견은 게스트에게 읽기 전용이다(관리자는 계속 고칠 수 있다).
      화면 잠금은 편의일 뿐이고 워커가 매 요청마다 다시 검사한다. */
  const readOnly = !!draft.locked && !isAdmin;
  const canWrite = canSurvey && !readOnly;
  const review = reviewOf(draft);
  const [reviewSaving, setReviewSaving] = React.useState(false);

  /** 검토 상태는 본문 저장과 따로 바로 반영한다 — 관리자만 누를 수 있다 */
  const setReview = async (st: ReviewStatus) => {
    const next: Survey = { ...draft, review: st, ...(st === "반려" ? {} : { reviewNote: "" }) };
    setDraft(next);
    setReviewSaving(true);
    try {
      await saveSurvey(next);
    } finally {
      setReviewSaving(false);
    }
  };

  const submit = async () => {
    if (missing.length > 0) return;
    setSaving(true);
    try {
      await saveSurvey(draft);
      onDone(true);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    const touched = JSON.stringify(draft) !== JSON.stringify(survey);
    if (touched && !confirm("작성 중인 내용이 저장되지 않습니다. 나갈까요?")) return;
    onDone(false);
  };

  const patch = (p: Partial<Survey>) => setDraft((d) => ({ ...d, ...p }));
  const setPhoto = (i: number, id: string | undefined) =>
    setDraft((d) => {
      const photos = [...d.photos];
      if (id) photos[i] = id;
      else photos.splice(i, 1);
      return { ...d, photos: photos.filter(Boolean) };
    });

  const risk = riskOf(draft.p, draft.s);
  const moved = inspectionMoved(assessments, draft.movedTo);
  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));

  const moveToAssessment = async () => {
    const target = assessments.find((a) => a.id === moveTargetId);
    if (!target) return;
    const row: RiskItem = {
      ...emptyRow(),
      subProcess: draft.subProcess,
      hazardClass: draft.hazardClass || classOfCode(settings, draft.hazardCode),
      hazardCode: draft.hazardCode,
      hazard: draft.hazard,
      p: draft.p,
      s: draft.s,
      measure: draft.measure,
      dueDate: draft.dueDate,
      note: `의견청취 · ${draft.author || "작성자 미상"}`,
    };
    await saveAssessment({ ...target, rows: [...target.rows, row] });
    // 평가표에 반영된 뒤 원본이 바뀌면 근거가 어긋나므로 함께 잠근다(관리자는 풀 수 있다)
    const next: Survey = {
      ...draft,
      movedTo: { assessmentId: target.id, rowId: row.id, at: Date.now() },
      locked: true,
      review: "반영", // 이관 = 반영됐다는 뜻이므로 검토 상태도 함께 올린다
    };
    setDraft(next);
    await saveSurvey(next); // 자동 저장이 없으므로 이관 흔적은 여기서 직접 남긴다
    setMoveOpen(false);
    setMoveTargetId("");
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <p className="font-medium">{draft.author || "작성자 미입력"}</p>
            <p className="text-sm text-muted-foreground">
              {draft.date || "-"} · {draft.process || "공정 미입력"}
              {moved && " · 평가표 이관됨"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            /* 이관은 공식 평가표를 고치는 행위라 편집 권한이 있어야 한다 —
               게스트는 의견을 내고, 반영 여부는 관리자가 검토해서 정한다 */
            disabled={isNew || !canEdit || moved || !draft.hazard.trim()}
            onClick={() => setMoveOpen(true)}
            aria-label="위험성평가표로 이관"
            title={
              isNew
                ? "제출한 뒤에 이관할 수 있습니다"
                : !canEdit
                ? "평가표 이관은 관리자가 합니다"
                : moved
                  ? "이미 이관된 의견입니다"
                  : "위험성평가표로 이관"
            }
          >
            <ArrowRightLeft />
          </Button>
          <Button variant="outline" size="icon-lg" disabled={isNew} onClick={() => window.print()} aria-label="설문지 인쇄" title={isNew ? "제출한 뒤에 인쇄할 수 있습니다" : "설문지 인쇄"}>
            <Printer />
          </Button>
        </div>
      </div>

      {readOnly && (
        <div className="no-print flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          관리자가 잠근 의견입니다. 내용은 볼 수 있지만 고칠 수 없습니다.
        </div>
      )}

      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>위험성평가 의견청취</CardTitle>
          <CardDescription>
            현장에서 찾은 위험요인과 개선 의견을 적어주세요. 다 채운 뒤 아래 &lsquo;제출&rsquo;을 눌러야 등록됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>작성자</Label>
              <Select
                className="w-full"
                disabled={!canWrite}
                value={draft.author}
                onChange={(e) => patch({ author: e.target.value })}
              >
                <option value="">선택하세요</option>
                {(draft.author && !staff.includes(draft.author) ? [...staff, draft.author] : staff).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>작성일자</Label>
              <Input
                type="date"
                disabled={!canWrite}
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>공정명</Label>
              <ProcessSelect value={draft.process} onChange={(v) => patch({ process: v })} disabled={!canWrite} />
            </div>
            <div className="space-y-1.5">
              <Label>세부공정</Label>
              <Input
                disabled={!canWrite}
                value={draft.subProcess}
                onChange={(e) => patch({ subProcess: e.target.value })}
                placeholder="예: 침사지 조목스크린"
              />
            </div>
            <div className="space-y-1.5">
              <Label>위험분류</Label>
              {/* 분류를 바꾸면 그 분류에 없는 위험코드는 남겨둘 수 없다 */}
              <HazardClassSelect
                className="h-9"
                disabled={!canWrite}
                value={draft.hazardClass}
                onChange={(e) =>
                  patch({ hazardClass: e.target.value as Survey["hazardClass"], hazardCode: "" })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>위험코드</Label>
              <HazardCodeSelect
                className="h-9"
                disabled={!canWrite}
                hazardClass={draft.hazardClass}
                value={draft.hazardCode}
                onChange={(e) => patch({ hazardCode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>유해위험요인</Label>
            <Textarea
              disabled={!canWrite}
              rows={3}
              value={draft.hazard}
              onChange={(e) => patch({ hazard: e.target.value })}
              placeholder="어떤 위험이 있는지 적어주세요"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>가능성</Label>
              <ScoreSelect
                className="h-9"
                kind="p"
                disabled={!canWrite}
                value={draft.p}
                onChange={(v) => patch({ p: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>중대성</Label>
              <ScoreSelect
                className="h-9"
                kind="s"
                disabled={!canWrite}
                value={draft.s}
                onChange={(v) => patch({ s: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>위험성</Label>
              {/* 가능성 × 중대성 자동 계산 — 직접 입력하지 않는다 */}
              <div className="flex h-9 items-center">
                <Badge className={riskBadgeClass(risk)}>{risk ?? "-"}</Badge>
                <span className="ml-2 text-xs text-muted-foreground">가능성 × 중대성</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>개선대책</Label>
            <Textarea
              disabled={!canWrite}
              rows={3}
              value={draft.measure}
              onChange={(e) => patch({ measure: e.target.value })}
              placeholder="어떻게 하면 좋을지 의견을 적어주세요"
            />
          </div>

          <div className="space-y-1.5 sm:max-w-56">
            <Label>개선예정일</Label>
            <Input
              type="date"
              disabled={!canWrite}
              value={draft.dueDate}
              onChange={(e) => patch({ dueDate: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>사진 (최대 {SURVEY_MAX_PHOTOS}장)</Label>
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              {Array.from({ length: SURVEY_MAX_PHOTOS }, (_, i) => (
                <PhotoSlot
                  key={i}
                  label={`사진 ${i + 1}`}
                  photoId={draft.photos[i]}
                  onChange={(id) => setPhoto(i, id)}
                  disabled={!canWrite}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 검토 — 낸 사람이 자기 의견이 어떻게 됐는지 확인할 수 있어야 한다.
          상태를 바꾸는 건 관리자뿐이고, 게스트에게는 결과만 보인다 */}
      {!isNew && (
        <Card className="no-print shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">검토 결과</CardTitle>
            <CardDescription>
              {isAdmin
                ? "제출된 의견을 검토하고 결과를 남겨주세요. 평가표로 이관하면 자동으로 '반영'이 됩니다."
                : "관리자가 남긴 검토 결과입니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {REVIEW_STATUSES.map((st) => {
                const on = review === st;
                return (
                  <Button
                    key={st}
                    size="sm"
                    variant={on ? "default" : "outline"}
                    disabled={!isAdmin}
                    onClick={() => void setReview(st)}
                  >
                    {st}
                  </Button>
                );
              })}
              {reviewSaving && <span className="text-xs text-muted-foreground">저장 중…</span>}
            </div>
            {review === "반려" && (
              <div className="space-y-1.5">
                <Label>반려 사유</Label>
                {isAdmin ? (
                  <Textarea
                    rows={2}
                    value={draft.reviewNote ?? ""}
                    onChange={(e) => patch({ reviewNote: e.target.value })}
                    onBlur={() => void saveSurvey(draft)}
                    placeholder="왜 반영하지 못했는지 적어주세요"
                  />
                ) : (
                  <p className="rounded-xl bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
                    {draft.reviewNote?.trim() || "사유가 적혀 있지 않습니다."}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 제출 — 사진을 뺀 모든 항목이 채워져야 누를 수 있다 */}
      <div className="no-print flex flex-wrap items-center justify-end gap-3">
        {!readOnly && missing.length > 0 && (
          <p className="text-sm text-muted-foreground">
            남은 항목: <span className="text-destructive">{missing.join(", ")}</span>
          </p>
        )}
        <Button variant="outline" onClick={goBack}>
          {readOnly ? "닫기" : "취소"}
        </Button>
        {!readOnly && (
          <Button disabled={!canWrite || missing.length > 0 || saving} onClick={() => void submit()}>
            {saving ? "저장 중…" : isNew ? "제출" : "저장"}
          </Button>
        )}
      </div>

      {/* 위험성평가표로 이관 */}
      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)}>
        <DialogHeader>
          <DialogTitle>이 의견을 위험성평가표로 옮길까요?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            세부공정·위험분류·위험코드·유해위험요인·가능성·중대성·개선대책·개선예정일이 그대로 들어가고,
            비고에 <strong>의견청취 · {draft.author || "작성자 미상"}</strong>이 남습니다.
          </p>
          <Label>옮길 평가표</Label>
          <Select className="w-full" value={moveTargetId} onChange={(e) => setMoveTargetId(e.target.value)}>
            <option value="">선택하세요</option>
            {[...assessments]
              .sort((a, b) => a.processNo - b.processNo)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.processNo}. {a.facility || "-"} · {a.process || "-"} ({a.rows.length}건)
                </option>
              ))}
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMoveOpen(false)}>
            취소
          </Button>
          <Button disabled={!moveTargetId} onClick={() => void moveToAssessment()}>
            옮기기
          </Button>
        </DialogFooter>
      </Dialog>

      <SurveySheet survey={draft} />
    </div>
  );
}
