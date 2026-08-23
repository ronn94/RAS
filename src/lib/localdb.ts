/**
 * IndexedDB 저장소 — 3단계(D1+R2) 이전에 쓰던 1단계 로컬 저장소.
 * 지금은 src/lib/db.ts(서버 API)가 정본이고, 이 파일은 브라우저에 남아 있는
 * 옛 로컬 데이터를 서버로 옮기는 '마이그레이션 브리지' 용도로만 쓴다
 * (설정 → 백업·복원의 '이 브라우저의 예전 데이터 가져오기').
 */
import type { Assessment, HazardInfo } from "./types";
import { withDefaults, type AppSettings } from "./settings";

const DB_NAME = "ras";
const DB_VERSION = 3;
const STORE_ASSESSMENTS = "assessments";
const STORE_PHOTOS = "photos";
const STORE_HAZARDINFO = "hazardinfos";
const STORE_SETTINGS = "settings";

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASSESSMENTS)) db.createObjectStore(STORE_ASSESSMENTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) db.createObjectStore(STORE_PHOTOS);
      if (!db.objectStoreNames.contains(STORE_HAZARDINFO)) db.createObjectStore(STORE_HAZARDINFO, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

/* ── 평가표 ─────────────────────────────────────────────── */
export const listAssessments = () =>
  tx<Assessment[]>(STORE_ASSESSMENTS, "readonly", (s) => s.getAll() as IDBRequest<Assessment[]>).then((rows) =>
    rows.sort((a, b) => b.updatedAt - a.updatedAt),
  );

export const putAssessment = (a: Assessment) =>
  tx(STORE_ASSESSMENTS, "readwrite", (s) => s.put({ ...a, updatedAt: Date.now() }));

export const deleteAssessment = (id: string) => tx(STORE_ASSESSMENTS, "readwrite", (s) => s.delete(id));

/* ── 유해·위험 정보 ─────────────────────────────────────── */
export const listHazardInfos = () =>
  tx<HazardInfo[]>(STORE_HAZARDINFO, "readonly", (s) => s.getAll() as IDBRequest<HazardInfo[]>).then((rows) =>
    rows.sort((a, b) => b.updatedAt - a.updatedAt),
  );

export const putHazardInfo = (h: HazardInfo) =>
  tx(STORE_HAZARDINFO, "readwrite", (s) => s.put({ ...h, updatedAt: Date.now() }));

export const deleteHazardInfo = (id: string) => tx(STORE_HAZARDINFO, "readwrite", (s) => s.delete(id));

/* ── 설정 ───────────────────────────────────────────────── */
export const loadSettings = () =>
  tx<Partial<AppSettings> | undefined>(STORE_SETTINGS, "readonly", (s) => s.get("app")).then(withDefaults);

export const saveSettings = (v: AppSettings) =>
  tx(STORE_SETTINGS, "readwrite", (s) => s.put({ ...v, updatedAt: Date.now() }, "app"));

/* ── 마지막 백업 시각 ────────────────────────────────────── */
export const getLastBackup = () => tx<number | undefined>(STORE_SETTINGS, "readonly", (s) => s.get("lastBackup"));
export const setLastBackup = (t: number) => tx(STORE_SETTINGS, "readwrite", (s) => s.put(t, "lastBackup"));

/* ── 저장소 사용량 ──────────────────────────────────────── */
export async function storageUsage() {
  const est = await navigator.storage?.estimate?.();
  return { usage: est?.usage ?? 0, quota: est?.quota ?? 0 };
}

/* ── 고아 사진 정리 ─────────────────────────────────────── */
export async function cleanupOrphanPhotos(): Promise<number> {
  const assessments = await listAssessments();
  const used = new Set<string>();
  for (const a of assessments) {
    for (const r of a.rows) {
      if (r.beforePhoto) used.add(r.beforePhoto);
      if (r.afterPhoto) used.add(r.afterPhoto);
    }
  }
  const keys = await tx<IDBValidKey[]>(STORE_PHOTOS, "readonly", (s) => s.getAllKeys());
  let removed = 0;
  for (const k of keys) {
    if (typeof k === "string" && !used.has(k)) {
      await deletePhoto(k);
      removed += 1;
    }
  }
  return removed;
}

/* ── 전체 초기화 ────────────────────────────────────────── */
export async function wipeAll() {
  const assessments = await listAssessments();
  for (const a of assessments) await deleteAssessment(a.id);
  const infos = await listHazardInfos();
  for (const h of infos) await deleteHazardInfo(h.id);
  const keys = await tx<IDBValidKey[]>(STORE_PHOTOS, "readonly", (s) => s.getAllKeys());
  for (const k of keys) if (typeof k === "string") await deletePhoto(k);
}

/* ── 사진 ───────────────────────────────────────────────── */
export const putPhoto = (id: string, blob: Blob) => tx(STORE_PHOTOS, "readwrite", (s) => s.put(blob, id));
export const getPhoto = (id: string) => tx<Blob | undefined>(STORE_PHOTOS, "readonly", (s) => s.get(id));
export const deletePhoto = (id: string) => tx(STORE_PHOTOS, "readwrite", (s) => s.delete(id));

/* ── 백업 ───────────────────────────────────────────────── */
export async function exportBackup(): Promise<string> {
  const assessments = await listAssessments();
  const hazardInfos = await listHazardInfos();
  const settings = await loadSettings();
  const photos: Record<string, string> = {};
  for (const a of assessments) {
    for (const r of a.rows) {
      for (const pid of [r.beforePhoto, r.afterPhoto]) {
        if (!pid || photos[pid]) continue;
        const blob = await getPhoto(pid);
        if (blob) photos[pid] = await blobToDataUrl(blob);
      }
    }
  }
  return JSON.stringify({ version: 3, assessments, hazardInfos, settings, photos }, null, 2);
}

export async function importBackup(json: string): Promise<number> {
  const data = JSON.parse(json) as {
    assessments: Assessment[];
    hazardInfos?: HazardInfo[];
    settings?: AppSettings;
    photos?: Record<string, string>;
  };
  for (const [id, dataUrl] of Object.entries(data.photos ?? {})) {
    await putPhoto(id, await (await fetch(dataUrl)).blob());
  }
  for (const a of data.assessments) await putAssessment(a);
  for (const h of data.hazardInfos ?? []) await putHazardInfo(h);
  if (data.settings) await saveSettings(withDefaults(data.settings));
  return data.assessments.length;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}
