import * as React from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input, Label } from "@/components/ui";
import { DEFAULT_SETTINGS, type AppSettings, type ScaleLabel } from "@/lib/settings";
import type { HazardFactor } from "@/lib/types";
import { useStore } from "@/store";

/** 게시용 보고서 서명표의 기본 칸 수 — MonthlyReportSheet의 SIGN_MIN_SLOTS와 같은 값 */
const SIGN_SLOTS = 24;

/** 문자열 목록 편집기 (공정명·조치상태·담당자) */
function ListEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = React.useState("");

  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex h-7 items-center gap-1 rounded-2xl bg-secondary px-2.5 text-xs font-medium text-secondary-foreground"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== item))}
              className="grid size-4 place-content-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`${item} 삭제`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-muted-foreground">항목이 없습니다</span>}
      </div>
      <div className="flex gap-2">
        <Input
          className="max-w-xs"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outline" size="icon" onClick={add} aria-label="항목 추가">
          <Plus />
        </Button>
      </div>
    </div>
  );
}

/** 척도 라벨 편집기 (가능성·중대성) */
function ScaleEditor({ value, onChange }: { value: ScaleLabel[]; onChange: (v: ScaleLabel[]) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {value.map((s) => (
        <div key={s.value} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{s.value}점</Label>
          <Input
            value={s.label}
            onChange={(e) => onChange(value.map((x) => (x.value === s.value ? { ...x, label: e.target.value } : x)))}
          />
        </div>
      ))}
    </div>
  );
}


/**
 * 유해위험요인 분류표 편집기 — 요인구분(번호+이름)과 그 아래 유해위험유형(번호+이름).
 * 원본 서식(SSI-602-06 양식4-1)이 기본값이고, 번호·이름 모두 직접 고칠 수 있다.
 * 요인구분 이름이 곧 위험분류이므로, 이름을 바꾸면 입력 화면 드롭다운도 함께 바뀐다.
 */
