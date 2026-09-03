import * as React from "react";
import { ArrowLeft, ArrowRightLeft, Images, Plus, Printer, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableWrap,
} from "@/components/ui";
import { CellTextarea, HazardTypeSelect, ProcessSelect } from "@/components/fields";
import { PhotoSlot } from "@/components/photo";
import { InspectionSheet } from "@/print/InspectionSheet";
import { InspectionPhotoSheet, type PhotoLayout } from "@/print/InspectionPhotoSheet";
import { classOfCode, inspectionMoved } from "@/lib/settings";
import { emptyAttendee, emptyInspectionItem, emptyRow, type Inspection, type RiskItem } from "@/lib/types";
import { useStore } from "@/store";

export function InspectionDetail({ inspection, onBack }: { inspection: Inspection; onBack: () => void }) {
  const { assessments, saveAssessment, saveInspection, settings, canEdit, canDelete } = useStore();
  const [draft, setDraft] = React.useState<Inspection>(inspection);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveTargetId, setMoveTargetId] = React.useState("");
  /* 인쇄물이 세 가지라 고른 것만 DOM에 둔다 — 전부 렌더해 두면 한꺼번에 찍힌다
     (.print-root의 display:block !important가 .no-print를 이긴다) */
  const [sheet, setSheet] = React.useState<"form" | PhotoLayout>("form");
  const [printTick, setPrintTick] = React.useState(0);
  React.useEffect(() => {
    if (printTick > 0) window.print();
  }, [printTick]);
  const print = (kind: "form" | PhotoLayout) => {
    setSheet(kind);
    setPrintTick((t) => t + 1);
  };

  // 입력 중에는 로컬 상태로 두고, 멈추면 저장한다 (평가표 상세와 같은 방식)
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void saveInspection(draft), 400);
    return () => clearTimeout(t);
  }, [draft, saveInspection]);

  const patch = (p: Partial<Inspection>) => setDraft((d) => ({ ...d, ...p }));
  const patchItem = (id: string, p: Partial<Inspection["items"][number]>) =>
    setDraft((d) => ({ ...d, items: d.items.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const patchAttendee = (id: string, p: Partial<Inspection["attendees"][number]>) =>
    setDraft((d) => ({ ...d, attendees: d.attendees.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  /** 이관 여부는 저장된 표시가 아니라 '만든 평가표 행이 아직 있는지'로 본다 */
  const isMoved = React.useCallback(
    (it: Inspection["items"][number]) => inspectionMoved(assessments, it.movedTo),
    [assessments],
  );
  /** 아직 안 옮겼고 내용이 있는 항목만 이관 대상이다 */
  const movable = draft.items.filter((it) => it.content.trim() && !isMoved(it));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const moveToAssessment = async () => {
    const target = assessments.find((a) => a.id === moveTargetId);
    if (!target) return;
    const picked = draft.items.filter((it) => selected.has(it.id));
    // 어느 순회점검 항목이 어느 평가표 행이 됐는지 짝을 남긴다 —
    // 그 행이 지워지면 '이관됨' 배지가 풀려야 하기 때문이다
    const pairs = picked.map((it) => {
      const row: RiskItem = {
        ...emptyRow(),
        hazard: it.content,
        hazardCode: it.hazardCode,
        // 코드에서 분류를 역산한다 — 순회점검에는 분류 칸이 없다
        hazardClass: classOfCode(settings, it.hazardCode),
        note: "순회점검",
      };
      return { itemId: it.id, row };
    });
    await saveAssessment({ ...target, rows: [...target.rows, ...pairs.map((p) => p.row)] });
    const at = Date.now();
    const rowIdOf = new Map(pairs.map((p) => [p.itemId, p.row.id]));
    setDraft((d) => ({
      ...d,
      items: d.items.map((x) => {
        const rowId = rowIdOf.get(x.id);
        return rowId ? { ...x, movedTo: { assessmentId: target.id, rowId, at } } : x;
      }),
    }));
    setSelected(new Set());
    setMoveOpen(false);
    setMoveTargetId("");
  };

  const staff = [...settings.staff].sort((a, b) => a.localeCompare(b, "ko"));

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <p className="font-medium">
              {draft.facility || "-"} · {draft.process || "-"}
            </p>
            <p className="text-sm text-muted-foreground">
              발굴 {draft.items.filter((it) => it.content.trim()).length}건 · 점검일자 {draft.date || "-"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            disabled={!canEdit || selected.size === 0}
            onClick={() => setMoveOpen(true)}
            aria-label="위험성평가표로 이관"
            title="선택 항목을 위험성평가표로 이관"
          >
            <ArrowRightLeft />
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => print("1x2")} aria-label="사진대지 1X2 인쇄" title="사진대지 1X2 (한 장에 2건)">
            <Images />
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => print("2x2")} aria-label="사진대지 2X2 인쇄" title="사진대지 2X2 (한 장에 4건)">
            <Images className="scale-90" />
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => print("form")} aria-label="조사표 인쇄" title="순회점검 조사표">
            <Printer />
          </Button>
        </div>
      </div>

      {/* 기본정보 */}
      <Card className="no-print shadow-xs">
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>시설명</Label>
            <Input disabled={!canEdit} value={draft.facility} onChange={(e) => patch({ facility: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>공정명</Label>
            <ProcessSelect value={draft.process} onChange={(v) => patch({ process: v })} disabled={!canEdit} />
          </div>
          <div className="space-y-1.5">
            <Label>점검일자</Label>
            <Input disabled={!canEdit} type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>점검자</Label>
            <Input disabled={!canEdit} value={draft.inspector} onChange={(e) => patch({ inspector: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* 발굴 유해·위험 작업 및 요인 */}
      <Card className="no-print py-0 shadow-xs">
        <CardContent className="p-0">
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH className="w-10 text-center">
                    <Checkbox
                      aria-label="전체 선택"
                      disabled={!canEdit || movable.length === 0}
                      checked={movable.length > 0 && movable.every((it) => selected.has(it.id))}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(movable.map((it) => it.id)) : new Set())
                      }
                    />
                  </TH>
                  <TH className="w-10 text-center">No.</TH>
                  <TH>발굴 유해 · 위험 작업 및 요인</TH>
                  <TH className="w-28">유해위험 유형</TH>
                  <TH className="w-40">사진</TH>
                  <TH className="w-24 text-center">이관</TH>
                  <TH className="w-12" />
                </TR>
              </THead>
              <TBody>
                {draft.items.map((it, i) => (
                  <TR key={it.id}>
                    <TD className="text-center">
                      <Checkbox
                        aria-label={`${i + 1}번 선택`}
                        disabled={!canEdit || !it.content.trim() || isMoved(it)}
                        checked={selected.has(it.id)}
                        onChange={() => toggle(it.id)}
                      />
                    </TD>
                    <TD className="text-center text-muted-foreground tabular-nums">{i + 1}</TD>
                    <TD className="whitespace-normal">
                      <CellTextarea
                        disabled={!canEdit}
                        value={it.content}
                        onChange={(e) => patchItem(it.id, { content: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <HazardTypeSelect
                        disabled={!canEdit}
                        value={it.hazardCode ?? ""}
                        onChange={(e) => patchItem(it.id, { hazardCode: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <PhotoSlot
                        label="순회점검 사진"
                        photoId={it.photo}
                        onChange={(id) => patchItem(it.id, { photo: id })}
                        disabled={!canEdit}
                      />
                    </TD>
                    <TD className="text-center">
                      {isMoved(it) ? (
                        <Badge variant="outline" className="font-normal">
                          이관됨
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TD>
                    <TD>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canDelete}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }))}
                        aria-label="행 삭제"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <div className="flex justify-center border-t p-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canEdit}
              onClick={() => setDraft((d) => ({ ...d, items: [...d.items, emptyInspectionItem()] }))}
              aria-label="발굴 항목 추가"
            >
              <Plus />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 참석자 명단 */}
      <Card className="no-print py-0 shadow-xs">
        <CardContent className="p-0">
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH className="w-10 text-center">No.</TH>
                  <TH className="w-52">소속</TH>
                  <TH>성명</TH>
                  <TH className="w-12" />
                </TR>
              </THead>
              <TBody>
                {draft.attendees.map((a, i) => (
                  <TR key={a.id}>
                    <TD className="text-center text-muted-foreground tabular-nums">{i + 1}</TD>
                    <TD>
                      <Input
                        disabled={!canEdit}
                        className="h-8"
                        value={a.dept}
                        onChange={(e) => patchAttendee(a.id, { dept: e.target.value })}
                        placeholder="예: 운영팀"
                      />
                    </TD>
                    <TD>
                      {/* 직원 명단에서 고른다 — 명단에 없는 이름이 저장돼 있으면 그 값도 남긴다 */}
                      <Select
                        disabled={!canEdit}
                        className="w-full"
                        value={a.name}
                        onChange={(e) => patchAttendee(a.id, { name: e.target.value })}
                      >
                        <option value="">-</option>
                        {(a.name && !staff.includes(a.name) ? [...staff, a.name] : staff).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </Select>
                    </TD>
                    <TD>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canDelete}
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setDraft((d) => ({ ...d, attendees: d.attendees.filter((x) => x.id !== a.id) }))
                        }
                        aria-label="참석자 삭제"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <div className="flex items-center justify-center gap-2 border-t p-2">
            <span className="text-xs text-muted-foreground">
              서명은 인쇄한 뒤 손으로 받습니다 · 설정의 직원 명단에서 고릅니다
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canEdit}
              onClick={() =>
                setDraft((d) => ({ ...d, attendees: [...d.attendees, emptyAttendee(settings.org.dept)] }))
              }
              aria-label="참석자 추가"
            >
              <Plus />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 위험성평가표로 이관 */}
      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)}>
        <DialogHeader>
          <DialogTitle>선택한 {selected.size}건을 위험성평가표로 옮길까요?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            발굴 내용은 <strong>유해위험요인</strong>, 유형은 <strong>위험코드</strong>와 그에 맞는{" "}
            <strong>위험분류</strong>로 들어갑니다. 나머지 칸(세부공정·점수 등)은 평가표에서 채우세요.
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

      {/* 인쇄물 — 고른 한 종류만 렌더한다 */}
      {sheet === "form" ? (
        <InspectionSheet inspection={draft} />
      ) : (
        <InspectionPhotoSheet inspection={draft} layout={sheet} />
      )}
    </div>
  );
}
