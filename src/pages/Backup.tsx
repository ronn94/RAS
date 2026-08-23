import * as React from "react";
import { Download, Eraser, HardDrive, HardDriveDownload, Trash2, Upload } from "lucide-react";
import {
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
} from "@/components/ui";
import { cleanupOrphanPhotos, exportBackup, importBackup, storageUsage, wipeAll } from "@/lib/db";
import { exportBackup as exportLocalBrowserBackup } from "@/lib/localdb";
import { isHighRisk } from "@/lib/risk";
import { useStore } from "@/store";

const fmtBytes = (n: number) => {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
};

const fmtTime = (t: number | null) =>
  t
    ? new Date(t).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
    : "아직 백업한 적이 없습니다";

export function BackupPage() {
  const { assessments, hazardInfos, reload, lastBackup, markBackedUp } = useStore();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [usage, setUsage] = React.useState({ usage: 0, quota: 0 });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = React.useState(false);
  const [wipeText, setWipeText] = React.useState("");
  const [localCount, setLocalCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    void storageUsage().then(setUsage);
  }, [assessments, hazardInfos]);

  React.useEffect(() => {
    // 이 기기에 3단계 이전(IndexedDB) 데이터가 남아 있는지 조용히 확인한다
    void exportLocalBrowserBackup()
      .then((json) => setLocalCount((JSON.parse(json).assessments ?? []).length))
      .catch(() => setLocalCount(0));
  }, []);

  const rows = assessments.flatMap((a) => a.rows);
  const photos = rows.filter((r) => r.beforePhoto).length + rows.filter((r) => r.afterPhoto).length;
  const stale = lastBackup !== null && Date.now() - lastBackup > 7 * 24 * 60 * 60 * 1000;

  const download = async () => {
    setBusy("백업 파일을 만드는 중…");
    try {
      const json = await exportBackup();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `RAS_백업_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await markBackedUp();
    } finally {
      setBusy(null);
    }
  };

  const restore = async (file: File) => {
    setBusy("복원하는 중…");
    try {
      const n = await importBackup(await file.text());
      await reload();
      alert(`평가표 ${n}건을 복원했습니다. 같은 문서는 백업 내용으로 덮어썼고, 나머지는 그대로 두었습니다.`);
    } catch (e) {
      alert(`백업을 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const stats = [
    { label: "평가표", value: assessments.length },
    { label: "평가 항목", value: rows.length },
    { label: "고위험군", value: rows.filter(isHighRisk).length },
    { label: "유해위험정보", value: hazardInfos.length },
    { label: "첨부 사진", value: photos },
  ];

  const migrateLocal = async () => {
    setBusy("이 브라우저의 예전 데이터를 서버로 옮기는 중…");
    try {
      const json = await exportLocalBrowserBackup();
      const n = await importBackup(json);
      await reload();
      setLocalCount(0);
      alert(`이 브라우저에 남아 있던 평가표 ${n}건을 서버로 옮겼습니다.`);
    } catch (e) {
      alert(`가져오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="mt-1 text-sm text-muted-foreground">
        데이터는 서버(Cloudflare D1·R2)에 저장됩니다. 로그인하면 어느 기기에서도 같은 자료를 보고 수정할 수
        있습니다. 그래도 정기적으로 백업 파일을 내려받아 별도로 보관하세요.
      </p>

      {!!localCount && (
        <Card className="shadow-xs ring-1 ring-ring/30" data-size="sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              이 브라우저에 서버로 옮기지 않은 예전 데이터가 <strong>{localCount}건</strong> 남아 있습니다.
            </p>
            <Button size="icon-sm" onClick={() => void migrateLocal()} disabled={!!busy} aria-label="서버로 옮기기">
              <HardDriveDownload className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {stale && (
        <Card className="shadow-xs ring-1 ring-destructive/20" data-size="sm">
          <CardContent className="text-sm text-destructive">
            마지막 백업이 7일이 넘었습니다. 지금 백업해 두는 것을 권합니다.
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>현재 저장된 내용</CardTitle>
          <CardDescription>마지막 백업: {fmtTime(lastBackup)}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>백업 · 복원</CardTitle>
          <CardDescription>
            사진까지 포함한 JSON 파일 하나로 내려받습니다. 복원은 <strong>병합</strong>이며, 같은 문서는 백업 내용으로
            덮어씁니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void restore(f);
            }}
          />
          <Button size="icon-lg" onClick={() => void download()} disabled={!!busy} aria-label="백업 내려받기">
            <Download />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            aria-label="백업 파일에서 복원"
          >
            <Upload />
          </Button>
          {busy && <span className="text-sm text-muted-foreground">{busy}</span>}
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4" /> 저장소 정리
          </CardTitle>
          <CardDescription>
            사용 중 {fmtBytes(usage.usage)}
            {usage.quota ? ` / 사용 가능 ${fmtBytes(usage.quota)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="연결되지 않은 사진 정리"
            onClick={async () => {
              const n = await cleanupOrphanPhotos();
              await storageUsage().then(setUsage);
              alert(n ? `사용하지 않는 사진 ${n}장을 정리했습니다.` : "정리할 사진이 없습니다.");
            }}
          >
            <Eraser />
          </Button>
          <Button
            variant="destructive"
            size="icon-lg"
            onClick={() => setConfirmWipe(true)}
            aria-label="전체 초기화"
          >
            <Trash2 />
          </Button>
          <span className="text-xs text-muted-foreground">
            정리: 어느 항목에도 연결되지 않은 사진 삭제 · 초기화: 모든 데이터 삭제
          </span>
        </CardContent>
      </Card>

      <Dialog
        open={confirmWipe}
        onClose={() => {
          setConfirmWipe(false);
          setWipeText("");
        }}
      >
        <DialogHeader>
          <DialogTitle>모든 데이터를 지울까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          평가표 {assessments.length}건, 유해위험정보 {hazardInfos.length}건, 사진 {photos}장이 모두 삭제됩니다. 되돌릴
          수 없으니 먼저 백업하세요. 진행하려면 아래에 <strong>초기화</strong>를 입력하세요.
        </p>
        <Input value={wipeText} onChange={(e) => setWipeText(e.target.value)} placeholder="초기화" />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmWipe(false);
              setWipeText("");
            }}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            disabled={wipeText.trim() !== "초기화"}
            onClick={async () => {
              await wipeAll();
              await reload();
              setConfirmWipe(false);
              setWipeText("");
            }}
          >
            전체 삭제
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
