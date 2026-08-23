import * as React from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Printer, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
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
import { CellInput, ProcessSelect } from "@/components/fields";
import { HazardInfoSheet } from "@/print/HazardInfoSheet";
import { emptyStep, type HazardExtra, type HazardInfo, type YesNo } from "@/lib/types";
import { useStore } from "@/store";

function YesNoSelect({ value, onChange }: { value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <Select className="w-24" value={value} onChange={(e) => onChange(e.target.value as YesNo)}>
      <option value="">선택</option>
      <option value="무">무</option>
      <option value="유">유</option>
    </Select>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">◆ {title}</div>
      <div className="flex flex-wrap items-center gap-2 pl-4">{children}</div>
    </div>
  );
}

function Chk({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function HazardInfoDetail({ info, onBack }: { info: HazardInfo; onBack: () => void }) {
  const { saveHazardInfo, assessments, canEdit, canDelete } = useStore();
  const [draft, setDraft] = React.useState<HazardInfo>(info);

  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void saveHazardInfo(draft), 400);
    return () => clearTimeout(t);
  }, [draft, saveHazardInfo]);

  const patch = (p: Partial<HazardInfo>) => setDraft((d) => ({ ...d, ...p }));
  const patchExtra = (p: Partial<HazardExtra>) => setDraft((d) => ({ ...d, extra: { ...d.extra, ...p } }));
  const patchStep = (id: string, p: Partial<(typeof draft.steps)[number]>) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...p } : s)) }));

  const addStep = () => setDraft((d) => ({ ...d, steps: [...d.steps, emptyStep()] }));
  const removeStep = (id: string) => setDraft((d) => ({ ...d, steps: d.steps.filter((s) => s.id !== id) }));
  const moveStep = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const i = d.steps.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.steps.length) return d;
      const steps = [...d.steps];
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return { ...d, steps };
    });

  const linkAssessment = (id: string) => {
    if (!id) {
      patch({ assessmentId: null });
      return;
    }
    const a = assessments.find((x) => x.id === id);
    if (!a) return;
    patch({ assessmentId: id, facility: a.facility, process: a.process });
  };

  const e = draft.extra;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="목록으로">
            <ArrowLeft />
          </Button>
          <div>
            <div className="font-heading text-base font-medium">
              {draft.facility || "대상시설 미입력"} · {draft.process || "공정명 미입력"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              공정(작업)순서 {draft.steps.length}단계 · 작성일 {draft.date || "-"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon-lg" onClick={() => window.print()} aria-label="인쇄 · PDF">
            <Printer />
          </Button>
          <Button
            size="icon-lg"
            disabled={!canEdit}
            onClick={addStep}
            aria-label="행 추가"
            title={canEdit ? undefined : "보기 전용 계정입니다"}
          >
            <Plus />
          </Button>
        </div>
      </div>

      {/* 문서 정보 */}
      <Card className="no-print shadow-xs">
        <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>연동 평가표</Label>
            <Select
              className="w-full"
              disabled={!canEdit}
              value={draft.assessmentId ?? ""}
              onChange={(ev) => linkAssessment(ev.target.value)}
            >
              <option value="">연동 안 함 (직접 입력)</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.facility || "시설 미입력"} · {a.process || "공정 미입력"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>대상시설</Label>
            <Input disabled={!canEdit} value={draft.facility} onChange={(ev) => patch({ facility: ev.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>공정명</Label>
            <ProcessSelect value={draft.process} onChange={(v) => patch({ process: v })} disabled={!canEdit} />
          </div>
          <div className="space-y-1.5">
            <Label>작성일</Label>
            <Input disabled={!canEdit} type="date" value={draft.date} onChange={(ev) => patch({ date: ev.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* 공정(작업)순서 표 */}
      <Card className="no-print py-0 shadow-xs">
        <CardContent className="p-0">
          <TableWrap className="scroll-slim max-h-[calc(100svh-28rem)] min-h-48 overflow-auto">
            <Table className="min-w-[900px] [&_:is(th,td)]:px-2">
              <THead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                <TR className="hover:bg-transparent">
                  <TH className="w-12 text-center">순서</TH>
                  <TH className="w-56">공정(작업)순서</TH>
                  <TH className="w-48">기계·기구 및 설비명</TH>
                  <TH className="w-20 text-center">수량</TH>
                  <TH className="w-48">화학물질명</TH>
                  <TH className="w-28 text-center">취급량/일</TH>
                  <TH className="w-28 text-center">취급시간</TH>
                  <TH className="w-24" />
                </TR>
              </THead>
              <TBody>
                {draft.steps.map((s, i) => (
                  <TR key={s.id} className="align-top">
                    <TD className="text-center tabular-nums text-muted-foreground">{i + 1}</TD>
                    <TD className="whitespace-normal">
                      <CellInput disabled={!canEdit} value={s.order} onChange={(ev) => patchStep(s.id, { order: ev.target.value })} />
                    </TD>
                    <TD>
                      <CellInput
                        disabled={!canEdit}
                        value={s.equipName}
                        onChange={(ev) => patchStep(s.id, { equipName: ev.target.value })}
                      />
                    </TD>
                    <TD>
                      <CellInput
                        disabled={!canEdit}
                        className="text-center"
                        value={s.equipQty}
                        onChange={(ev) => patchStep(s.id, { equipQty: ev.target.value })}
                      />
                    </TD>
                    <TD>
                      <CellInput
                        disabled={!canEdit}
                        value={s.chemName}
                        onChange={(ev) => patchStep(s.id, { chemName: ev.target.value })}
                      />
                    </TD>
                    <TD>
                      <CellInput
                        disabled={!canEdit}
                        className="text-center"
                        value={s.chemAmount}
                        onChange={(ev) => patchStep(s.id, { chemAmount: ev.target.value })}
                      />
                    </TD>
                    <TD>
                      <CellInput
                        disabled={!canEdit}
                        className="text-center"
                        value={s.chemTime}
                        onChange={(ev) => patchStep(s.id, { chemTime: ev.target.value })}
                      />
                    </TD>
                    <TD>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon-sm" disabled={!canEdit} onClick={() => moveStep(s.id, -1)} aria-label="위로">
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" disabled={!canEdit} onClick={() => moveStep(s.id, 1)} aria-label="아래로">
                          <ChevronDown className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canDelete}
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeStep(s.id)}
                          aria-label="삭제"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </CardContent>
      </Card>

      <div className="no-print flex justify-center">
        <Button variant="outline" size="icon-lg" disabled={!canEdit} onClick={addStep} aria-label="행 추가">
          <Plus />
        </Button>
      </div>

      {/* 그 밖의 유해위험정보 */}
      <Card className="no-print shadow-xs">
        <CardHeader>
          <CardTitle>그 밖의 유해위험정보 (유/무 Check)</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!canEdit} className="space-y-4">
          <Group title="3년간 재해발생 사례">
            <YesNoSelect value={e.accident3y.flag} onChange={(v) => patchExtra({ accident3y: { ...e.accident3y, flag: v } })} />
            <Input
              className="max-w-md flex-1"
              placeholder="재해내용"
              value={e.accident3y.detail}
              onChange={(ev) => patchExtra({ accident3y: { ...e.accident3y, detail: ev.target.value } })}
            />
          </Group>

          <Group title="아차사고 사례">
            <YesNoSelect value={e.nearMiss.flag} onChange={(v) => patchExtra({ nearMiss: { ...e.nearMiss, flag: v } })} />
            <Input
              className="max-w-md flex-1"
              placeholder="사례내용"
              value={e.nearMiss.detail}
              onChange={(ev) => patchExtra({ nearMiss: { ...e.nearMiss, detail: ev.target.value } })}
            />
          </Group>

          <Group title="교대작업 유무">
            <Select
              className="w-40"
              value={e.shiftWork}
              onChange={(ev) => patchExtra({ shiftWork: ev.target.value as HazardExtra["shiftWork"] })}
            >
              <option value="">선택</option>
              <option value="유">교대작업 유</option>
              <option value="무">교대작업 무</option>
            </Select>
          </Group>

          <Group title="근로자 구성 및 경력 특성">
            <Chk label="여성근로자" checked={e.workers.female} onChange={(v) => patchExtra({ workers: { ...e.workers, female: v } })} />
            <Chk label="1년 미만 미숙련자" checked={e.workers.novice} onChange={(v) => patchExtra({ workers: { ...e.workers, novice: v } })} />
            <Chk label="고령근로자" checked={e.workers.elderly} onChange={(v) => patchExtra({ workers: { ...e.workers, elderly: v } })} />
            <Chk label="비정규직 근로자" checked={e.workers.irregular} onChange={(v) => patchExtra({ workers: { ...e.workers, irregular: v } })} />
            <Chk label="외국인 근로자" checked={e.workers.foreign} onChange={(v) => patchExtra({ workers: { ...e.workers, foreign: v } })} />
            <Chk label="장애근로자" checked={e.workers.disabled} onChange={(v) => patchExtra({ workers: { ...e.workers, disabled: v } })} />
          </Group>

          <Group title="운반수단">
            <Chk label="기계" checked={e.transport.machine} onChange={(v) => patchExtra({ transport: { ...e.transport, machine: v } })} />
            <Input
              className="max-w-xs"
              value={e.transport.machineNote}
              onChange={(ev) => patchExtra({ transport: { ...e.transport, machineNote: ev.target.value } })}
            />
            <Chk label="인력" checked={e.transport.manual} onChange={(v) => patchExtra({ transport: { ...e.transport, manual: v } })} />
            <Input
              className="max-w-xs"
              value={e.transport.manualNote}
              onChange={(ev) => patchExtra({ transport: { ...e.transport, manualNote: ev.target.value } })}
            />
          </Group>

          <Group title="중량물 인력취급시 단위중량(12kg) 및 취급형태">
            <Chk label="들기" checked={e.heavyLoad.lift} onChange={(v) => patchExtra({ heavyLoad: { ...e.heavyLoad, lift: v } })} />
            <Chk label="밀기" checked={e.heavyLoad.push} onChange={(v) => patchExtra({ heavyLoad: { ...e.heavyLoad, push: v } })} />
            <Chk label="끌기" checked={e.heavyLoad.pull} onChange={(v) => patchExtra({ heavyLoad: { ...e.heavyLoad, pull: v } })} />
          </Group>

          <Group title="안전작업계획·허가서 필요작업 유무">
            <Chk
              label="작업계획·허가서"
              checked={e.permit.required}
              onChange={(v) => patchExtra({ permit: { ...e.permit, required: v, none: v ? false : e.permit.none } })}
            />
            <Chk
              label="해당없음"
              checked={e.permit.none}
              onChange={(v) => patchExtra({ permit: { ...e.permit, none: v, required: v ? false : e.permit.required } })}
            />
            <Input
              className="max-w-md flex-1"
              placeholder="EX) 하역운반기계, 중량물취급계획서"
              value={e.permit.note}
              onChange={(ev) => patchExtra({ permit: { ...e.permit, note: ev.target.value } })}
            />
          </Group>

          <Group title="작업환경측정">
            <Select
              className="w-40"
              value={e.envMeasure}
              onChange={(ev) => patchExtra({ envMeasure: ev.target.value as HazardExtra["envMeasure"] })}
            >
              <option value="">선택</option>
              <option value="측정">측정</option>
              <option value="미측정">미측정</option>
              <option value="해당없음">해당없음</option>
            </Select>
          </Group>

          <Group title="작업에 대한 특별안전교육 필요">
            <YesNoSelect value={e.specialEdu.flag} onChange={(v) => patchExtra({ specialEdu: { ...e.specialEdu, flag: v } })} />
            <Input
              className="max-w-md flex-1"
              placeholder="대상항목"
              value={e.specialEdu.detail}
              onChange={(ev) => patchExtra({ specialEdu: { ...e.specialEdu, detail: ev.target.value } })}
            />
          </Group>
          </fieldset>
        </CardContent>
      </Card>

      {/* 인쇄용 서식 (화면에서는 숨김) */}
      <HazardInfoSheet info={draft} />
    </div>
  );
}
