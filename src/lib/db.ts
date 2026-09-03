/**
 * 서버 데이터 접근 — Cloudflare Worker API(worker/index.ts)를 호출한다.
 * D1(assessments·hazardInfos·settings)과 R2(사진)가 정본이며, 브라우저는
 * 더 이상 데이터를 들고 있지 않는다(로그인만 하면 어느 기기에서도 같은 자료를 본다).
 *
 * IndexedDB 시절(src/lib/localdb.ts)과 함수 시그니처를 최대한 맞춰서
 * store.tsx 쪽 변경을 최소화했다. 사진만 예외 — 서버가 id를 발급하므로
 * putPhoto(id, blob) 대신 uploadPhoto(blob) → id 형태다.
 */
import type { Assessment, HazardInfo, Inspection } from "./types";
import { withDefaults, type AppSettings } from "./settings";

/** 세션이 끊겼을 때(401) store.tsx가 로그인 화면으로 되돌릴 수 있도록 알린다.
   (namespace import로 가져온 `let` export는 외부에서 재대입할 수 없으므로 setter를 둔다) */
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    onUnauthorized?.();
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`서버 요청에 실패했습니다 (${res.status}) ${text}`.trim());
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ── 평가표 ─────────────────────────────────────────────── */
export const listAssessments = () => api<Assessment[]>("/assessments");
export const putAssessment = (a: Assessment) =>
  api<Assessment>(`/assessments/${a.id}`, { method: "PUT", body: JSON.stringify(a) });
export const deleteAssessment = (id: string) => api(`/assessments/${id}`, { method: "DELETE" });

/* ── 유해·위험 정보 ─────────────────────────────────────── */
export const listHazardInfos = () => api<HazardInfo[]>("/hazardinfos");
export const putHazardInfo = (h: HazardInfo) =>
  api<HazardInfo>(`/hazardinfos/${h.id}`, { method: "PUT", body: JSON.stringify(h) });
export const deleteHazardInfo = (id: string) => api(`/hazardinfos/${id}`, { method: "DELETE" });

/* ── 순회점검 조사표 ────────────────────────────────────── */
export const listInspections = () => api<Inspection[]>("/inspections");
export const putInspection = (v: Inspection) =>
  api<Inspection>(`/inspections/${v.id}`, { method: "PUT", body: JSON.stringify(v) });
export const deleteInspection = (id: string) => api(`/inspections/${id}`, { method: "DELETE" });

/* ── 설정 ───────────────────────────────────────────────── */
export const loadSettings = () =>
  api<Partial<AppSettings> | null>("/settings").then(withDefaults);
export const saveSettings = (v: AppSettings) => api("/settings", { method: "PUT", body: JSON.stringify(v) });

/* ── 마지막 백업 시각 — 서버 데이터가 아니라 '이 기기에서 마지막으로
   내려받기를 눌렀는지'를 나타내는 로컬 UI 상태라 localStorage에 둔다 */
const LAST_BACKUP_KEY = "ras.lastBackup";
export const getLastBackup = async (): Promise<number | undefined> => {
  const v = localStorage.getItem(LAST_BACKUP_KEY);
  return v ? Number(v) : undefined;
};
export const setLastBackup = async (t: number) => {
  localStorage.setItem(LAST_BACKUP_KEY, String(t));
};

/* ── 사진 ───────────────────────────────────────────────── */
export const photoUrl = (id: string) => `/api/photos/${id}`;

export async function uploadPhoto(blob: Blob): Promise<string> {
  const res = await fetch("/api/photos", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": blob.type || "image/jpeg" },
    body: blob,
  });
  if (res.status === 401) {
    onUnauthorized?.();
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) throw new Error(`사진 업로드에 실패했습니다 (${res.status})`);
  const data = (await res.json()) as { id: string };
  return data.id;
}
export const deletePhoto = (id: string) => api(`/photos/${id}`, { method: "DELETE" });

/* ── 백업 ───────────────────────────────────────────────── */
export const exportBackup = () => api<unknown>("/backup").then((v) => JSON.stringify(v, null, 2));

export async function importBackup(json: string): Promise<number> {
  const data = JSON.parse(json);
  const res = await api<{ assessments: number }>("/backup/restore", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.assessments;
}

/* ── 저장소 사용량 ──────────────────────────────────────── */
export async function storageUsage() {
  const { photoBytes } = await api<{ photoCount: number; photoBytes: number }>("/storage");
  return { usage: photoBytes, quota: 0 };
}

/* ── 고아 사진 정리 ─────────────────────────────────────── */
export async function cleanupOrphanPhotos(): Promise<number> {
  const [assessments, inspections] = await Promise.all([listAssessments(), listInspections()]);
  const used: string[] = [];
  for (const a of assessments) {
    for (const r of a.rows) {
      if (r.beforePhoto) used.push(r.beforePhoto);
      if (r.afterPhoto) used.push(r.afterPhoto);
    }
  }
  // 순회점검 사진도 반드시 세야 한다 — 빠뜨리면 정리 때 통째로 지워진다
  for (const i of inspections) {
    for (const it of i.items) if (it.photo) used.push(it.photo);
  }
  const { removed } = await api<{ removed: number }>("/photos/cleanup", {
    method: "POST",
    body: JSON.stringify({ used }),
  });
  return removed;
}

/* ── 전체 초기화 ────────────────────────────────────────── */
export async function wipeAll() {
  await api("/wipe", { method: "POST" });
}
