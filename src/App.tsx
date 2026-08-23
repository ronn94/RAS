import * as React from "react";
import { Shell, type ViewKey } from "@/components/shell";
import { AssessmentsPage } from "@/pages/Assessments";
import { HighRiskPage } from "@/pages/HighRisk";
import { HazardInfoPage } from "@/pages/HazardInfo";
import { DashboardPage } from "@/pages/Dashboard";
import { SettingsPage } from "@/pages/Settings";
import { BackupPage } from "@/pages/Backup";
import { LOGOUT_URL } from "@/lib/auth";
import { StoreProvider, useStore } from "@/store";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

const TITLES: Record<ViewKey, string> = {
  dashboard: "대시보드",
  assessments: "위험성평가 목록",
  highrisk: "고위험군 목록",
  hazardinfo: "유해위험정보 목록",
  settings: "설정",
  backup: "백업·복원",
};

function Router() {
  const { identity, error, reload } = useStore();
  const [view, setView] = React.useState<ViewKey>("assessments");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const logout = () => {
    if (identity.authenticated) {
      window.location.href = LOGOUT_URL;
      return;
    }
    alert("로그인 없이 사용 중입니다. 배포 후 Cloudflare Access를 연결하면 로그아웃이 동작합니다.");
  };

  return (
    <Shell
      view={view}
      onSelect={(v) => {
        setView(v);
        setOpenId(null);
      }}
      title={TITLES[view]}
      user={{ name: identity.name, role: identity.role }}
      onLogout={logout}
    >
      {view === "dashboard" && <DashboardPage onNavigate={setView} />}
      {view === "assessments" && <AssessmentsPage openId={openId} onOpen={setOpenId} />}
      {view === "highrisk" && <HighRiskPage />}
      {view === "hazardinfo" && <HazardInfoPage openId={openId} onOpen={setOpenId} />}
      {view === "settings" && <SettingsPage />}
      {view === "backup" && <BackupPage />}

      {error && (
        <div className="no-print fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-2 text-sm text-destructive ring-1 ring-destructive/20">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="truncate">서버에 연결하지 못했습니다: {error}</span>
          <Button variant="destructive" size="sm" onClick={() => void reload()}>
            다시 시도
          </Button>
        </div>
      )}
    </Shell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
