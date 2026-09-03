import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { Shell, type ViewKey } from "@/components/shell";
import { AssessmentsPage } from "@/pages/Assessments";
import { HighRiskPage } from "@/pages/HighRisk";
import { HazardInfoPage } from "@/pages/HazardInfo";
import { InspectionsPage } from "@/pages/Inspections";
import { DashboardPage } from "@/pages/Dashboard";
import { SettingsPage } from "@/pages/Settings";
import { BackupPage } from "@/pages/Backup";
import { LoginPage } from "@/pages/Login";
import { checkAuth, logout as apiLogout, type Identity } from "@/lib/auth";
import { StoreProvider, useStore } from "@/store";

const TITLES: Record<ViewKey, string> = {
  dashboard: "대시보드",
  assessments: "위험성평가 목록",
  highrisk: "고위험군 목록",
  hazardinfo: "유해위험정보 목록",
  inspections: "순회점검 목록",
  settings: "설정",
  backup: "백업·복원",
};

/** 관리자 전용 화면 — 게스트가 직접 상태를 조작해도 여기서 막는다 */
const ADMIN_ONLY_VIEWS = new Set<ViewKey>(["settings", "backup"]);

function Router({ identity }: { identity: Identity }) {
  const { settings, error, unauthorized, reload } = useStore();
  const [view, setView] = React.useState<ViewKey>("assessments");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const isAdmin = identity.role === "admin";
  const activeView = !isAdmin && ADMIN_ONLY_VIEWS.has(view) ? "assessments" : view;

  const logout = async () => {
    await apiLogout();
    location.reload();
  };

  const displayName = identity.role === "guest" ? "게스트" : settings.profile.name || "관리자";
  const displayRole = identity.role === "guest" ? "보기 전용" : settings.profile.role;

  return (
    <Shell
      view={activeView}
      onSelect={(v) => {
        if (!isAdmin && ADMIN_ONLY_VIEWS.has(v)) return;
        setView(v);
        setOpenId(null);
      }}
      title={TITLES[activeView]}
      user={{ name: displayName, role: displayRole }}
      onLogout={() => void logout()}
      hiddenViews={isAdmin ? undefined : ADMIN_ONLY_VIEWS}
    >
      {activeView === "dashboard" && <DashboardPage onNavigate={setView} />}
      {activeView === "assessments" && <AssessmentsPage openId={openId} onOpen={setOpenId} />}
      {activeView === "highrisk" && <HighRiskPage />}
      {activeView === "hazardinfo" && <HazardInfoPage openId={openId} onOpen={setOpenId} />}
      {activeView === "inspections" && <InspectionsPage openId={openId} onOpen={setOpenId} />}
      {isAdmin && activeView === "settings" && <SettingsPage />}
      {isAdmin && activeView === "backup" && <BackupPage />}

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

type AuthState = { status: "checking" } | { status: "out" } | { status: "in"; identity: Identity };

export default function App() {
  const [state, setState] = React.useState<AuthState>({ status: "checking" });

  React.useEffect(() => {
    let alive = true;
    void checkAuth().then((who) => {
      if (!alive) return;
      setState(who.authenticated ? { status: "in", identity: who } : { status: "out" });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">확인 중…</p>
      </div>
    );
  }

  if (state.status === "out") {
    return (
      <LoginPage
        onSuccess={() => void checkAuth().then((who) => setState(who.authenticated ? { status: "in", identity: who } : { status: "out" }))}
      />
    );
  }

  return (
    <StoreProvider identity={state.identity}>
      <Router identity={state.identity} />
    </StoreProvider>
  );
}
