/**
 * 작업 위험성평가 인쇄 서식 — A4 가로.
 *
 * RAS의 다른 인쇄 서식과 같은 어휘를 쓴다: 결재란 없이 큰 제목 하나,
 * 구간은 번호(1./2./3.)로 나누고, 체크리스트는 ■(켬)/□(끔) 기호로 표시한다.
 *
 * 세부내역 표는 위험성평가표(AssessmentSheet)와 같은 방식으로 페이지를 나눈다 —
 * 고정 행수가 아니라 **화면 밖에서 한 번 그려 실제 행 높이를 잰 뒤** 그 값으로
 * 나눈다. 행마다 조치사항·감소대책 줄바꿈이 달라 높이가 들쭉날쭉하기 때문에,
 * 고정 행수로 자르면 한 쪽이 넘쳐 내용이 잘려 보인다.
 */
import * as React from "react";
import { photoUrl } from "@/lib/db";
import { codeLabel } from "@/lib/settings";
import { riskOf } from "@/lib/risk";
import {
  FINISH_ITEMS,
  jraLabel,
  PRE_JOB_ITEMS,
  type JobAssessment,
  type JobParticipant,
  type JobRow,
} from "@/lib/jobAssessment";
import { useStore } from "@/store";

/** A4 가로 297mm − 상하 여백 15mm×2 */
const PAGE_CONTENT_MM = 180;
/** 반올림 오차로 한 줄이 넘치는 것을 막는 여유 */
const SAFETY_MM = 3;
const PX_PER_MM = 96 / 25.4;

/** 참여자 한 명을 이름 + 손 서명으로 그린다 — 서명표를 따로 두지 않고 개요표의 참여자
 * 칸에 바로 붙인다. 아직 서명을 못 받았으면 빈 칸을 남겨 인쇄 후 수기로 받을 수 있게 한다.
 * '미정' 자리는 이름 대신 밑줄만 남긴다. */
function Attendee({ p }: { p: JobParticipant }) {
  if (p.undecided) return <span className="who">________</span>;
  return (
    <span className="who">
      {p.name || "-"}
      {p.sign ? (
        <img className="who-sign" src={photoUrl(p.sign)} alt="" />
      ) : (
        <span className="who-sign blank" />
      )}
    </span>
  );
}

/** 평가자·승인자 칸 — 이름과 '(인)' 자리(서명 없으면 글자, 있으면 손서명)를 한 줄에
 * flex로 같이 두고 칸 세로 가운데에 맞춘다(칸 자체는 vertical-align:middle이 맡는다) */
function SealName({ name, sign }: { name: string; sign?: string }) {
  return (
    <span className="seal-inner">
      <span>{name}</span>
      {sign ? <img className="seal-sign" src={photoUrl(sign)} alt="" /> : <span className="seal-mark">(인)</span>}
    </span>
  );
}

