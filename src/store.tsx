import * as React from "react";
import * as db from "@/lib/db";
import { reassignCodes, setRiskThreshold } from "@/lib/risk";
import { emptyAssessment, emptyHazardInfo, type Assessment, type HazardInfo, type RiskItem } from "@/lib/types";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";
import { fetchIdentity, type Identity } from "@/lib/auth";

type Ctx = {
  loading: boolean;
  assessments: Assessment[];
  reload: () => Promise<void>;
  createAssessment: () => Promise<Assessment>;
  saveAssessment: (a: Assessment) => Promise<void>;
  removeAssessment: (id: string) => Promise<void>;
  updateRow: (assessmentId: string, rowId: string, patch: Partial<RiskItem>) => Promise<void>;
  hazardInfos: HazardInfo[];
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  identity: Identity;
  lastBackup: number | null;
  markBackedUp: () => Promise<void>;
  createHazardInfo: () => Promise<HazardInfo>;
  saveHazardInfo: (h: HazardInfo) => Promise<void>;
  removeHazardInfo: (id: string) => Promise<void>;
};

const StoreContext = React.createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [hazardInfos, setHazardInfos] = React.useState<HazardInfo[]>([]);
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [identity, setIdentity] = React.useState<Identity>({
    name: DEFAULT_SETTINGS.profile.name,
    email: "",
    role: DEFAULT_SETTINGS.profile.role,
    authenticated: false,
  });
  const [lastBackup, setLastBackup] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    setAssessments(await db.listAssessments());
    setHazardInfos(await db.listHazardInfos());
    const s = await db.loadSettings();
    setSettings(s);
    setRiskThreshold(s.risk.threshold);
    setLastBackup((await db.getLastBackup()) ?? null);
    const who = await fetchIdentity();
    setIdentity(who ?? { name: s.profile.name, email: "", role: s.profile.role, authenticated: false });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const saveAssessment = React.useCallback(async (a: Assessment) => {
    const withCodes = reassignCodes(a);
    await db.putAssessment(withCodes);
    setAssessments((prev) => {
      const next = prev.some((x) => x.id === withCodes.id)
        ? prev.map((x) => (x.id === withCodes.id ? { ...withCodes, updatedAt: Date.now() } : x))
        : [{ ...withCodes, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
    });
  }, []);

  const createAssessment = React.useCallback(async () => {
    const base = emptyAssessment();
    const a: Assessment = {
      ...base,
      facility: settings.org.facility,
      approver: { ...settings.org.approver },
    };
    await saveAssessment(a);
    return a;
  }, [saveAssessment, settings.org]);

  const removeAssessment = React.useCallback(async (id: string) => {
    await db.deleteAssessment(id);
    setAssessments((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateRow = React.useCallback(
    async (assessmentId: string, rowId: string, patch: Partial<RiskItem>) => {
      setAssessments((prev) => {
        const target = prev.find((a) => a.id === assessmentId);
        if (!target) return prev;
        const updated = reassignCodes({
          ...target,
          rows: target.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
        });
        void db.putAssessment(updated);
        return prev.map((a) => (a.id === assessmentId ? { ...updated, updatedAt: Date.now() } : a));
      });
    },
    [],
  );

  const saveHazardInfo = React.useCallback(async (h: HazardInfo) => {
    await db.putHazardInfo(h);
    setHazardInfos((prev) => {
      const next = prev.some((x) => x.id === h.id)
        ? prev.map((x) => (x.id === h.id ? { ...h, updatedAt: Date.now() } : x))
        : [{ ...h, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
    });
  }, []);

  const createHazardInfo = React.useCallback(async () => {
    const h: HazardInfo = { ...emptyHazardInfo(), facility: settings.org.facility };
    await saveHazardInfo(h);
    return h;
  }, [saveHazardInfo, settings.org]);

  const removeHazardInfo = React.useCallback(async (id: string) => {
    await db.deleteHazardInfo(id);
    setHazardInfos((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateSettings = React.useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch, updatedAt: Date.now() };
      await db.saveSettings(next);
      setSettings(next);
      setRiskThreshold(next.risk.threshold);
      setIdentity((prev) =>
        prev.authenticated ? prev : { ...prev, name: next.profile.name, role: next.profile.role },
      );
    },
    [settings],
  );

  const markBackedUp = React.useCallback(async () => {
    const t = Date.now();
    await db.setLastBackup(t);
    setLastBackup(t);
  }, []);

  const value = React.useMemo(
    () => ({
      loading,
      assessments,
      reload,
      createAssessment,
      saveAssessment,
      removeAssessment,
      updateRow,
      hazardInfos,
      createHazardInfo,
      saveHazardInfo,
      removeHazardInfo,
      settings,
      updateSettings,
      identity,
      lastBackup,
      markBackedUp,
    }),
    [
      loading,
      assessments,
      reload,
      createAssessment,
      saveAssessment,
      removeAssessment,
      updateRow,
      hazardInfos,
      createHazardInfo,
      saveHazardInfo,
      removeHazardInfo,
      settings,
      updateSettings,
      identity,
      lastBackup,
      markBackedUp,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("StoreProvider 안에서만 사용할 수 있습니다");
  return ctx;
}

/** 전체 평가표를 가로질러 고위험군 행을 모은다 */
export type HighRiskEntry = { assessment: Assessment; row: RiskItem };
