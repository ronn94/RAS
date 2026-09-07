/**
 * 일회성 스크립트 — 딱 한 번 쓰고 지운다(코드 리뷰 중이라면: 곧 삭제될 파일이다).
 *
 * backfillSurveysFromNotes로 이미 등록해 둔 설문지들의 작성일자(date)가 아직 옛 규칙
 * (평가표의 평가일시)을 쓰고 있어서, 새 규칙(개선일자)으로 다시 채운다.
 * movedTo가 있는 설문지만 대상이고, 다른 필드는 건드리지 않는다.
 */
import type { Assessment, RiskItem, Survey } from "../src/lib/types";
import type { Bindings } from "./bindings";

export async function fixSurveyDatesOnce(env: Bindings): Promise<{ fixed: number; alreadyCorrect: number }> {
  const [assessmentRows, surveyRows] = await Promise.all([
    env.ras_db.prepare("SELECT data FROM assessments").all<{ data: string }>(),
    env.ras_db.prepare("SELECT id, data FROM surveys").all<{ id: string; data: string }>(),
  ]);

  const rowById = new Map<string, RiskItem>();
  const assessmentDateByRowId = new Map<string, string>();
  for (const r of assessmentRows.results) {
    const a = JSON.parse(r.data) as Assessment;
    for (const row of a.rows) {
      rowById.set(row.id, row);
      assessmentDateByRowId.set(row.id, a.date);
    }
  }

  let fixed = 0;
  let alreadyCorrect = 0;
  const updates: D1PreparedStatement[] = [];
  const now = Date.now();

  for (const r of surveyRows.results) {
    const v = JSON.parse(r.data) as Survey;
    const rowId = v.movedTo?.rowId;
    if (!rowId) continue;
    const row = rowById.get(rowId);
    if (!row) continue;
    const correctDate = row.improveDate || assessmentDateByRowId.get(rowId) || v.date;
    if (v.date === correctDate) {
      alreadyCorrect += 1;
      continue;
    }
    const patched: Survey = { ...v, date: correctDate, updatedAt: now };
    updates.push(
      env.ras_db.prepare("UPDATE surveys SET data = ?1, updated_at = ?2 WHERE id = ?3").bind(JSON.stringify(patched), now, r.id),
    );
    fixed += 1;
  }

  if (updates.length > 0) await env.ras_db.batch(updates);
  return { fixed, alreadyCorrect };
}
