/**
 * AI 도우미(2026-11-08) — MSDS·BP와 같은 원칙.
 *  - 화면의 [✨ AI] 버튼을 눌렀을 때만 부른다(Workers AI, 계정 하루 무료 한도를 MSDS·BP와 함께 쓴다).
 *  - 분류·코드는 설정의 유해위험 분류표 안에서만 고른다. 표에 없는 코드는 버린다.
 *  - 결과는 초안이다 — 화면은 빈 칸만 채우고 사람이 확인한다.
 *  - 이름·연락처·서명은 보내지 않는다(위험요인 문장·공정명만).
 */
import type { Context } from "hono";
import { DEFAULT_SETTINGS, withDefaults, type AppSettings } from "../src/lib/settings";
import type { Bindings } from "./bindings";

const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const EMBED_MODEL = "@cf/baai/bge-m3";
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function loadSettings(db: D1Database): Promise<AppSettings> {
  const row = await db.prepare("SELECT data FROM settings WHERE id = 'app'").first<{ data: string }>();
  try { return withDefaults(row ? JSON.parse(row.data) : DEFAULT_SETTINGS); } catch { return withDefaults(DEFAULT_SETTINGS); }
}

function limitError(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  return /limit|quota|429|neurons/i.test(m);
}
function fail(c: Context<{ Bindings: Bindings }>, e: unknown) {
  if (limitError(e)) return c.json({ error: "오늘 AI 무료 사용량을 다 썼습니다. 내일 다시 시도하거나 직접 입력해 주세요." }, 429);
  console.error("AI failed", e);
  return c.json({ error: "AI 추천을 받지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
}

async function chatJson(env: Bindings, system: string, user: string, maxTokens = 400) {
  if (!env.AI) throw new Error("AI 바인딩 없음");
  const r = (await env.AI.run(CHAT_MODEL, {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
    temperature: 0.1,
  })) as { response?: unknown };
  let out = r?.response;
  if (typeof out === "string") {
    try { out = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)); } catch { out = {}; }
  }
  return (out && typeof out === "object" ? out : {}) as Record<string, unknown>;
}

/**
 * 1+2) 위험요인 → 분류·코드(+ 원하면 현재조치·개선대책 초안)
 * 본문: { hazard, process?, subProcess?, withMeasures? }
 * 답: { hazardClass, hazardCode, label, reason, currentControl?, measure?, measureFromList? }
 */
export async function aiHazard(c: Context<{ Bindings: Bindings }>) {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const hazard = clip(body.hazard, 600);
    if (hazard.length < 4) return c.json({ error: "유해위험요인을 조금 더 적어 주세요." }, 400);
    const settings = await loadSettings(c.env.ras_db);
    const types = settings.hazardFactors.flatMap((f) => f.types.map((t) => ({ code: t.code, label: t.label, cls: f.name, actions: t.actions })));
    const catalog = settings.hazardFactors.map((f) => `[${f.name}] ` + f.types.map((t) => `${t.code} ${t.label}`).join(", ")).join("\n");
    const withMeasures = body.withMeasures === true;
    const system = `너는 한국 산업안전 위험성평가 도우미다. 유해위험요인 문장을 보고 아래 분류표에서 가장 알맞은 유형 하나를 고른다.
분류표에 있는 코드만 쓴다. 확실하지 않으면 가장 가까운 것을 고르되 reason에 짧게 이유를 적는다.
${withMeasures ? `또한 currentControl(현재 하고 있을 법한 안전보건조치, 30자 이내 한 문장)과 measure(추가로 할 개선대책, 40자 이내 한 문장)를 쓴다. 과장하거나 법 조항을 지어내지 않는다.` : ""}
JSON 형식: {"code":"1.4","reason":"한 문장"${withMeasures ? ',"currentControl":"…","measure":"…"' : ""}}

분류표:
${catalog}`;
    const user = `공정: ${clip(body.process, 60) || "-"} / 세부공정: ${clip(body.subProcess, 60) || "-"}
유해위험요인: ${hazard}`;
    const out = await chatJson(c.env, system, user, withMeasures ? 400 : 200);
    const code = clip(out.code, 10).replace(/[^\d.]/g, "");
    const t = types.find((x) => x.code === code);
    if (!t) return c.json({ error: "알맞은 위험코드를 찾지 못했습니다. 직접 골라 주세요." }, 422);
    const res: Record<string, unknown> = { hazardClass: t.cls, hazardCode: t.code, label: t.label, reason: clip(out.reason, 120) };
    if (withMeasures) {
      // 분류표의 '현재 조치사항' 후보가 있으면 그 문구를 먼저 쓴다(지어낸 문장보다 표의 문구가 우선)
      const ai = clip(out.currentControl, 80);
      const fromList = t.actions.find((a) => ai && (a.includes(ai) || ai.includes(a))) ?? (t.actions.length ? t.actions[0] : "");
      res.currentControl = fromList || ai;
      res.currentFromList = !!fromList;
      res.measure = clip(out.measure, 100);
    }
    return c.json(res);
  } catch (e) {
    return fail(c, e);
  }
}

