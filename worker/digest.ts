/**
 * 매일 08:00(KST) Cron Trigger가 부르는 요약 알림 — 개선기한 초과·임박과 작업중지
 * 장기 미해제를 하루 한 번씩 검사해서 보낸다. 해결되지 않으면 다음날도 다시 보낸다
 * (같은 topic으로 보내 기기에 알림이 쌓이지 않는다 — sendPush 참고).
 *
 * 대시보드 화면과 같은 계산을 쓴다 — buildMetrics·isHighRisk를 그대로 임포트해서
 * "화면에서 본 기한 임박 건수"와 "알림으로 온 건수"가 절대 어긋나지 않게 한다.
 */
import { buildMetrics } from "../src/lib/metrics";
import { setRiskThreshold } from "../src/lib/risk";
import { withDefaults } from "../src/lib/settings";
import type { Assessment, HazardInfo, StopWork } from "../src/lib/types";
import { sendPush, type Bindings } from "./push";

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadJsonRows<T>(db: D1Database, table: string): Promise<T[]> {
  const { results } = await db.prepare(`SELECT data FROM ${table}`).all<{ data: string }>();
  return results.map((r) => JSON.parse(r.data) as T);
}

export async function runDailyDigest(env: Bindings): Promise<void> {
  const settingsRow = await env.ras_db.prepare("SELECT data FROM settings WHERE id = 'app'").first<{ data: string }>();
  const settings = withDefaults(settingsRow ? JSON.parse(settingsRow.data) : null);
  const notif = settings.notifications;
  if (!notif.dueDate && !notif.stopworkStale) return; // 검사할 게 없으면 D1을 읽지도 않는다

  setRiskThreshold(settings.risk.threshold);

  if (notif.dueDate) {
    const [assessments, hazardInfos] = await Promise.all([
      loadJsonRows<Assessment>(env.ras_db, "assessments"),
      loadJsonRows<HazardInfo>(env.ras_db, "hazard_infos"),
    ]);
    const m = buildMetrics(assessments, hazardInfos);
    if (m.overdue.length > 0 || m.soon.length > 0) {
      const parts: string[] = [];
      if (m.overdue.length > 0) parts.push(`기한 초과 ${m.overdue.length}건`);
      if (m.soon.length > 0) parts.push(`임박 ${m.soon.length}건`);
      await sendPush(env, {
        title: "개선기한 확인이 필요합니다",
        body: parts.join(" · "),
        view: "highrisk",
        topic: "ras-duedate",
      });
    }
  }

  if (notif.stopworkStale) {
    const stopWorks = await loadJsonRows<StopWork>(env.ras_db, "stop_works");
    const now = Date.now();
    const stale = stopWorks.filter((v) => {
      if (v.status !== "중지" && v.status !== "조치중") return false;
      const since = v.statusChangedAt ?? v.updatedAt;
      return now - since >= DAY_MS;
    });
    if (stale.length > 0) {
      await sendPush(env, {
        title: "작업중지 장기 미해제",
        body: `24시간 넘게 '${stale[0].status}' 상태인 건이 ${stale.length}건 있습니다`,
        view: "stopworks",
        id: stale.length === 1 ? stale[0].id : undefined,
        topic: "ras-stopwork-stale",
      });
    }
  }
}
