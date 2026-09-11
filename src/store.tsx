import * as React from "react";
import * as db from "@/lib/db";
import { reassignCodes, setRiskThreshold } from "@/lib/risk";
import {
  emptyAssessment,
  emptyHazardInfo,
  emptyInspection,
  emptyPriorityAction,
  emptyStopWork,
  emptySurvey,
  emptyTraining,
  nextDocNo,
  type Assessment,
  type HazardInfo,
  type Inspection,
  type PriorityAction,
  type RiskItem,
  type StopWork,
  type Survey,
  type Training,
  type TrainingKind,
} from "@/lib/types";
import { emptyAnnualPlan, copyPlanForYear, type AnnualPlan } from "@/lib/annualPlan";
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
  stopWorks: StopWork[];
  createStopWork: () => StopWork;
  saveStopWork: (v: StopWork) => Promise<void>;
  removeStopWork: (id: string) => Promise<void>;
  /** 게스트가 작업중지 요청서를 낼 수 있는가 (관리자는 항상 true) */
  canStopWork: boolean;
  priorityActions: PriorityAction[];
  createPriorityAction: () => PriorityAction;
  savePriorityAction: (v: PriorityAction) => Promise<void>;
  removePriorityAction: (id: string) => Promise<void>;
  trainings: Training[];
  createTraining: (kind: TrainingKind) => Training;
  saveTraining: (v: Training) => Promise<void>;
  removeTraining: (id: string) => Promise<void>;
  /** 참석자 한 명의 서명만 바꾼다 — 게스트도 할 수 있는 유일한 쓰기다 */
  signTraining: (id: string, attendeeId: string, image: string | null) => Promise<Training>;
  annualPlans: AnnualPlan[];
  /** 그 해 계획표를 만든다 — 지난해 것이 있으면 계획·대상·목표를 그대로 가져온다 */
  createAnnualPlan: (year: number) => AnnualPlan;
  saveAnnualPlan: (v: AnnualPlan) => Promise<void>;
  removeAnnualPlan: (id: string) => Promise<void>;
};

/* ── 이관으로 묶인 항목 동기화 ────────────────────────────────
   작업중지권을 위험성평가표로 이관하면 둘은 **같은 사건**이다. 한쪽만 고치면
   근거가 어긋나므로 양쪽을 함께 맞춘다(사진은 복사하지 않고 같은 id를 공유한다).

   되먹임(무한 저장)이 나지 않도록 규칙이 둘 있다:
   1) 동기화는 saveX를 다시 부르지 않고 db에 직접 쓴다 — 서로를 호출하면 끝없이 돈다
   2) 값이 실제로 달라졌을 때만 쓴다 — 같은 값이면 아무것도 하지 않는다 */

/** 평가표 행 → 작업중지권. 바뀔 게 없으면 null */
function stopWorkFromRow(v: StopWork, row: RiskItem): StopWork | null {
  const next: StopWork = {
    ...v,
    subProcess: row.subProcess,
    reason: row.hazard,
    result: row.measure,
    orderManager: row.owner || v.orderManager,
    photos: [row.beforePhoto ?? "", row.afterPhoto ?? ""],
  };
  const same =
    next.subProcess === v.subProcess &&
    next.reason === v.reason &&
    next.result === v.result &&
    next.orderManager === v.orderManager &&
    next.photos[0] === (v.photos[0] ?? "") &&
    next.photos[1] === (v.photos[1] ?? "");
  return same ? null : next;
}

/** 작업중지권 → 평가표 행. 바뀔 게 없으면 null */
function rowFromStopWork(row: RiskItem, v: StopWork): RiskItem | null {
  const next: RiskItem = {
    ...row,
    subProcess: v.subProcess,
    hazard: v.reason,
    measure: v.result,
    owner: v.orderManager || row.owner,
    beforePhoto: v.photos[0] || undefined,
    afterPhoto: v.photos[1] || undefined,
  };
  const same =
    next.subProcess === row.subProcess &&
    next.hazard === row.hazard &&
    next.measure === row.measure &&
    next.owner === row.owner &&
    next.beforePhoto === row.beforePhoto &&
    next.afterPhoto === row.afterPhoto;
  return same ? null : next;
}