/** 1쪽에만 싣는 개요·작업전준비·참여자 서명 구간 */
function OverviewSections({ v }: { v: JobAssessment }) {
  const internal = v.participants.filter((p) => !p.external);
  const external = v.participants.filter((p) => p.external);

  return (
    <>
      <div className="sec">1. 개요 및 일반정보</div>
      <table className="meta">
        <colgroup>
          <col style={{ width: "22mm" }} />
          <col />
          <col style={{ width: "22mm" }} />
          <col />
          <col style={{ width: "22mm" }} />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <td className="lbl">대분류</td>
            <td>{v.mainCategory}</td>
            <td className="lbl">중분류</td>
            <td>{v.subCategory}</td>
            <td className="lbl">세분류</td>
            <td>{v.detailCategory}</td>
          </tr>
          <tr>
            <td className="lbl">상세내용</td>
            <td colSpan={3}>{v.content}</td>
            <td className="lbl">JRA 등급</td>
            <td className="num strong">{jraLabel(v)}</td>
          </tr>
          <tr>
            <td className="lbl">평가일자</td>
            <td className="num">{v.date}</td>
            <td className="lbl">평가자</td>
            <td className="seal">
              <SealName name={v.evaluator} sign={v.evaluatorSign} />
            </td>
            <td className="lbl">승인자</td>
            <td className="seal">
              <SealName name={v.approvedBy} sign={v.approvedBySign} />
            </td>
          </tr>
          <tr>
            <td className="lbl">내부 참여자</td>
            <td colSpan={5} className="wrap attendees">
              {internal.length
                ? internal.map((p) => <Attendee key={p.id} p={p} />)
                : "-"}
            </td>
          </tr>
          <tr>
            <td className="lbl">외부 참여자</td>
            <td colSpan={5} className="wrap attendees">
              {external.length
                ? external.map((p) => <Attendee key={p.id} p={p} />)
                : "-"}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="sec">2. 작업 전 준비사항</div>
      <table className="prejob">
        <tbody>
          {[0, 1, 2].map((r) => (
            <tr key={r}>
              {PRE_JOB_ITEMS.slice(r * 3, r * 3 + 3).map((item) => (
                <td key={item}>
                  <span className="box">{v.preJobs.includes(item) ? "■" : "□"}</span> {item}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sec">3. 위험성평가 세부내역</div>
    </>
  );
}

function MatrixTable({
  rows,
  startNo,
  threshold,
  settings,
}: {
  rows: JobRow[];
  startNo: number;
  threshold: number;
  settings: ReturnType<typeof useStore>["settings"];
}) {
  return (
    <table className="matrix">
      {/* 원래 폭 합계(295mm)가 인쇄 가능 폭(267mm)보다 28mm 넓어 오른쪽이 페이지 밖으로
          넘쳤다 — 개요·준비사항 표(267mm에 꽉 참)와 나란히 보면 그쪽이 좁아 보이는
          원인이었다. 전체를 같은 비율(267/295)로 줄여 267mm에 맞췄다 */}
      <colgroup>
        <col style={{ width: "6.3mm" }} />
        <col style={{ width: "23.5mm" }} />
        <col style={{ width: "21.7mm" }} />
        <col style={{ width: "19.9mm" }} />
        <col style={{ width: "25.3mm" }} />
        <col style={{ width: "43.8mm" }} />
        <col style={{ width: "7.2mm" }} />
        <col style={{ width: "7.2mm" }} />
        <col style={{ width: "7.2mm" }} />
        <col style={{ width: "12.7mm" }} />
        <col style={{ width: "36.2mm" }} />
        <col style={{ width: "7.2mm" }} />
        <col style={{ width: "7.2mm" }} />
        <col style={{ width: "7.2mm" }} />
        <col style={{ width: "12.7mm" }} />
        <col style={{ width: "21.7mm" }} />
      </colgroup>
      <thead>
        <tr>
          <th>No</th>
          <th>공정/순서</th>
          <th>보호구</th>
          <th>위험분류</th>
          <th>위험요인</th>
          <th>현재 조치사항</th>
          <th>강도</th>
          <th>빈도</th>
          <th>등급</th>
          <th>허용여부</th>
          <th>위험감소대책</th>
          <th>조치후 강도</th>
          <th>조치후 빈도</th>
          <th>조치후 등급</th>
          <th>담당자</th>
          <th>종사자의견</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <MatrixRow key={r.id} row={r} no={startNo + i} threshold={threshold} settings={settings} />
        ))}
      </tbody>
    </table>
  );
}

export function JobAssessmentSheet({ job: v }: { job: JobAssessment }) {
  const { settings } = useStore();
  const threshold = settings.risk.threshold;

  const measureRef = React.useRef<HTMLDivElement>(null);
  const finalRef = React.useRef<HTMLDivElement>(null);
  const [pages, setPages] = React.useState<JobRow[][] | null>(null);
  /** 화면 밖에서 어림잡은 예측(1단계)과 실제로 나뉜 결과(2단계)가 미세하게 어긋날 수 있다
   * — 예: 쪽 제목에 "(1/2)" 표시가 더 붙거나 실측 시점의 DOM 구조가 살짝 달라서, 한 쪽이
   * 다 채우지 못할 여백을 남긴 채 다음 쪽으로 일찍 넘어가는 경우가 있었다. 그래서 실제로
   * 그려진 결과를 한 번 더 실측해 어긋남이 있으면 바로잡는다(수렴할 때까지, 최대 3회). */
  const verifyCount = React.useRef(0);
  const [verified, setVerified] = React.useState(false);

  // 내용이 바뀌면 다시 재야 한다(줄바꿈이 달라지면 행 높이도 달라진다)
  const signature = JSON.stringify(v.rows);
  React.useLayoutEffect(() => {
    setPages(null);
    setVerified(false);
    verifyCount.current = 0;
  }, [signature]);

  /** el 안의 제목·개요·표머리·행 높이를 실측해 쪽을 나눈다 — 1단계(예측)와 3단계(검증)가 함께 쓴다 */
  const computeChunks = (el: HTMLElement, rowsPerTr: JobRow[]): JobRow[][] => {
    const height = (node: Element | null) => node?.getBoundingClientRect().height ?? 0;
    // 제목은 1쪽에만 찍는다 — 1쪽 예산에서만 빼면 된다(2쪽부터는 표 머리만 반복한다)
    const titleHeight = height(el.querySelector(".sheet-title"));
    const overviewHeight =
      titleHeight + height(el.querySelector(".overview")) + height(el.querySelector(".matrix thead"));
    const continuedHeight = height(el.querySelector(".matrix thead"));
    const budget = (PAGE_CONTENT_MM - SAFETY_MM) * PX_PER_MM;

    const trs = [...el.querySelectorAll<HTMLTableRowElement>(".matrix tbody tr")];
    const chunks: JobRow[][] = [];
    let current: JobRow[] = [];
    let used = 0;
    let available = budget - overviewHeight; // 1쪽은 개요·준비사항·서명란까지 얹혀 있다

    trs.forEach((tr, i) => {
      const h = tr.getBoundingClientRect().height;
      if (current.length > 0 && used + h > available) {
        chunks.push(current);
        current = [];
        used = 0;
        available = budget - continuedHeight; // 2쪽부터는 표 머리만 반복한다
      }
      current.push(rowsPerTr[i]);
      used += h;
    });
    if (current.length > 0) chunks.push(current);
    return chunks.length > 0 ? chunks : [[]];
  };

  // 1단계: 화면 밖 예측 — 아직 몇 쪽인지 모르니 "(N/M)" 표시 없는 기본 모양으로 잰다
  React.useLayoutEffect(() => {
    if (pages !== null) return;
    const el = measureRef.current;
    if (!el) return;
    setPages(computeChunks(el, v.rows));
  }, [pages, signature, v.rows]);

  // 3단계: 실제로 그려진 쪽(제목의 "(N/M)" 표시까지 반영된 진짜 모양)을 다시 실측해
  // 예측과 어긋난 부분(빈 공간 남기고 일찍 넘어감 · 넘쳐서 잘림)을 바로잡는다
  React.useLayoutEffect(() => {
    if (pages === null || verified) return;
    const el = finalRef.current;
    if (!el) return;
    if (verifyCount.current >= 3) {
      setVerified(true);
      return;
    }
    verifyCount.current += 1;
    const recomputed = computeChunks(el, v.rows);
    const same =
      recomputed.length === pages.length && recomputed.every((chunk, i) => chunk.length === pages[i].length);
    if (same) {
      setVerified(true);
    } else {
      setPages(recomputed);
    }
  }, [pages, verified, v.rows]);

  // 1단계: 화면 밖에서 전체 행을 한 번에 그려 높이를 잰다(사용자에게는 안 보인다)
  if (pages === null) {
    return (
      <div className="print-root sheet sheet-job" ref={measureRef} aria-hidden>
        <div className="print-page">
          <div className="sheet-title">
            작업 위험성평가
            <span className="eval-type">{v.evalType}</span>
          </div>
          <div className="overview">
            <OverviewSections v={v} />
          </div>
          <MatrixTable rows={v.rows} startNo={1} threshold={threshold} settings={settings} />
        </div>
      </div>
    );
  }

  // 2단계: 잰 높이대로 나눈 페이지를 그린다. No.는 페이지가 넘어가도 이어진다.
  const startNos = pages.reduce<number[]>((acc, _page, i) => {
    acc.push(i === 0 ? 1 : acc[i - 1] + pages[i - 1].length);
    return acc;
  }, []);

  return (
    <div className="print-root sheet sheet-job" ref={finalRef}>
      <style>{"@page{size:A4 landscape;margin:15mm}"}</style>
      {pages.map((pageRows, p) => (
        <div className="print-page" key={p}>
          {p === 0 && (
            <div className="sheet-title">
              작업 위험성평가
              <span className="eval-type">{v.evalType}</span>
              {pages.length > 1 ? (
                <span className="page-no">
                  {" "}
                  ({p + 1}/{pages.length})
                </span>
              ) : null}
            </div>
          )}
          {p === 0 && (
            <div className="overview">
              <OverviewSections v={v} />
            </div>
          )}
          <MatrixTable rows={pageRows} startNo={startNos[p]} threshold={threshold} settings={settings} />
        </div>
      ))}
    </div>
  );
}

/**
 * 완성본 미리보기 화면용 — 실제 인쇄(A4 여러 장)와 달리 페이지를 나누지 않고
 * 표 전체를 한 화면에 이어서 보여준다. .print-root가 아니어서 인쇄 시에는 찍히지
 * 않는다(실제 인쇄물은 JobAssessmentSheet가 따로 담당한다).
 */
export function JobAssessmentContinuousSheet({ job: v }: { job: JobAssessment }) {
  const { settings } = useStore();
  const threshold = settings.risk.threshold;
  return (
    <div className="sheet sheet-job">
      <div className="print-page">
        <div className="sheet-title">
          작업 위험성평가
          <span className="eval-type">{v.evalType}</span>
        </div>
        <OverviewSections v={v} />
        <MatrixTable rows={v.rows} startNo={1} threshold={threshold} settings={settings} />
      </div>
    </div>
  );
}

function MatrixRow({
  row,
  no,
  threshold,
  settings,
}: {
  row: JobRow;
  no: number;
  threshold: number;
  settings: ReturnType<typeof useStore>["settings"];
}) {
  if (row.kind === "finish") {
    // 작업종료 행은 점수 칸을 비우고 마무리 확인 항목만 싣는다
    return (
      <tr className="finish">
        <td className="num">{no}</td>
        <td className="strong">작업 완료</td>
        <td colSpan={8} />
        {/* '현재 조치사항' 칸과 같은 tiny 크기로 통일한다 — 원래 이 칸만 커서 튀어 보였다 */}
        <td className="wrap tiny">
          {FINISH_ITEMS.map((item) => (
            <span key={item} className="chk">
              {row.finishItems.includes(item) ? "■" : "□"} {item}
            </span>
          ))}
        </td>
        <td colSpan={3} />
        <td className="num">{row.owner}</td>
        <td className="wrap">{row.opinion}</td>
      </tr>
    );
  }

  const risk = riskOf(row.p, row.s);
  const post = riskOf(row.p2, row.s2);
  const ppes = [...row.ppes, ...(row.ppeEtc ? [row.ppeEtc] : [])];
  const actions = [...row.actions, ...row.customActions.filter(Boolean)];

  return (
    <tr>
      <td className="num">{no}</td>
      <td className="wrap">{row.stepName}</td>
      <td className="wrap tiny">{ppes.join(", ")}</td>
      <td className="wrap tiny">{row.hazardCode ? codeLabel(settings, row.hazardCode) : ""}</td>
      <td className="wrap">{row.factor}</td>
      <td className="wrap tiny">
        {actions.map((a) => (
          <span key={a} className="chk">
            ■ {a}
          </span>
        ))}
      </td>
      <td className="num">{row.s ?? ""}</td>
      <td className="num">{row.p ?? ""}</td>
      <td className="num strong">{risk ?? ""}</td>
      <td className={`num ${risk !== null && risk >= threshold ? "deny" : "allow"}`}>
        {risk === null ? "" : risk >= threshold ? "허용 불가능" : "허용 가능"}
      </td>
      <td className="wrap">{row.measure}</td>
      <td className="num">{row.s2 ?? ""}</td>
      <td className="num">{row.p2 ?? ""}</td>
      <td className="num strong">{post ?? ""}</td>
      <td className="num">{row.owner}</td>
      <td className="wrap tiny">{row.opinion}</td>
    </tr>
  );
}