/**
 * 3) 평가표로 옮기기 전 중복 찾기 — 문장 임베딩(bge-m3)으로 비슷한 기존 행을 찾는다.
 * 본문: { texts: string[], rows: {id, text}[] } → 답: { matches: {textIndex, rowId, score}[] }
 */
export async function aiSimilar(c: Context<{ Bindings: Bindings }>) {
  try {
    if (!c.env.AI) throw new Error("AI 바인딩 없음");
    const body = (await c.req.json().catch(() => ({}))) as { texts?: unknown; rows?: unknown };
    const texts = (Array.isArray(body.texts) ? body.texts : []).map((t) => clip(t, 300)).filter(Boolean).slice(0, 20);
    const rows = (Array.isArray(body.rows) ? body.rows : [])
      .map((r) => ({ id: clip((r as { id?: unknown })?.id, 60), text: clip((r as { text?: unknown })?.text, 300) }))
      .filter((r) => r.id && r.text).slice(0, 200);
    if (!texts.length || !rows.length) return c.json({ matches: [] });
    const r = (await c.env.AI.run(EMBED_MODEL, { text: [...texts, ...rows.map((x) => x.text)] })) as { data?: number[][] };
    const vec = r?.data ?? [];
    const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    const cos = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0) / (norm(a) * norm(b));
    const matches: Array<{ textIndex: number; rowId: string; score: number }> = [];
    texts.forEach((_, i) => {
      rows.forEach((row, j) => {
        const score = cos(vec[i] ?? [], vec[texts.length + j] ?? []);
        if (score >= 0.8) matches.push({ textIndex: i, rowId: row.id, score: Math.round(score * 100) / 100 });
      });
    });
    matches.sort((a, b) => b.score - a.score);
    // 옮길 문장마다 가장 비슷한 3개까지만
    const per = new Map<number, number>();
    return c.json({ matches: matches.filter((m) => { const n = (per.get(m.textIndex) ?? 0) + 1; per.set(m.textIndex, n); return n <= 3; }) });
  } catch (e) {
    return fail(c, e);
  }
}

/**
 * 4) 작업 위험성평가 한 줄 — 공정/작업순서로 나머지 칸 초안(2026-11-15).
 * 본문: { stepName, content?, category? } → 답: { ppes, hazardCode, factor, actions, s, p, measure, s2, p2, reason }
 * 보호구·위험코드·현재 조치는 목록(보호구 목록·분류표·코드별 조치 후보) 안에서만 고른다. 점수는 1~4(강도)·1~5(빈도).
 */
