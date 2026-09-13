/**
 * TBM 회의록 인쇄 서식 — A4 세로.
 *
 * BP 안전포털에서 쓰던 `Tool Box Meeting 회의록` 레이아웃을 그대로 옮겼다(개요표 →
 * 작업자 PMIS Check → 참석자 명단 → 퇴거조치자). 다른 RAS 서식과 달리 번호 구간을
 * 쓰지 않고 `■ 제목` 형태를 유지한 것도 원본을 따른 것이다 — 이미 이 모양으로
 * 결재를 받아 온 서류라 모양이 달라지면 현장에서 다른 서류로 본다.
 *
 * 참석자가 많으면 명단이 다음 장으로 넘어간다. 작업평가와 같은 **실측 방식**으로
 * 나눈다 — 화면 밖에서 한 번 그려 실제 줄 높이를 잰 뒤 그 값으로 쪽을 자른다.
 * 서명을 아직 못 받은 사람은 빈칸으로 남겨 인쇄 후 수기로 받을 수 있게 한다.
 */
import * as React from "react";
import { photoUrl } from "@/lib/db";
import {
  TBM_PMIS_GROUPS,
  TBM_WORK_TYPES,
  tbmMeasureLines,
  tbmWorkLine,
  type Tbm,
  type TbmParticipant,
  type TbmRisk,
} from "@/lib/routine";
import { useStore } from "@/store";

/** A4 세로 297mm − 상하 여백 13mm/15mm */
const PAGE_CONTENT_MM = 269;
/** 반올림 오차로 한 줄이 넘치는 것을 막는 여유 */
const SAFETY_MM = 4;
const PX_PER_MM = 96 / 25.4;
/** 참석자 명단은 원본과 같이 한 줄에 세 명(이름·서명 쌍 3벌) */
const SIGN_COLS = 3;

const check = (on: boolean) => (on ? "☑" : "☐");