/** 평가표 행 → 설문지. 바뀔 게 없으면 null */
function surveyFromRow(v: Survey, row: RiskItem): Survey | null {
  const next: Survey = {
    ...v,
    subProcess: row.subProcess,
    hazardClass: row.hazardClass || v.hazardClass,
    hazardCode: row.hazardCode || v.hazardCode,
    hazard: row.hazard,
    p: row.p,
    s: row.s,
    measure: row.measure,
    dueDate: row.dueDate,
    photos: [row.beforePhoto ?? "", row.afterPhoto ?? ""].filter(Boolean),
  };
  const same =
    next.subProcess === v.subProcess &&
    next.hazardClass === v.hazardClass &&
    next.hazardCode === v.hazardCode &&
    next.hazard === v.hazard &&
    next.p === v.p &&
    next.s === v.s &&
    next.measure === v.measure &&
    next.dueDate === v.dueDate &&
    next.photos[0] === (v.photos[0] ?? "") &&
    next.photos[1] === (v.photos[1] ?? "");
  return same ? null : next;
}

/** 설문지 → 평가표 행. 바뀔 게 없으면 null */
function rowFromSurvey(row: RiskItem, v: Survey): RiskItem | null {
  const next: RiskItem = {
    ...row,
    subProcess: v.subProcess,
    hazardClass: v.hazardClass || row.hazardClass,
    hazardCode: v.hazardCode || row.hazardCode,
    hazard: v.hazard,
    p: v.p,
    s: v.s,
    measure: v.measure,
    dueDate: v.dueDate,
    beforePhoto: v.photos[0] || undefined,
    afterPhoto: v.photos[1] || undefined,
  };
  const same =
    next.subProcess === row.subProcess &&
    next.hazardClass === row.hazardClass &&
    next.hazardCode === row.hazardCode &&
    next.hazard === row.hazard &&
    next.p === row.p &&
    next.s === row.s &&
    next.measure === row.measure &&
    next.dueDate === row.dueDate &&
    next.beforePhoto === row.beforePhoto &&
    next.afterPhoto === row.afterPhoto;
  return same ? null : next;
}

const StoreContext = React.createContext<Ctx | null>(null);

