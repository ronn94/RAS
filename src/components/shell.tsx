import * as React from "react";
import {
  ClipboardList,
  DatabaseBackup,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PanelLeft,
  Settings2,
  ShieldAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

export type ViewKey = "dashboard" | "assessments" | "highrisk" | "hazardinfo" | "settings" | "backup";

type NavItem = { key: ViewKey; title: string; icon: React.ReactNode };

/** 그룹 라벨이 없는 첫 그룹 + 라벨 그룹들 (인트라넷 셸 관례) */
const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ key: "dashboard", title: "대시보드", icon: <LayoutDashboard /> }] },
  {
    label: "위험성평가",
    items: [
      { key: "assessments", title: "위험성평가 목록", icon: <ListChecks /> },
      { key: "highrisk", title: "고위험군 목록", icon: <ShieldAlert /> },
    ],
  },
  {
    label: "안전정보",
    items: [{ key: "hazardinfo", title: "유해위험정보 목록", icon: <ClipboardList /> }],
  },
];

/** 하단 보조 메뉴 */
const NAV_SECONDARY: NavItem[] = [
  { key: "settings", title: "설정", icon: <Settings2 /> },
  { key: "backup", title: "백업·복원", icon: <DatabaseBackup /> },
];

function NavList({ items, view, onSelect }: { items: NavItem[]; view: ViewKey; onSelect: (v: ViewKey) => void }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          data-active={view === item.key || undefined}
          className="flex h-8 w-full items-center gap-2 overflow-hidden rounded-xl px-3 text-left text-sm whitespace-nowrap outline-hidden transition-[width,height,padding] duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring has-[>svg:first-child]:pl-2.5 data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate"
        >
          {item.icon}
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  );
}

function SidebarInner({
  view,
  onSelect,
  user,
  onLogout,
}: {
  view: ViewKey;
  onSelect: (v: ViewKey) => void;
  user: { name: string; role: string };
  onLogout: () => void;
}) {
  return (
    <div className="flex size-full flex-col bg-sidebar [--radius:var(--radius-xl)]">
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2 rounded-xl p-1.5">
          <div className="grid size-5 shrink-0 place-content-center rounded-md bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
            R
          </div>
          <span className="text-base font-semibold">RAS</span>
        </div>
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto overscroll-contain">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label ?? i} className="relative flex w-full min-w-0 flex-col p-2 py-1">
            {group.label && (
              <div className="flex h-8 shrink-0 items-center rounded-xl px-3 text-xs font-medium text-sidebar-foreground/70">
                {group.label}
              </div>
            )}
            <NavList items={group.items} view={view} onSelect={onSelect} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 p-2">
        <NavList items={NAV_SECONDARY} view={view} onSelect={onSelect} />
        <div className="flex h-12 items-center gap-2 rounded-xl px-3">
          <div className="grid size-8 shrink-0 place-content-center rounded-lg bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-sidebar-foreground/70">{user.role}</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="로그아웃">
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Shell({
  view,
  onSelect,
  title,
  actions,
  user,
  onLogout,
  children,
}: {
  view: ViewKey;
  onSelect: (v: ViewKey) => void;
  title: string;
  actions?: React.ReactNode;
  user: { name: string; role: string };
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className="group/sidebar-wrapper flex min-h-svh w-full bg-sidebar"
      style={{ ["--sidebar-width" as string]: "calc(var(--spacing) * 60)", ["--header-height" as string]: "calc(var(--spacing) * 12)" }}
    >
      {/* 데스크톱 사이드바 (자리 + 고정 패널 2단) */}
      <div className="no-print relative hidden w-(--sidebar-width) bg-transparent md:block" />
      <div className="no-print fixed inset-y-0 left-0 z-10 hidden h-svh w-(--sidebar-width) p-2 md:flex">
        <SidebarInner view={view} onSelect={onSelect} user={user} onLogout={onLogout} />
      </div>

      {/* 모바일 오버레이 사이드바 */}
      {open && (
        <div className="no-print fixed inset-0 z-50 md:hidden" onMouseDown={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 supports-backdrop-filter:backdrop-blur-sm" />
          <div
            className="absolute inset-y-0 left-0 w-[18rem] p-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="relative size-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-foreground/5">
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
              >
                <X />
              </Button>
              <SidebarInner
                view={view}
                onSelect={(v) => {
                  onSelect(v);
                  setOpen(false);
                }}
                user={user}
                onLogout={onLogout}
              />
            </div>
          </div>
        </div>
      )}

      <main
        data-slot="app-main"
        className={cn("relative flex w-full flex-1 flex-col bg-background md:m-2 md:ml-0 md:rounded-2xl md:shadow-sm")}
      >
        <header className="no-print sticky top-0 z-20 h-(--header-height) shrink-0 rounded-t-2xl border-b bg-background/95 supports-backdrop-filter:backdrop-blur">
          <div className="flex h-full w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="메뉴 열기">
              <PanelLeft />
            </Button>
            <h1 className="font-heading truncate text-base font-medium">{title}</h1>
            <div className="ml-auto flex items-center gap-2">{actions}</div>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div data-slot="app-content" className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