/** 개요표 — 1쪽에만 싣는다 */
function Overview({ v, risks }: { v: Tbm; risks: TbmRisk[] }) {
  const selected = new Set(v.risks);
  const place = v.location === "기타" ? `기타(${v.otherLocation})` : v.location;

  return (
    <>
      <div className="sec">■ TBM 개요</div>
      <table className="head">
        <colgroup>
          <col style={{ width: "26mm" }} />
          <col />
          <col style={{ width: "38mm" }} />
          <col style={{ width: "42mm" }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="lbl">TBM 일시</td>
            <td className="num">
              {v.date} {v.time}
            </td>
            <td colSpan={2} className="same-date">
              작업날짜와 동일함 ({check(v.sameWorkDate)} 예 {check(!v.sameWorkDate)} 아니오)
            </td>
          </tr>
          <tr>
            <td className="lbl">TBM 장소</td>
            <td>{place}</td>
            <td className="lbl">작업 위험성평가 및 교육실시 여부</td>
            <td className="num">
              {check(v.riskAssessmentDone)} 예 {check(!v.riskAssessmentDone)} 아니오
            </td>
          </tr>
          <tr>
            <td className="lbl">작업유형</td>
            <td colSpan={3}>
              {TBM_WORK_TYPES.map((t) => (
                <span key={t} className="inline-check">
                  {check(v.workTypes.includes(t))} {t}
                </span>
              ))}
            </td>
          </tr>
          <tr>
            <td className="lbl">작업내용</td>
            <td colSpan={3} className="wrap work-desc">
              {tbmWorkLine(v)}
            </td>
          </tr>
          <tr>
            <td className="lbl">위험요인</td>
            <td colSpan={3}>
              <div className="risk-grid">
                {risks.map((r) => (
                  <span key={r.key} className="risk">
                    {check(selected.has(r.key))} {r.label}
                  </span>
                ))}
              </div>
            </td>
          </tr>
          <tr>
            <td className="lbl">안전대책</td>
            <td colSpan={3}>
              <div className="measure-grid">
                {tbmMeasureLines(v, risks).map((x) => (
                  <div key={x.key}>
                    ☑ [{x.label}] {x.text}
                  </div>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="sec">■ 작업자 PMIS Check</div>
      <table className="pmis">
        <tbody>
          {[0, 2].map((start) => (
            <tr key={start}>
              {TBM_PMIS_GROUPS.slice(start, start + 2).map((g) => (
                <React.Fragment key={g.title}>
                  <th className="pmis-group">
                    {g.title}
                    <br />({g.korean})
                  </th>
                  <td className="pmis-items">
                    {g.items.map((item) => (
                      <div key={item.key}>
                        <span>• {item.label}</span>
                        <span>
                          <span className={`pmis-choice ${v.pmis[item.key] === item.first ? "selected" : ""}`}>
                            {item.first} {check(v.pmis[item.key] === item.first)}
                          </span>
                          ,{" "}
                          <span className={`pmis-choice ${v.pmis[item.key] === item.second ? "selected" : ""}`}>
                            {item.second} {check(v.pmis[item.key] === item.second)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </td>
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="leader">
        <div className="sec">■ 참석자 명단</div>
        <div className="leader-info">
          <strong>TBM 리더 : {v.leaderName}</strong>
          {v.leaderSign ? <img src={photoUrl(v.leaderSign)} alt="" /> : <span className="leader-blank" />}
        </div>
      </div>
    </>
  );
}

/** 참석자 명단 표 — 한 줄에 세 명씩. 쪽이 넘어가도 머리글은 다시 찍는다 */
function SignTable({ rows }: { rows: TbmParticipant[][] }) {
  return (
    <table className="signs">
      <colgroup>
        {Array.from({ length: SIGN_COLS }, (_, i) => (
          <React.Fragment key={i}>
            <col style={{ width: "22mm" }} />
            <col />
          </React.Fragment>
        ))}
      </colgroup>
      <thead>
        <tr>
          {Array.from({ length: SIGN_COLS }, (_, i) => (
            <React.Fragment key={i}>
              <th>이름</th>
              <th>서명</th>
            </React.Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {Array.from({ length: SIGN_COLS }, (_, i) => {
              const p = row[i];
              return (
                <React.Fragment key={i}>
                  <td className="who">{p ? p.name : ""}</td>
                  {/* 서명을 못 받았으면 빈칸으로 남겨 인쇄 후 수기로 받는다 */}
                  <td className="sign-cell">{p?.sign ? <img src={photoUrl(p.sign)} alt="" /> : null}</td>
                </React.Fragment>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 퇴거조치자 — 마지막 쪽 맨 아래 */
function Removal({ v }: { v: Tbm }) {
  return (
    <table className="removal">
      <colgroup>
        <col />
        <col style={{ width: "60mm" }} />
      </colgroup>
      <tbody>
        <tr>
          <td className="lbl">작업자 PMIS Check 유, 불 및 필수 안전조치 사항 미이행 퇴거조치자</td>
          <td>{v.removalPerson}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function TbmSheet({ tbm: v }: { tbm: Tbm }) {
  const { settings } = useStore();
  const risks = settings.tbmRisks;

  const measureRef = React.useRef<HTMLDivElement>(null);
  const finalRef = React.useRef<HTMLDivElement>(null);
  const [pages, setPages] = React.useState<TbmParticipant[][][] | null>(null);
  const verifyCount = React.useRef(0);
  const [verified, setVerified] = React.useState(false);

  /** 한 줄에 세 명씩 끊은 전체 명단 */
  const allRows = React.useMemo(() => {
    const rows: TbmParticipant[][] = [];
    for (let i = 0; i < v.participants.length; i += SIGN_COLS) {
      rows.push(v.participants.slice(i, i + SIGN_COLS));
    }
    // 명단이 비어 있어도 수기로 적을 수 있게 한 줄은 남긴다
    return rows.length > 0 ? rows : [[]];
  }, [v.participants]);

  const signature = JSON.stringify([v.participants, v.risks, v.measures, v.customMeasures, v.workDescription]);
  React.useLayoutEffect(() => {
    setPages(null);
    setVerified(false);
    verifyCount.current = 0;
  }, [signature]);

  /** el 안의 개요·표머리·줄 높이를 실측해 명단을 쪽마다 나눈다 */
  const computeChunks = React.useCallback(
    (el: HTMLElement): TbmParticipant[][][] => {
      const height = (node: Element | null) => node?.getBoundingClientRect().height ?? 0;
      const titleHeight = height(el.querySelector(".sheet-title"));
      const firstUsed =
        titleHeight +
        height(el.querySelector(".overview")) +
        height(el.querySelector(".signs thead")) +
        height(el.querySelector(".removal"));
      // 2쪽부터는 제목과 표 머리글만 반복된다(퇴거조치자는 마지막 쪽에만 붙는다)
      const continuedUsed = titleHeight + height(el.querySelector(".signs thead")) + height(el.querySelector(".removal"));
      const budget = (PAGE_CONTENT_MM - SAFETY_MM) * PX_PER_MM;

      const trs = [...el.querySelectorAll<HTMLTableRowElement>(".signs tbody tr")];
      const chunks: TbmParticipant[][][] = [];
      let current: TbmParticipant[][] = [];
      let used = 0;
      let available = budget - firstUsed;

      trs.forEach((tr, i) => {
        const h = tr.getBoundingClientRect().height;
        if (current.length > 0 && used + h > available) {
          chunks.push(current);
          current = [];
          used = 0;
          available = budget - continuedUsed;
        }
        current.push(allRows[i]);
        used += h;
      });
      if (current.length > 0) chunks.push(current);
      return chunks.length > 0 ? chunks : [[[]]];
    },
    [allRows],
  );

  // 1단계: 화면 밖에서 전체를 한 번 그려 높이를 잰다
  React.useLayoutEffect(() => {
    if (pages !== null) return;
    const el = measureRef.current;
    if (!el) return;
    setPages(computeChunks(el));
  }, [pages, computeChunks]);

  // 2단계: 실제로 그려진 쪽을 다시 실측해 어긋난 부분을 바로잡는다(작업평가와 같은 방식)
  React.useLayoutEffect(() => {
    if (pages === null || verified) return;
    const el = finalRef.current;
    if (!el) return;
    if (verifyCount.current >= 3) {
      setVerified(true);
      return;
    }
    verifyCount.current += 1;
    const recomputed = computeChunks(el);
    const same = recomputed.length === pages.length && recomputed.every((chunk, i) => chunk.length === pages[i].length);
    if (same) setVerified(true);
    else setPages(recomputed);
  }, [pages, verified, computeChunks]);

  if (pages === null) {
    return (
      <div className="print-root sheet sheet-tbm" ref={measureRef} aria-hidden>
        <div className="print-page">
          <div className="sheet-title">Tool Box Meeting 회의록</div>
          <div className="overview">
            <Overview v={v} risks={risks} />
          </div>
          <SignTable rows={allRows} />
          <Removal v={v} />
        </div>
      </div>
    );
  }

  return (
    <div className="print-root sheet sheet-tbm" ref={finalRef}>
      <style>{"@page{size:A4 portrait;margin:13mm 12mm 15mm}"}</style>
      {pages.map((rows, p) => (
        <div className="print-page" key={p}>
          <div className="sheet-title">
            Tool Box Meeting 회의록
            {pages.length > 1 ? (
              <span className="page-no">
                {" "}
                ({p + 1}/{pages.length})
              </span>
            ) : null}
          </div>
          {p === 0 && (
            <div className="overview">
              <Overview v={v} risks={risks} />
            </div>
          )}
          <SignTable rows={rows} />
          {/* 퇴거조치자는 명단이 다 끝난 마지막 쪽에만 붙는다 */}
          {p === pages.length - 1 && <Removal v={v} />}
          <div className="org">{settings.org.orgName}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * 미리보기 화면용 — 실제 인쇄(A4 여러 장)와 달리 쪽을 나누지 않고 이어서 보여준다.
 * `.print-root`가 아니라서 인쇄할 때는 찍히지 않는다(실제 인쇄물은 TbmSheet가 맡는다).
 */
export function TbmContinuousSheet({ tbm: v }: { tbm: Tbm }) {
  const { settings } = useStore();
  const rows: TbmParticipant[][] = [];
  for (let i = 0; i < v.participants.length; i += SIGN_COLS) rows.push(v.participants.slice(i, i + SIGN_COLS));

  return (
    <div className="sheet sheet-tbm">
      <div className="print-page">
        <div className="sheet-title">Tool Box Meeting 회의록</div>
        <Overview v={v} risks={settings.tbmRisks} />
        <SignTable rows={rows.length > 0 ? rows : [[]]} />
        <Removal v={v} />
        <div className="org">{settings.org.orgName}</div>
      </div>
    </div>
  );
}