export function StoreProvider({ identity, children }: { identity: Identity; children: React.ReactNode }) {
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [hazardInfos, setHazardInfos] = React.useState<HazardInfo[]>([]);
  const [inspections, setInspections] = React.useState<Inspection[]>([]);
  const [surveys, setSurveys] = React.useState<Survey[]>([]);
  const [stopWorks, setStopWorks] = React.useState<StopWork[]>([]);
  const [priorityActions, setPriorityActions] = React.useState<PriorityAction[]>([]);
  const [trainings, setTrainings] = React.useState<Training[]>([]);
  const [annualPlans, setAnnualPlans] = React.useState<AnnualPlan[]>([]);
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastBackup, setLastBackup] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [unauthorized, setUnauthorized] = React.useState(false);
  /** 저장 콜백 안에서 최신 목록을 보기 위한 참조 — 의존성 배열이 늘어나 콜백이 매번 새로 만들어지는 것을 막는다 */
  const stopWorksRef = React.useRef<StopWork[]>([]);
  stopWorksRef.current = stopWorks;
  const surveysRef = React.useRef<Survey[]>([]);
  surveysRef.current = surveys;
  const assessmentsRef = React.useRef<Assessment[]>([]);
  assessmentsRef.current = assessments;

  const reload = React.useCallback(async () => {
    try {
      setAssessments(await db.listAssessments());
      setHazardInfos(await db.listHazardInfos());
      setInspections(await db.listInspections());
      setSurveys(await db.listSurveys());
      setStopWorks(await db.listStopWorks());
      setPriorityActions(await db.listPriorityActions());
      setTrainings(await db.listTrainings());
      setAnnualPlans(await db.listAnnualPlans());
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

  /** 평가표에서 바뀐 내용을 이관된 작업중지권 문서에 밀어 넣는다 */
  const syncStopWorksFrom = React.useCallback(async (a: Assessment) => {
    const linked = stopWorksRef.current.filter((v) => v.movedTo?.assessmentId === a.id);
    for (const v of linked) {
      const row = a.rows.find((r) => r.id === v.movedTo?.rowId);
      if (!row) continue; // 행을 지웠으면 '이관됨'이 저절로 풀린다 — 손대지 않는다
      const next = stopWorkFromRow(v, row);
      if (!next) continue;
      await db.putStopWork(next);
      setStopWorks((prev) => prev.map((x) => (x.id === next.id ? { ...next, updatedAt: Date.now() } : x)));
    }
  }, []);

  /** 평가표에서 바뀐 내용을 이관된 설문지 문서에 밀어 넣는다 */
  const syncSurveysFrom = React.useCallback(async (a: Assessment) => {
    const linked = surveysRef.current.filter((v) => v.movedTo?.assessmentId === a.id);
    for (const v of linked) {
      const row = a.rows.find((r) => r.id === v.movedTo?.rowId);
      if (!row) continue; // 행을 지웠으면 '이관됨'이 저절로 풀린다 — 손대지 않는다
      const next = surveyFromRow(v, row);
      if (!next) continue;
      await db.putSurvey(next);
      setSurveys((prev) => prev.map((x) => (x.id === next.id ? { ...next, updatedAt: Date.now() } : x)));
    }
  }, []);

  const saveAssessment = React.useCallback(
    async (a: Assessment) => {
      const withCodes = reassignCodes(a);
      await db.putAssessment(withCodes);
      setAssessments((prev) => {
        const next = prev.some((x) => x.id === withCodes.id)
          ? prev.map((x) => (x.id === withCodes.id ? { ...withCodes, updatedAt: Date.now() } : x))
          : [{ ...withCodes, updatedAt: Date.now() }, ...prev];
        return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
      });
      await syncStopWorksFrom(withCodes);
      await syncSurveysFrom(withCodes);
    },
    [syncStopWorksFrom, syncSurveysFrom],
  );

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
        // 고위험군 화면의 사진·개선내용 수정도 이 경로를 타므로 여기서도 함께 맞춘다
        void syncStopWorksFrom(updated);
        void syncSurveysFrom(updated);
        return prev.map((a) => (a.id === assessmentId ? { ...updated, updatedAt: Date.now() } : a));
      });
    },
    [syncStopWorksFrom, syncSurveysFrom],
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

    // 이관된 건이면 평가표 행도 같이 맞춘다(반대 방향)
    const link = v.movedTo;
    if (!link) return;
    const a = assessmentsRef.current.find((x) => x.id === link.assessmentId);
    const row = a?.rows.find((r) => r.id === link.rowId);
    if (!a || !row) return;
    const nextRow = rowFromSurvey(row, v);
    if (!nextRow) return;
    const updated = reassignCodes({ ...a, rows: a.rows.map((r) => (r.id === nextRow.id ? nextRow : r)) });
    await db.putAssessment(updated);
    setAssessments((prev) => prev.map((x) => (x.id === updated.id ? { ...updated, updatedAt: Date.now() } : x)));
  }, []);

  /** 새 설문지는 화면에서만 만든다 — '제출'을 눌러야 saveSurvey로 서버에 등록된다 */
  const createSurvey = React.useCallback(() => emptySurvey(), []);

  const removeSurvey = React.useCallback(async (id: string) => {
    await db.deleteSurvey(id);
    setSurveys((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const saveStopWork = React.useCallback(async (v: StopWork) => {
    await db.putStopWork(v);
    setStopWorks((prev) => {
      const next = prev.some((x) => x.id === v.id)
        ? prev.map((x) => (x.id === v.id ? { ...v, updatedAt: Date.now() } : x))
        : [{ ...v, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
    });

    // 이관된 건이면 평가표 행도 같이 맞춘다(반대 방향)
    const link = v.movedTo;
    if (!link) return;
    const a = assessmentsRef.current.find((x) => x.id === link.assessmentId);
    const row = a?.rows.find((r) => r.id === link.rowId);
    if (!a || !row) return;
    const nextRow = rowFromStopWork(row, v);
    if (!nextRow) return;
    const updated = reassignCodes({ ...a, rows: a.rows.map((r) => (r.id === nextRow.id ? nextRow : r)) });
    await db.putAssessment(updated);
    setAssessments((prev) => prev.map((x) => (x.id === updated.id ? { ...updated, updatedAt: Date.now() } : x)));
  }, []);

  /** 설문지와 같이 화면에서만 만들고 '등록'을 눌러야 서버에 남는다.
      접수번호는 그 해에 이미 쓴 번호 다음을 미리 채운다(고칠 수 있다). */
  const createStopWork = React.useCallback(
    () => emptyStopWork(nextDocNo(stopWorks), settings.org.orgName || settings.org.facility),
    [stopWorks, settings.org],
  );

  const removeStopWork = React.useCallback(async (id: string) => {
    await db.deleteStopWork(id);
    setStopWorks((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const savePriorityAction = React.useCallback(async (v: PriorityAction) => {
    await db.putPriorityAction(v);
    setPriorityActions((prev) => {
      const next = prev.some((x) => x.id === v.id)
        ? prev.map((x) => (x.id === v.id ? { ...v, updatedAt: Date.now() } : x))
        : [{ ...v, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
    });
  }, []);

  const createPriorityAction = React.useCallback(
    () => emptyPriorityAction(nextDocNo(priorityActions), settings.org.dept, settings.org.facility),
    [priorityActions, settings.org],
  );

  const removePriorityAction = React.useCallback(async (id: string) => {
    await db.deletePriorityAction(id);
    setPriorityActions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const saveTraining = React.useCallback(async (v: Training) => {
    await db.putTraining(v);
    setTrainings((prev) => {
      const next = prev.some((x) => x.id === v.id)
        ? prev.map((x) => (x.id === v.id ? { ...v, updatedAt: Date.now() } : x))
        : [{ ...v, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.updatedAt - x.updatedAt);
    });
  }, []);

  /** 설문지·작업중지권과 같이 화면에서만 만들고 '등록'을 눌러야 서버에 남는다 */
  const createTraining = React.useCallback(
    (kind: TrainingKind) => emptyTraining(kind, { approver: settings.org.approver, facility: settings.org.facility }),
    [settings.org.approver, settings.org.facility],
  );

  const removeTraining = React.useCallback(async (id: string) => {
    await db.deleteTraining(id);
    setTrainings((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /** 서버가 서명 한 칸만 바꾼 문서를 돌려주므로 그대로 갈아 끼운다 */
  const signTraining = React.useCallback(async (id: string, attendeeId: string, image: string | null) => {
    const next = await db.signTraining(id, attendeeId, image);
    setTrainings((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    return next; // 화면이 들고 있는 사본도 같이 맞출 수 있게 돌려준다
  }, []);

  const saveAnnualPlan = React.useCallback(async (v: AnnualPlan) => {
    await db.putAnnualPlan(v);
    setAnnualPlans((prev) => {
      const next = prev.some((x) => x.id === v.id)
        ? prev.map((x) => (x.id === v.id ? { ...v, updatedAt: Date.now() } : x))
        : [{ ...v, updatedAt: Date.now() }, ...prev];
      return [...next].sort((x, y) => y.year - x.year);
    });
  }, []);

  /** 지난해 계획을 그대로 가져와 실적만 비운다 — 해마다 계획이 크게 바뀌지 않기 때문 */
  const createAnnualPlan = React.useCallback(
    (year: number) => {
      const prev = [...annualPlans].filter((p) => p.year < year).sort((a, b) => b.year - a.year)[0];
      return prev ? copyPlanForYear(prev, year) : emptyAnnualPlan(year, settings.org.approver);
    },
    [annualPlans, settings.org.approver],
  );

  const removeAnnualPlan = React.useCallback(async (id: string) => {
    await db.deleteAnnualPlan(id);
    setAnnualPlans((prev) => prev.filter((x) => x.id !== id));
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
  const canUploadPhoto =
    isAdmin || settings.permissions.photo || settings.permissions.survey || settings.permissions.stopwork;
  const canSurvey = isAdmin || settings.permissions.survey;
  const canStopWork = isAdmin || settings.permissions.stopwork;

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
      stopWorks,
      createStopWork,
      saveStopWork,
      removeStopWork,
      canStopWork,
      priorityActions,
      createPriorityAction,
      savePriorityAction,
      removePriorityAction,
      trainings,
      createTraining,
      saveTraining,
      removeTraining,
      signTraining,
      annualPlans,
      createAnnualPlan,
      saveAnnualPlan,
      removeAnnualPlan,
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
      stopWorks,
      createStopWork,
      saveStopWork,
      removeStopWork,
      canStopWork,
      priorityActions,
      createPriorityAction,
      savePriorityAction,
      removePriorityAction,
      trainings,
      createTraining,
      saveTraining,
      removeTraining,
      signTraining,
      annualPlans,
      createAnnualPlan,
      saveAnnualPlan,
      removeAnnualPlan,
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
