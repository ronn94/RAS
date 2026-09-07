/**
 * 일회성이 아니라 계속 남겨두는 관리자 도구 — 위험성평가표에 엑셀로 일괄 입력되면서
 * 비고에 '설문'이라고만 적히고 실제 의견청취 설문지로는 한 번도 등록되지 않은 옛 행들을
 * 지금이라도 [의견청취 → 설문지] 목록에 정식으로 등록한다.
 *
 * 실제 이관 흐름(SurveyDetail.tsx의 moveToAssessment)과 결과가 같아야 한다:
 * review="반영" · locked=true · movedTo로 원본 행을 가리킨다. 다만 비고는 그대로 '설문'
 * 을 유지한다(원본 데이터를 최소로 건드린다는 원칙) — 실제 이관 형식(`의견청취 · 이름`)과는
 * 다르지만, 이미 대시보드·목록에서 '이관됨' 배지로 충분히 구분된다.
 *
 * 몇 번을 다시 눌러도 안전하다 — 이미 등록된 행(movedTo.rowId로 판정)은 건너뛴다.
 */
import type { Assessment, RiskItem, Survey } from "../src/lib/types";
import type { Bindings } from "./bindings";

const NOTE_MARK = "설문";

/** 사진 배열은 인덱스가 곧 순서다(0=개선 전, 1=개선 후) — 뒤섞이면 라벨이 어긋난다.
    beforePhoto 없이 afterPhoto만 있는 드문 경우에도 자리를 지켜야 하므로, 끝쪽의
    빈 칸만 잘라내고 중간은 그대로 둔다. */
function toSurveyPhotos(row: RiskItem): string[] {
  const photos = [row.beforePhoto ?? "", row.afterPhoto ?? ""];
  while (photos.length && !photos[photos.length - 1]) photos.pop();
  return photos;
}

export async function backfillSurveysFromNotes(env: Bindings): Promise<{ registered: number; skipped: number }> {
  const [assessmentRows, surveyRows] = await Promise.all([
    env.ras_db.prepare("SELECT data FROM assessments").all<{ data: string }>(),
    env.ras_db.prepare("SELECT data FROM surveys").all<{ data: string }>(),
  ]);

  const assessments = assessmentRows.results.map((r) => JSON.parse(r.data) as Assessment);
  const surveys = surveyRows.results.map((r) => JSON.parse(r.data) as Survey);
  const alreadyLinked = new Set(surveys.map((v) => v.movedTo?.rowId).filter((id): id is string => !!id));

  let registered = 0;
  let skipped = 0;
  const now = Date.now();
  const inserts: D1PreparedStatement[] = [];

  for (const a of assessments) {
    for (const row of a.rows) {
      if ((row.note ?? "").trim() !== NOTE_MARK) continue;
      if (alreadyLinked.has(row.id)) {
        skipped += 1;
        continue;
      }

      const survey: Survey = {
        id: crypto.randomUUID(),
        author: "", // 원본에 제출자 이름이 없다 — 목록에는 '-'로 보인다
        date: a.date, // 그 평가표의 평가일시를 대신 쓴다(원본에 남은 유일한 날짜 정보)
        process: a.process,
        subProcess: row.subProcess,
        hazardClass: row.hazardClass || "",
        hazardCode: row.hazardCode || "",
        hazard: row.hazard,
        p: row.p,
        s: row.s,
        measure: row.measure,
        dueDate: row.dueDate,
        photos: toSurveyPhotos(row), // 평가표 사진과 id를 공유한다(복사하지 않는다)
        movedTo: { assessmentId: a.id, rowId: row.id, at: now },
        locked: true,
        review: "반영",
        updatedAt: now,
      };

      inserts.push(
        env.ras_db
          .prepare(
            `INSERT INTO surveys (id, data, facility, process, updated_at) VALUES (?1, ?2, '', ?3, ?4)
             ON CONFLICT(id) DO NOTHING`,
          )
          .bind(survey.id, JSON.stringify(survey), survey.process, now),
      );
      registered += 1;
    }
  }

  if (inserts.length > 0) await env.ras_db.batch(inserts);
  return { registered, skipped };
}
