import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { Shell, type ViewKey } from "@/components/shell";
import { AssessmentsPage } from "@/pages/Assessments";
import { HighRiskPage } from "@/pages/HighRisk";
import { HazardInfoPage } from "@/pages/HazardInfo";
import { DashboardPage } from "@/pages/Dashboard";
import { SettingsPage } from "@/pages/Settings";
import { BackupPage } from "@/pages/Backup";
import { LoginPage } from "@/pages/Login";
import { checkAuth, logout as apiLogout } from "@/lib/auth";
import { StoreProvider, useStore } from "@/store";

const TITLES: Record<ViewKey, string> = {
  dashboard: "대시보드",
  assessments: "위험성평가 목록",
  highrisk: "고위험군 목록",
  hazardinfo: "유해위험정보 목록",
  settings: "설정",
  backup: "백업·복원",
};

function Router() {
  const { settings, error, unauthorized, reload } = useStore();
  const [view, setView] = React.useState<ViewKey>("assessments");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const logout = async () => {
    await apiLogout();
    location.reload();
  };

  return (
    <Shell
      view={view}
      onSelect={(v) => {
        setView(v);
        setOpenId(null);
      }}
      title={TITLES[view]}
      user={{ name: settings.profile.name || "관리자", role: settings.profile.role }}
      onLogout={() => void logout()}
    >
      {view === "dashboard" && <DashboardPage onNavigate={setView} />}
      {view === "assessments" && <AssessmentsPage openId={openId} onOpen={setOpenId} />}
      {view === "highrisk" && <HighRiskPage />}
      {view === "hazardinfo" && <HazardInfoPage openId={openId} onOpen={setOpenId} />}
      {view === "settings" && <SettingsPage />}
      {view === "backup" && <BackupPage />}

      {(error || unauthorized) && (
        <div className="no-print fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-2 text-sm text-destructive ring-1 ring-destructive/20">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="truncate">
            {unauthorized ? "로그인이 만료되었습니다." : `서버에 연결하지 못했습니다: ${error}`}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => (unauthorized ? location.reload() : void reload())}
          >
            {unauthorized ? "다시 로그인" : "다시 시도"}
          </Button>
        </div>
      )}
    </Shell>
  );
}

/** 로그인 여부를 한 번 확인하고 통과시킨다. 확인 전에는 아무것도 그리지 않는다. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<"checking" | "in" | "out">("checking");

  React.useEffect(() => {
    let alive = true;
    void checkAuth().then((identity) => {
      if (alive) setState(identity.authenticated ? "in" : "out");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">확인 중…</p>
      </div>
    );
  }

  if (state === "out") return <LoginPage onSuccess={() => setState("in")} />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthGate>
      <StoreProvider>
        <Router />
      </StoreProvider>
    </AuthGate>
  );
}