export async function aiJobRow(c: Context<{ Bindings: Bindings }>, ppeItems: readonly string[]) {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const step = clip(body.stepName, 200);
    if (step.length < 2) return c.json({ error: "공정/작업순서를 먼저 적어 주세요." }, 400);
    const settings = await loadSettings(c.env.ras_db);
    const types = settings.hazardFactors.flatMap((f) => f.types.map((t) => ({ code: t.code, label: t.label, actions: t.actions })));
    const catalog = settings.hazardFactors.map((f) => `[${f.name}] ` + f.types.map((t) => `${t.code} ${t.label}`).join(", ")).join("\n");
    const threshold = settings.risk?.threshold ?? 8;
    const system = `너는 한국 산업현장 작업 위험성평가(JRA) 작성 도우미다. 작업순서 한 줄을 보고 JSON으로만 답한다.
- ppes: 필요한 보호구(아래 목록 이름 그대로, 1~4개): ${ppeItems.join(", ")}
- code: 아래 분류표에서 가장 알맞은 위험코드 하나
- factor: 위험요인 한 문장(40자 이내, "~하여 ~할 위험" 꼴)
- s: 피해강도 1~4 (1 휴업 없음, 2 휴업 1월 미만, 3 휴업 1월 이상, 4 사망)
- p: 사고빈도 1~5 (1 거의 없음 ~ 5 매우 높음, 보통 2~3)
- measure: 강도×빈도가 ${threshold} 이상이면 추가 감소대책 한 문장(40자 이내), 아니면 빈 문자열
- s2, p2: measure가 있으면 조치 후 강도·빈도(낮아진 값), 없으면 null
- reason: 한 문장 근거
과장하거나 법 조항을 지어내지 않는다.
형식: {"ppes":["안전모"],"code":"1.4","factor":"…","s":3,"p":2,"measure":"","s2":null,"p2":null,"reason":"…"}

분류표:
${catalog}`;
    const user = `작업: ${clip(body.content, 200) || "-"} / 분류: ${clip(body.category, 80) || "-"}
공정/작업순서: ${step}`;
    const out = await chatJson(c.env, system, user, 500);
    // 위험코드 — "1.3", "1.3 기계의 맞음…", 이름만 온 경우까지 맞춘다(2026-11-15: 실제 응답에서 코드가 비는 일이 있었다)
    const rawCode = String(out.code ?? "");
    const num = (rawCode.match(/\d+(?:\.\d+)?/) ?? [""])[0];
    const t = types.find((x) => x.code === num) ?? types.find((x) => rawCode && (rawCode.includes(x.label) || x.label.includes(rawCode.trim())))
      ?? types.find((x) => String(out.factor ?? "").includes(x.label.split(/[,·\s]/)[0]));
    const int = (v: unknown, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= max ? n : null; };
    const s = int(out.s, 4), p = int(out.p, 5);
    const measure = clip(out.measure, 100);
    // 보호구 — 목록 이름과 정확히 같지 않아도(예: "안전모 착용") 목록 이름이 들어 있으면 그 이름으로
    const ppes = [...new Set((Array.isArray(out.ppes) ? out.ppes : []).map(String).map((x) => ppeItems.find((it) => x === it || x.includes(it) || it.includes(x.trim()))).filter((x): x is string => !!x))].slice(0, 5);
    // 현재 조치 — 그 코드의 후보 중 위험요인·작업과 낱말이 겹치는 것(없으면 앞에서 2개)을 초안으로
    const factor = clip(out.factor, 80);
    const words = `${step} ${factor}`.split(/[\s,·/()]+/).filter((w) => w.length >= 2);
    const cands = t?.actions ?? [];
    const hit = cands.filter((a) => words.some((w) => a.includes(w)));
    const actions = (hit.length ? hit : cands).slice(0, 2);
    const res = {
      ppes, hazardCode: t?.code ?? "", factor, actions, s, p,
      measure: s && p && s * p >= threshold ? measure : "",
      s2: measure && s && p && s * p >= threshold ? int(out.s2, 4) : null,
      p2: measure && s && p && s * p >= threshold ? int(out.p2, 5) : null,
      reason: clip(out.reason, 120),
    };
    if (!res.hazardCode && !res.factor && !ppes.length) return c.json({ error: "알맞은 추천을 찾지 못했습니다. 작업순서를 조금 더 자세히 적어 주세요." }, 422);
    return c.json(res);
  } catch (e) {
    return fail(c, e);
  }
}