function FactorEditor({ value, onChange }: { value: HazardFactor[]; onChange: (v: HazardFactor[]) => void }) {
  const patchFactor = (i: number, p: Partial<HazardFactor>) =>
    onChange(value.map((f, idx) => (idx === i ? { ...f, ...p } : f)));

  return (
    <div className="space-y-3">
      {value.map((f, i) => (
        <div key={i} className="rounded-xl bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            <Input
              className="w-14 text-center"
              value={f.no}
              onChange={(e) => patchFactor(i, { no: e.target.value })}
              aria-label="요인구분 번호"
            />
            <Input
              className="max-w-48"
              value={f.name}
              onChange={(e) => patchFactor(i, { name: e.target.value })}
              aria-label="요인구분 이름 (위험분류)"
              placeholder="예: 기계적"
            />
            <span className="text-xs text-muted-foreground">유형 {f.types.length}개</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label={`${f.name} 요인구분 삭제`}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <div className="mt-2 space-y-1.5 pl-4">
            {f.types.map((t, j) => (
              <div key={j} className="flex items-center gap-2">
                <Input
                  className="w-20 text-center"
                  value={t.code}
                  onChange={(e) =>
                    patchFactor(i, { types: f.types.map((x, k) => (k === j ? { ...x, code: e.target.value } : x)) })
                  }
                  aria-label="유해위험유형 번호"
                />
                <Input
                  className="max-w-md"
                  value={t.label}
                  onChange={(e) =>
                    patchFactor(i, { types: f.types.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })
                  }
                  aria-label="유해위험유형 이름"
                  placeholder="예: 부딪힘"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => patchFactor(i, { types: f.types.filter((_, k) => k !== j) })}
                  aria-label={`${t.code} 유형 삭제`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                // 새 번호는 "요인번호.다음순번"으로 미리 채워 준다
                patchFactor(i, { types: [...f.types, { code: `${f.no}.${f.types.length + 1}`, label: "" }] })
              }
            >
              <Plus /> 유형 추가
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={() => onChange([...value, { no: String(value.length + 1), name: "", types: [] }])}
      >
        <Plus /> 요인구분 추가
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const [saved, setSaved] = React.useState(false);

  const patch = async (p: Partial<AppSettings>) => {
    await updateSettings(p);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mt-1 text-sm text-muted-foreground">
          기관 기본값·목록·위험성 기준을 여기서 바꾸면 앱 전체에 바로 반영됩니다.
        </p>
        {saved && <span className="text-sm text-muted-foreground">저장됨</span>}
      </div>

      {/* 계정 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>계정</CardTitle>
          <CardDescription>
            아이디·비밀번호로 로그인되어 있습니다. 아래 이름·직책은 사이드바 표시와 인쇄물 기본값에만 쓰입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>이름</Label>
            <Input
              value={settings.profile.name}
              onChange={(e) => void patch({ profile: { ...settings.profile, name: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>직책</Label>
            <Input
              value={settings.profile.role}
              onChange={(e) => void patch({ profile: { ...settings.profile, role: e.target.value } })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 기본값 · 조직정보 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>기본값 · 조직정보</CardTitle>
          <CardDescription>
            새 평가표·유해위험정보를 만들 때 자동으로 채워집니다. 기본 소속은 순회점검 참석자 명단에 들어갑니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>기관명</Label>
            <Input
              value={settings.org.orgName}
              onChange={(e) => void patch({ org: { ...settings.org, orgName: e.target.value } })}
              placeholder="○○시 상하수도사업소"
            />
          </div>
          <div className="space-y-1.5">
            <Label>기본 대상시설</Label>
            <Input
              value={settings.org.facility}
              onChange={(e) => void patch({ org: { ...settings.org, facility: e.target.value } })}
              placeholder="○○공공하수처리시설"
            />
          </div>
          <div className="space-y-1.5">
            <Label>기본 소속</Label>
            <Input
              value={settings.org.dept}
              onChange={(e) => void patch({ org: { ...settings.org, dept: e.target.value } })}
              placeholder="○○사업소"
            />
          </div>
        </CardContent>
      </Card>

      {/* 게스트 권한 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>게스트 권한</CardTitle>
          <CardDescription>
            로그인 화면의 &lsquo;게스트로 보기&rsquo;로 들어온 사용자에게 켠 항목만 허용합니다. 설정·백업·복원
            화면과 전체 초기화는 게스트에게 항상 막혀 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {(
            [
              { key: "edit", label: "편집", hint: "항목 추가·수정" },
              { key: "delete", label: "삭제", hint: "행·평가표·유해위험정보 삭제" },
              { key: "photo", label: "사진 첨부", hint: "개선 전·후 사진 업로드·삭제" },
              { key: "survey", label: "설문지 제출", hint: "의견청취 설문지 작성·수정·삭제" },
            ] as const
          ).map((p) => (
            <label key={p.key} className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
              <Checkbox
                checked={settings.permissions[p.key]}
                onChange={(e) => void patch({ permissions: { ...settings.permissions, [p.key]: e.target.checked } })}
              />
              <span>
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-xs text-muted-foreground">{p.hint}</span>
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* 목록 편집 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>목록 편집</CardTitle>
          <CardDescription>
            공정명·조치상태·담당자는 입력 화면의 드롭다운에 나옵니다. 이미 입력된 값은 목록에서 빼도 남아 있습니다.
            위험분류는 아래 &lsquo;유해위험요인 분류표&rsquo;에서 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>공정명</Label>
            <ListEditor
              value={settings.processes}
              onChange={(v) => void patch({ processes: v })}
              placeholder="예: 침사지 설비 점검"
            />
          </div>
          <div className="space-y-2">
            <Label>조치상태</Label>
            <ListEditor value={settings.statuses} onChange={(v) => void patch({ statuses: v })} placeholder="예: 보류" />
          </div>
          <div className="space-y-2">
            <Label>담당자</Label>
            <ListEditor value={settings.owners} onChange={(v) => void patch({ owners: v })} placeholder="예: 김안전" />
          </div>
        </CardContent>
      </Card>

      {/* 유해위험요인 분류표 — 위험분류와 위험코드의 정본 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>유해위험요인 분류표</CardTitle>
          <CardDescription>
            원본 서식(SSI-602-06 양식4-1)에 현장 항목(7.3 교통안전)을 더한 것이 기본값입니다.
            <strong>요인구분 이름이 곧 위험분류</strong>이고, 그 아래 유형 번호가 평가표의{" "}
            <strong>위험코드</strong> 드롭다운에 나옵니다(예: 위험분류 &lsquo;기계적&rsquo; → 1.1~1.6).
            번호·이름 모두 고칠 수 있습니다. 목록에서 빼도 이미 입력된 값은 남아 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FactorEditor value={settings.hazardFactors} onChange={(v) => void patch({ hazardFactors: v })} />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              if (confirm("분류표를 기본값으로 되돌릴까요? 직접 고친 번호·이름은 사라집니다.")) {
                void patch({ hazardFactors: DEFAULT_SETTINGS.hazardFactors });
              }
            }}
          >
            <RotateCcw /> 기본 분류표로 되돌리기
          </Button>
        </CardContent>
      </Card>

      {/* 직원 명단 — 월간 게시용 보고서의 열람 서명표 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>직원 명단 (열람 명단)</CardTitle>
          <CardDescription>
            대시보드의 월간 게시용 보고서 아래쪽 &lsquo;열람 명단&rsquo; 서명표에 들어갑니다. 인쇄할 때 이름
            가나다순으로 정렬되며, {SIGN_SLOTS}명까지는 빈 칸을 채워 표 크기를 고정합니다. 담당자 목록과는 별개입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ListEditor value={settings.staff} onChange={(v) => void patch({ staff: v })} placeholder="예: 김하수" />
          <p className="text-xs text-muted-foreground">현재 {settings.staff.length}명</p>
        </CardContent>
      </Card>

      {/* 위험성 기준 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>위험성 기준</CardTitle>
          <CardDescription>
            고위험군 기준점을 바꾸면 고위험군 목록과 평가코드 자동 부여가 즉시 다시 계산됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>고위험군 기준점 (이 점수 이상)</Label>
            <Input
              type="number"
              min={1}
              max={25}
              className="max-w-28"
              value={settings.risk.threshold}
              onChange={(e) =>
                void patch({
                  risk: { ...settings.risk, threshold: Math.max(1, Number(e.target.value) || DEFAULT_SETTINGS.risk.threshold) },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>가능성(빈도) 척도</Label>
            <ScaleEditor
              value={settings.risk.likelihood}
              onChange={(v) => void patch({ risk: { ...settings.risk, likelihood: v } })}
            />
          </div>
          <div className="space-y-2">
            <Label>중대성(강도) 척도</Label>
            <ScaleEditor
              value={settings.risk.severity}
              onChange={(v) => void patch({ risk: { ...settings.risk, severity: v } })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
