/**
 * 설문지 작성 화면 — 세로로 흐르는 폼(A안).
 * 현장에서 폰으로 한 건씩 올리는 흐름이라 표가 아니라 한 줄에 한 항목씩 둔다.
 */
import * as React from "react";
import { ArrowLeft, ArrowRightLeft, Printer } from "lucide-react";
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
import { emptyRow, SURVEY_MAX_PHOTOS, type RiskItem, type Survey } from "@/lib/types";
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
  const { assessments, saveAssessment, saveSurvey, settings, canEdit, canSurvey } = useStore();
  const [draft, setDraft] = React.useState<Survey>(survey);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveTargetId, setMoveTargetId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  /* 자동 저장하지 않는다 — '제출'을 눌러야 서버에 등록된다 */
  const missing = missingFields(draft);

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
    const next = { ...draft, movedTo: { assessmentId: target.id, rowId: row.id, at: Date.now() } };
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

      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>위험성평가 의견청취</CardTitle>
          <CardDescription>
            현장에서 찾은 위험요인과 개선 의견을 적어주세요. 입력하는 대로 자동으로 저장됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>작성자</Label>
              <Select
                className="w-full"
                disabled={!canSurvey}
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
                disabled={!canSurvey}
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>공정명</Label>
              <ProcessSelect value={draft.process} onChange={(v) => patch({ process: v })} disabled={!canSurvey} />
            </div>
            <div className="space-y-1.5">
              <Label>세부공정</Label>
              <Input
                disabled={!canSurvey}
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
                disabled={!canSurvey}
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
                disabled={!canSurvey}
                hazardClass={draft.hazardClass}
                value={draft.hazardCode}
                onChange={(e) => patch({ hazardCode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>유해위험요인</Label>
            <Textarea
              disabled={!canSurvey}
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
                disabled={!canSurvey}
                value={draft.p}
                onChange={(v) => patch({ p: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>중대성</Label>
              <ScoreSelect
                className="h-9"
                kind="s"
                disabled={!canSurvey}
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
              disabled={!canSurvey}
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
              disabled={!canSurvey}
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
                  disabled={!canSurvey}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 제출 — 사진을 뺀 모든 항목이 채워져야 누를 수 있다 */}
      <div className="no-print flex flex-wrap items-center justify-end gap-3">
        {missing.length > 0 && (
          <p className="text-sm text-muted-foreground">
            남은 항목: <span className="text-destructive">{missing.join(", ")}</span>
          </p>
        )}
        <Button variant="outline" onClick={goBack}>
          취소
        </Button>
        <Button disabled={!canSurvey || missing.length > 0 || saving} onClick={() => void submit()}>
          {saving ? "저장 중…" : isNew ? "제출" : "저장"}
        </Button>
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
