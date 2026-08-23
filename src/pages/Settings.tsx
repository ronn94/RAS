import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { DEFAULT_SETTINGS, type AppSettings, type ScaleLabel } from "@/lib/settings";
import { useStore } from "@/store";

/** 문자열 목록 편집기 (위험분류·조치상태·담당자) */
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

export function SettingsPage() {
  const { settings, updateSettings, identity } = useStore();
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
            {identity.authenticated
              ? `Cloudflare Access로 로그인되어 있습니다 · ${identity.email}`
              : "현재 로그인 없이 사용 중입니다. 배포 후 Cloudflare Access를 연결하면 실제 계정으로 바뀝니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>이름</Label>
            <Input
              value={settings.profile.name}
              disabled={identity.authenticated}
              onChange={(e) => void patch({ profile: { ...settings.profile, name: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>직책</Label>
            <Input
              value={settings.profile.role}
              disabled={identity.authenticated}
              onChange={(e) => void patch({ profile: { ...settings.profile, role: e.target.value } })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 기본값 · 조직정보 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>기본값 · 조직정보</CardTitle>
          <CardDescription>새 평가표·유해위험정보를 만들 때 자동으로 채워지고, 인쇄물 결재란에 쓰입니다.</CardDescription>
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
            <Label>담당</Label>
            <Input
              value={settings.org.approver.charge}
              onChange={(e) =>
                void patch({ org: { ...settings.org, approver: { ...settings.org.approver, charge: e.target.value } } })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>검토</Label>
            <Input
              value={settings.org.approver.review}
              onChange={(e) =>
                void patch({ org: { ...settings.org, approver: { ...settings.org.approver, review: e.target.value } } })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>승인</Label>
            <Input
              value={settings.org.approver.approve}
              onChange={(e) =>
                void patch({ org: { ...settings.org, approver: { ...settings.org.approver, approve: e.target.value } } })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 목록 편집 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>목록 편집</CardTitle>
          <CardDescription>
            공정명·위험분류·조치상태는 입력 화면의 드롭다운에 나옵니다. 이미 입력된 값은 목록에서 빼도 남아 있습니다.
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
            <Label>위험분류</Label>
            <ListEditor
              value={settings.hazardClasses}
              onChange={(v) => void patch({ hazardClasses: v })}
              placeholder="예: 방사선"
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
