import * as React from "react";
import * as db from "@/lib/db";
import { reassignCodes, setRiskThreshold } from "@/lib/risk";
import {
  emptyAssessment,
  emptyHazardInfo,
  emptyInspection,
  emptySurvey,
  type Assessment,
  type HazardInfo,
  type Inspection,
  type RiskItem,
  type Survey,
} from "@/lib/types";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";
import type { Identity } from "@/lib/auth";


type Ctx = {
  loading: boolean;
  error: string | null;
  unauthorized: boolean;
  identity: Identity;
  /** role==="admin" 이거나, 게스트인데 설정에서 해당 권한을 켠 경우 true */
  canEdit: boolean;
  canDelete: boolean;
  canUploadPhoto: boolean;
  assessments: Assessment[];
  reload: () => Promise<void>;
  createAssessment: () => Promise<Assessment>;
  saveAssessment: (a: Assessment) => Promise<void>;
  removeAssessment: (id: string) => Promise<void>;
  updateRow: (assessmentId: string, rowId: string, patch: Partial<RiskItem>) => Promise<void>;
  hazardInfos: HazardInfo[];
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  lastBackup: number | null;
  markBackedUp: () => Promise<void>;
  createHazardInfo: () => Promise<HazardInfo>;
  saveHazardInfo: (h: HazardInfo) => Promise<void>;
  removeHazardInfo: (id: string) => Promise<void>;
  inspections: Inspection[];
  createInspection: () => Promise<Inspection>;
  saveInspection: (v: Inspection) => Promise<void>;
  removeInspection: (id: string) => Promise<void>;
  surveys: Survey[];
  createSurvey: () => Survey;
  saveSurvey: (v: Survey) => Promise<void>;
  removeSurvey: (id: string) => Promise<void>;
  /** 게스트가 설문지를 쓸 수 있는가 (관리자는 항상 true) */
  canSurvey: boolean;
};

const StoreContext = React.createContext<Ctx | null>(null);

export function StoreProvider({ identity, children }: { identity: Identity; children: React.ReactNode }) {
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [hazardInfos, setHazardInfos] = React.useState<HazardInfo[]>([]);
  const [inspections, setInspections] = React.useState<Inspection[]>([]);
  const [surveys, setSurveys] = React.useState<Survey[]>([]);
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastBackup, setLastBackup] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [unauthorized, setUnauthorized] = React.useState(false);

  const reload = React.useCallback(async () => {
    try {
      setAssessments(await db.listAssessments());
      setHazardInfos(await db.listHazardInfos());
      setInspections(await db.listInspections());
      setSurveys(await db.listSurveys());
      const s = await db.loadSettings();
      setSettings(s);
      setRiskThreshold(s.risk.threshold);
      setLastBackup((await db.getLastBackup()) ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "서버에 연결하지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    // 세션이 끊기면(쿠키 만료 등) db.ts가 여기로 알려준다 — 로그인 화면으로 되돌린다
    db.setOnUnauthorized(() => setUnauthorized(true));
    return () => db.setOnUnauthorized(null);
  }, []);

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

  const saveInspection = React.useCallback(async (v: Inspection) => {
    await db.putInspection(v);
    setInspections((prev) => {
      const next = prev.some((x) => x.id === v.id)
        ? prev.map((x) => (x.id === v.id ? { ...v, updatedAt: Date.now() } : x))
        : [{ ...v, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
    });
  }, []);

  const createInspection = React.useCallback(async () => {
    const v: Inspection = { ...emptyInspection(settings.org.dept), facility: settings.org.facility };
    await saveInspection(v);
    return v;
  }, [saveInspection, settings.org]);

  const removeInspection = React.useCallback(async (id: string) => {
    await db.deleteInspection(id);
    setInspections((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const saveSurvey = React.useCallback(async (v: Survey) => {
    await db.putSurvey(v);
    setSurveys((prev) => {
      const next = prev.some((x) => x.id === v.id)
        ? prev.map((x) => (x.id === v.id ? { ...v, updatedAt: Date.now() } : x))
        : [{ ...v, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
    });
  }, []);

  /** 새 설문지는 화면에서만 만든다 — '제출'을 눌러야 saveSurvey로 서버에 등록된다 */
  const createSurvey = React.useCallback(() => emptySurvey(), []);

  const removeSurvey = React.useCallback(async (id: string) => {
    await db.deleteSurvey(id);
    setSurveys((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateSettings = React.useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch, updatedAt: Date.now() };
      await db.saveSettings(next);
      setSettings(next);
      setRiskThreshold(next.risk.threshold);
    },
    [settings],
  );

  const markBackedUp = React.useCallback(async () => {
    const t = Date.now();
    await db.setLastBackup(t);
    setLastBackup(t);
  }, []);

  const isAdmin = identity.role === "admin";
  const canEdit = isAdmin || settings.permissions.edit;
  const canDelete = isAdmin || settings.permissions.delete;
  const canUploadPhoto = isAdmin || settings.permissions.photo || settings.permissions.survey;
  const canSurvey = isAdmin || settings.permissions.survey;

  const value = React.useMemo(
    () => ({
      loading,
      error,
      unauthorized,
      identity,
      canEdit,
      canDelete,
      canUploadPhoto,
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
      inspections,
      createInspection,
      saveInspection,
      removeInspection,
      surveys,
      createSurvey,
      saveSurvey,
      removeSurvey,
      canSurvey,
      settings,
      updateSettings,
      lastBackup,
      markBackedUp,
    }),
    [
      loading,
      error,
      unauthorized,
      identity,
      canEdit,
      canDelete,
      canUploadPhoto,
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
      inspections,
      createInspection,
      saveInspection,
      removeInspection,
      surveys,
      createSurvey,
      saveSurvey,
      removeSurvey,
      canSurvey,
      settings,
      updateSettings,
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
