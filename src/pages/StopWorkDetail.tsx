/**
 * 작업중지 요청서 상세 — 작성·조치·재개까지 한 화면에서 다룬다.
 *
 * 설문지와 같은 규칙:
 * - 새 문서는 **등록을 눌러야** 서버에 남는다(자동 저장 안 함). 이미 등록된 건은 '저장'.
 * - 잠금(관리자만)이 걸리면 게스트는 읽기 전용으로 연다 — 진짜 방어선은 워커다.
 *
 * 인쇄는 두 가지(요청서 / 현장 게시용 작업중지명령서)라 고른 한 종류만 DOM에 둔다.
 * 전부 렌더해 두면 `.print-root`의 display:block !important가 .no-print를 이겨
 * 한꺼번에 찍힌다(다른 화면에서 이미 겪은 문제).
 */
import * as React from "react";
import { ArrowLeft, Lock, OctagonAlert, Printer, Send, TriangleAlert } from "lucide-react";
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
import { StopWorkSheet } from "@/print/StopWorkSheet";
import { StopOrderSheet } from "@/print/StopOrderSheet";
import { inspectionMoved } from "@/lib/settings";
import {
  emptyRow,
  STOPWORK_PHOTO_LABELS,
  STOP_STATUSES,
  stopMinutes,
  type RiskItem,
  type StopStatus,
  type StopWork,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const STOP_TONE: Record<string, string> = {
  중지: "bg-destructive/10 text-destructive",
  조치중: "text-foreground",
  재개: "bg-series-1/10 text-series-1",
  중단: "bg-destructive/10 text-destructive",
};

export function StopWorkDetail({
  stopWork,
  isNew,
  onDone,
}: {
  stopWork: StopWork;
  isNew?: boolean;
  onDone: (saved: boolean) => void;
}) {
  const { assessments, saveAssessment, saveStopWork, canStopWork, canUploadPhoto, identity, settings } = useStore();
  const [draft, setDraft] = React.useState<StopWork>(stopWork);
  const [saving, setSaving] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [target, setTarget] = React.useState("");
  /** 인쇄 — 요청서와 현장 게시용 명령서 중 고른 한 종류만 DOM에 둔다 */
  const [sheet, setSheet] = React.useState<"request" | "order">("request");
  const [printTick, setPrintTick] = React.useState(0);
  React.useEffect(() => {
    if (printTick > 0) window.print();
  }, [printTick]);
  const print = (kind: "request" | "order") => {
    setSheet(kind);
    setPrintTick((t) => t + 1);
  };

  const isAdmin = identity.role === "admin";
  const readOnly = !!draft.locked && !isAdmin;
  const canWrite = canStopWork && !readOnly;
  const moved = inspectionMoved(assessments, draft.movedTo);
  const minutes = stopMinutes(draft);

  const patch = (p: Partial<StopWork>) => setDraft((d) => ({ ...d, ...p }));

  /** 등록·저장에 필요한 항목 — 사진·서명·조치결과는 나중에 채울 수 있다 */
  const missing = [
    !draft.dept && "소속(업체)",
    !draft.workName && "작업명",
    !draft.requesterName && "요청자 성명",
    !draft.reason && "중지 사유",
  ].filter(Boolean) as string[];

  const submit = async () => {
    if (missing.length) return;
    setSaving(true);
    try {
      await saveStopWork(draft);
      onDone(true);
    } finally {
      setSaving(false);
    }
  };

  /** 상태는 바로 저장한다 — 현장에서 재개 승인을 누르는 즉시 남아야 한다 */
  const setStatus = async (st: StopStatus) => {
    const next: StopWork = { ...draft, status: st };
    setDraft(next);
    if (!isNew) await saveStopWork(next);
  };

  /** 위험성평가표로 이관 — 순회점검·설문지와 같은 방식(행 id를 남겨 배지를 파생한다) */
  const moveToAssessment = async () => {
    const a = assessments.find((x) => x.id === target);
    if (!a) return;
    const row: RiskItem = {
      ...emptyRow(),
      hazard: draft.reason,
      measure: draft.result,
      note: `작업중지권 · ${draft.requesterName || draft.dept}`,
      subProcess: draft.workName,
    };
    await saveAssessment({ ...a, rows: [...a.rows, row] });
    const next: StopWork = {
      ...draft,
      movedTo: { assessmentId: a.id, rowId: row.id, at: Date.now() },
      locked: true, // 반영된 건의 원본이 바뀌면 근거가 어긋난다
    };
    setDraft(next);
    await saveStopWork(next);
    setMoveOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => onDone(false)} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">
              {isNew ? "새 작업중지 요청서" : `접수번호 ${draft.no || "-"}`}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {draft.workName || "작업명 미입력"} · {draft.date}
              <Badge variant="outline" className={cn("font-normal", STOP_TONE[draft.status])}>
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
                onClick={() => print("order")}
                aria-label="작업중지명령서 인쇄"
                title="작업중지명령서 (현장 게시용 · 컬러)"
              >
                <OctagonAlert />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => print("request")}
                aria-label="작업중지 요청서 인쇄"
                title="작업중지 요청서 인쇄 · PDF"
              >
                <Printer />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                disabled={!isAdmin || moved}
                onClick={() => setMoveOpen(true)}
                aria-label="위험성평가표로 이관"
                title={
                  moved
                    ? "이미 평가표로 옮긴 건입니다"
                    : isAdmin
                      ? "위험성평가표로 이관"
                      : "이관은 관리자만 할 수 있습니다"
                }
              >
                <Send />
              </Button>
            </>
          )}
          <Button disabled={!canWrite || saving || missing.length > 0} onClick={() => void submit()}>
            {saving ? "저장 중…" : isNew ? "등록" : "저장"}
          </Button>
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
          관리자가 잠근 문서입니다. 내용은 볼 수 있지만 고칠 수 없습니다.
        </div>
      )}

      {/* 접수 정보 */}
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>접수</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>접수번호</Label>
            <Input disabled={!canWrite} value={draft.no} onChange={(e) => patch({ no: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>접수자</Label>
            <Input
              disabled={!canWrite}
              list="ras-staff"
              value={draft.receivedBy}
              onChange={(e) => patch({ receivedBy: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>작성일</Label>
            <Input
              disabled={!canWrite}
              type="date"
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>소속 (업체)</Label>
            <Input disabled={!canWrite} value={draft.dept} onChange={(e) => patch({ dept: e.target.value })} />
          </div>
          <datalist id="ras-staff">
            {settings.staff.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </CardContent>
      </Card>

      {/* 요청 내용 */}
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>작업중지 요청</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>작업명</Label>
              {/* 공정명 목록에 없는 작업(예: "슬러지 저류조 준설")도 그대로 적을 수 있어야 한다 —
                  급박한 상황에서 목록에 없다고 못 적으면 서식 자체가 막힌다. 목록은 추천만 한다 */}
              <Input
                disabled={!canWrite}
                list="ras-processes"
                value={draft.workName}
                onChange={(e) => patch({ workName: e.target.value })}
              />
              <datalist id="ras-processes">
                {settings.processes.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>요청자 직급</Label>
              <Input
                disabled={!canWrite}
                value={draft.requesterRank}
                onChange={(e) => patch({ requesterRank: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>요청자 성명</Label>
              <Input
                disabled={!canWrite}
                list="ras-staff"
                value={draft.requesterName}
                onChange={(e) => patch({ requesterName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>전화번호</Label>
              <Input
                disabled={!canWrite}
                type="tel"
                value={draft.requesterPhone}
                onChange={(e) => patch({ requesterPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_16rem]">
            <div className="space-y-1.5">
              <Label>요청내용 (중지 사유)</Label>
              <Textarea
                rows={4}
                disabled={!canWrite}
                value={draft.reason}
                onChange={(e) => patch({ reason: e.target.value })}
                placeholder="예) 밀폐공간 작업 시 구성원 특별안전교육 미수료 / 송기마스크 미비치"
              />
            </div>
            {/* 요청자 서명 — 화면에서 손으로 그리면 인쇄물에 그대로 찍힌다 */}
            <SignatureField
              label="요청자 서명"
              signId={draft.requesterSign}
              onChange={(id) => patch({ requesterSign: id })}
              disabled={!canWrite || !canUploadPhoto}
            />
          </div>
        </CardContent>
      </Card>

      {/* 조치·재개 */}
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>조치 및 작업재개</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>진행 상태</Label>
            <div className="flex flex-wrap gap-2">
              {STOP_STATUSES.map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={draft.status === st ? "default" : "outline"}
                  disabled={!canWrite}
                  onClick={() => void setStatus(st)}
                >
                  {st}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              위험요소를 제거하기 전에는 작업을 재개하지 않습니다. 재개는 현장확인 후 승인 시에만 누르세요.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>조치결과</Label>
            <Textarea
              rows={3}
              disabled={!canWrite}
              value={draft.result}
              onChange={(e) => patch({ result: e.target.value })}
              placeholder="예) 특별안전교육 미수료 구성원 작업 제외 → 이수자 투입 / 송기마스크 비치"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>작업중지 시각</Label>
              <Input
                disabled={!canWrite}
                type="time"
                value={draft.stoppedAt}
                onChange={(e) => patch({ stoppedAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>작업재개 시각</Label>
              <Input
                disabled={!canWrite}
                type="time"
                value={draft.resumedAt}
                onChange={(e) => patch({ resumedAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>총 작업중지 시간</Label>
              <p className="flex h-8 items-center text-sm tabular-nums">
                {minutes !== null ? `${minutes}분간` : "재개 시각을 넣으면 자동으로 계산됩니다"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>기타사항</Label>
            <Input disabled={!canWrite} value={draft.note} onChange={(e) => patch({ note: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* 작업중지명령서 (현장 게시물) */}
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OctagonAlert className="size-4 text-destructive" /> 작업중지명령서 (현장 게시용)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 lg:col-span-3">
            <Label>작업중지범위</Label>
            <Input
              disabled={!canWrite}
              value={draft.orderScope}
              onChange={(e) => patch({ orderScope: e.target.value })}
              placeholder="비워 두면 작업명이 들어갑니다"
            />
          </div>
          <div className="space-y-1.5">
            <Label>담당자</Label>
            <Input
              disabled={!canWrite}
              list="ras-staff"
              value={draft.orderManager}
              onChange={(e) => patch({ orderManager: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>연락처</Label>
            <Input
              disabled={!canWrite}
              type="tel"
              value={draft.orderPhone}
              onChange={(e) => patch({ orderPhone: e.target.value })}
            />
          </div>
          <p className="self-end pb-2 text-xs text-muted-foreground lg:col-span-1">
            중지 사유는 요청내용을 그대로 씁니다. 노란 게시물로 인쇄됩니다(배경 그래픽 켜기).
          </p>
        </CardContent>
      </Card>

      {/* 현장 사진 */}
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
              disabled={!canWrite || !canUploadPhoto}
            />
          ))}
        </CardContent>
      </Card>

      {/* 위험성평가표로 이관 */}
      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)}>
        <DialogHeader>
          <DialogTitle>이 건을 위험성평가표로 옮길까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          중지 사유가 유해위험요인으로, 조치결과가 개선대책으로 들어갑니다. 옮기면 이 문서는 자동으로 잠깁니다.
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

      {/* 인쇄용 서식 — 고른 한 종류만 렌더한다 */}
      {sheet === "order" ? <StopOrderSheet stopWork={draft} /> : <StopWorkSheet stopWork={draft} />}
    </div>
  );
}
