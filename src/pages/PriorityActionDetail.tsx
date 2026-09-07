/**
 * 우선조치 요청서 상세 — 점검자·본사가 사업부문에 발행하는 문서다.
 *
 * 작업중지 요청서와 달리 **관리자(편집 권한) 전용**이다. 발행 후 48시간 이내
 * 처리가 원칙이라 조치기간을 반드시 적고, 결과는 회신받아 '조치결과'에 남긴다.
 */
import * as React from "react";
import { ArrowLeft, Printer, Send, TriangleAlert } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { PhotoSlot } from "@/components/photo";
import { SignatureField } from "@/components/signature";
import { PriorityActionSheet } from "@/print/PriorityActionSheet";
import { inspectionMoved } from "@/lib/settings";
import {
  emptyRow,
  PRIORITY_STATUSES,
  STOPWORK_PHOTO_LABELS,
  type PriorityAction,
  type PriorityStatus,
  type RiskItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const PRIORITY_TONE: Record<string, string> = {
  발행: "bg-destructive/10 text-destructive",
  조치중: "text-foreground",
  완료: "bg-series-1/10 text-series-1",
};

export function PriorityActionDetail({
  action,
  isNew,
  onDone,
}: {
  action: PriorityAction;
  isNew?: boolean;
  onDone: (saved: boolean) => void;
}) {
  const { assessments, saveAssessment, savePriorityAction, canEdit, canUploadPhoto } = useStore();
  const [draft, setDraft] = React.useState<PriorityAction>(action);
  const [saving, setSaving] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [target, setTarget] = React.useState("");
  const [printTick, setPrintTick] = React.useState(0);
  React.useEffect(() => {
    if (printTick > 0) window.print();
  }, [printTick]);

  const moved = inspectionMoved(assessments, draft.movedTo);
  const patch = (p: Partial<PriorityAction>) => setDraft((d) => ({ ...d, ...p }));

  const missing = [
    !draft.site && "사업장명",
    !draft.finding && "확인내용",
    !draft.request && "요청사항",
    !draft.dueDate && "조치기간",
  ].filter(Boolean) as string[];

  const submit = async () => {
    if (missing.length) return;
    setSaving(true);
    try {
      await savePriorityAction(draft);
      onDone(true);
    } finally {
      setSaving(false);
    }
  };

  /** 작업중지 요청서와 같은 규칙 — 작성하다 만 내용이 있으면 뒤로가기 전에 한 번 확인한다 */
  const goBack = () => {
    const touched = JSON.stringify(draft) !== JSON.stringify(action);
    if (touched && !confirm("작성 중인 내용이 저장되지 않습니다. 나갈까요?")) return;
    onDone(false);
  };

  const setStatus = async (st: PriorityStatus) => {
    const next: PriorityAction = { ...draft, status: st };
    setDraft(next);
    if (!isNew) await savePriorityAction(next);
  };

  const moveToAssessment = async () => {
    const a = assessments.find((x) => x.id === target);
    if (!a) return;
    const row: RiskItem = {
      ...emptyRow(),
      hazard: draft.finding,
      measure: draft.request,
      dueDate: draft.dueDate,
      note: `우선조치권 · ${draft.no}`,
    };
    await saveAssessment({ ...a, rows: [...a.rows, row] });
    const next: PriorityAction = {
      ...draft,
      movedTo: { assessmentId: a.id, rowId: row.id, at: Date.now() },
    };
    setDraft(next);
    await savePriorityAction(next);
    setMoveOpen(false);
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
              {isNew ? "새 우선조치 요청서" : `발행번호 ${draft.no || "-"}`}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {draft.site || "사업장 미입력"} · {draft.date}
              <Badge variant="outline" className={cn("font-normal", PRIORITY_TONE[draft.status])}>
                {draft.status}
              </Badge>
              {moved && (
                <Badge variant="outline" className="font-normal">
                  이관됨
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => setPrintTick((t) => t + 1)}
                aria-label="우선조치 요청서 인쇄"
                title="인쇄 · PDF"
              >
                <Printer />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                disabled={!canEdit || moved}
                onClick={() => setMoveOpen(true)}
                aria-label="위험성평가표로 이관"
                title={moved ? "이미 평가표로 옮긴 건입니다" : "위험성평가표로 이관"}
              >
                <Send />
              </Button>
            </>
          )}
          <Button disabled={!canEdit || saving || missing.length > 0} onClick={() => void submit()}>
            {saving ? "저장 중…" : isNew ? "발행" : "저장"}
          </Button>
        </div>
      </div>

      {missing.length > 0 && canEdit && (
        <p className="no-print text-sm text-muted-foreground">
          <TriangleAlert className="mr-1 inline size-3.5" />
          {missing.join(" · ")}을(를) 채워야 {isNew ? "발행" : "저장"}할 수 있습니다.
        </p>
      )}

      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>발행</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>발행번호</Label>
            <Input disabled={!canEdit} value={draft.no} onChange={(e) => patch({ no: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>발행 부서</Label>
            <Input
              disabled={!canEdit}
              value={draft.issuedBy}
              onChange={(e) => patch({ issuedBy: e.target.value })}
              placeholder="예) 지속경영본부_안전보건팀"
            />
          </div>
          <div className="space-y-1.5">
            <Label>발행일</Label>
            <Input
              disabled={!canEdit}
              type="date"
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>점검일시</Label>
            <Input
              disabled={!canEdit}
              type="date"
              value={draft.inspectedAt}
              onChange={(e) => patch({ inspectedAt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>사업장명</Label>
            <Input disabled={!canEdit} value={draft.site} onChange={(e) => patch({ site: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>대표 (현장소장)</Label>
            <Input disabled={!canEdit} value={draft.rep} onChange={(e) => patch({ rep: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>조치기간</Label>
            <Input
              disabled={!canEdit}
              type="date"
              value={draft.dueDate}
              onChange={(e) => patch({ dueDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>점검 결과</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label>관련기준</Label>
              <Input
                disabled={!canEdit}
                value={draft.standard}
                onChange={(e) => patch({ standard: e.target.value })}
                placeholder="예) 산업안전보건법 제39조(보건조치)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>위반시 Penalty</Label>
              <Textarea
                rows={2}
                disabled={!canEdit}
                value={draft.penalty}
                onChange={(e) => patch({ penalty: e.target.value })}
                placeholder="예) (벌칙) 5년 이하의 징역 또는 5천만원 이하의 벌금 / (과태료) -"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>확인내용</Label>
            <Textarea
              rows={3}
              disabled={!canEdit}
              value={draft.finding}
              onChange={(e) => patch({ finding: e.target.value })}
              placeholder="예) 사업장 내 고농도 일산화탄소(CO) 검출"
            />
          </div>
          <div className="space-y-1.5">
            <Label>요청사항</Label>
            <Textarea
              rows={4}
              disabled={!canEdit}
              value={draft.request}
              onChange={(e) => patch({ request: e.target.value })}
              placeholder="예) 셔터/문 개방 및 덕트 조정 즉시 조치사항"
            />
          </div>
          <div className="space-y-1.5">
            <Label>기타사항</Label>
            <Textarea
              rows={2}
              disabled={!canEdit}
              value={draft.note}
              onChange={(e) => patch({ note: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>조치 및 서명</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>진행 상태</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_STATUSES.map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={draft.status === st ? "default" : "outline"}
                  disabled={!canEdit}
                  onClick={() => void setStatus(st)}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>조치결과 (사업부문 회신)</Label>
            <Textarea
              rows={3}
              disabled={!canEdit}
              value={draft.result}
              onChange={(e) => patch({ result: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>발행자</Label>
                <Input
                  disabled={!canEdit}
                  value={draft.issuerName}
                  onChange={(e) => patch({ issuerName: e.target.value })}
                  placeholder="예) 지속경영본부장 ○○○"
                />
              </div>
              <SignatureField
                label="발행자 서명"
                signId={draft.issuerSign}
                onChange={(id) => patch({ issuerSign: id })}
                disabled={!canEdit || !canUploadPhoto}
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>협조자</Label>
                <Input
                  disabled={!canEdit}
                  value={draft.coopName}
                  onChange={(e) => patch({ coopName: e.target.value })}
                  placeholder="예) ○○사업부문장 ○○○"
                />
              </div>
              <SignatureField
                label="협조자 서명"
                signId={draft.coopSign}
                onChange={(id) => patch({ coopSign: id })}
                disabled={!canEdit || !canUploadPhoto}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>현장 사진 (조치 전·후)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STOPWORK_PHOTO_LABELS.map((name, i) => (
            <PhotoSlot
              key={name}
              label={name}
              photoId={draft.photos[i]}
              onChange={(id) => {
                const photos = [...draft.photos];
                photos[i] = id ?? "";
                patch({ photos });
              }}
              disabled={!canEdit || !canUploadPhoto}
            />
          ))}
        </CardContent>
      </Card>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)}>
        <DialogHeader>
          <DialogTitle>이 건을 위험성평가표로 옮길까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          확인내용이 유해위험요인으로, 요청사항이 개선대책으로, 조치기간이 개선예정일로 들어갑니다.
        </p>
        <Select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">평가표 선택</option>
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.facility || "시설 미입력"} · {a.process || "공정 미입력"}
            </option>
          ))}
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMoveOpen(false)}>
            취소
          </Button>
          <Button disabled={!target} onClick={() => void moveToAssessment()}>
            이관
          </Button>
        </DialogFooter>
      </Dialog>

      <PriorityActionSheet action={draft} />
    </div>
  );
}
