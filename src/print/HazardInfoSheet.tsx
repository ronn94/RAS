/**
 * 유해·위험 정보 인쇄 서식 — 첨부 원본(유해위험정보.pdf) 구조 재현.
 * A4 가로 · 여백 0. '그 밖의 유해위험정보'는 원본대로 문서 1장당 1세트이며
 * 공정순서 행 전체를 병합한 우측 칸에 들어간다.
 */
import { FitText } from "@/print/FitText";
import type { HazardInfo, YesNo } from "@/lib/types";
import { useStore } from "@/store";

function Box({ on }: { on?: boolean }) {
  return <span className="chk">{on ? "✓" : ""}</span>;
}

function YN({ flag }: { flag: YesNo }) {
  return (
    <>
      무 <Box on={flag === "무"} /> &nbsp;&nbsp; 유 <Box on={flag === "유"} />
    </>
  );
}

function G({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="extra-group">
      <div className="t">◆ {title}</div>
      {children}
    </div>
  );
}

export function HazardInfoSheet({ info }: { info: HazardInfo }) {
  const { settings } = useStore();
  const ap = settings.org.approver;
  const e = info.extra;
  const steps = info.steps.length ? info.steps : [];

  return (
    <div className="print-root sheet sheet-hazard">
      <style>{"@page{size:A4 landscape;margin:15mm}"}</style>
      <div className="print-page">
        {/* 머리말 — 대상시설·공정명 / 제목 / 결재란 */}
        <table>
          <colgroup>
            <col style={{ width: "22mm" }} />
            <col style={{ width: "38mm" }} />
            <col />
            <col style={{ width: "25mm" }} />
            <col style={{ width: "25mm" }} />
            <col style={{ width: "25mm" }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="lbl">대상시설</td>
              <td>
                <FitText>{info.facility}</FitText>
              </td>
              <td className="head-title" rowSpan={2}>
                유해 · 위험 정보
              </td>
              <th>담 당</th>
              <th>검 토</th>
              <th>승 인</th>
            </tr>
            <tr>
              <td className="lbl">공 정 명</td>
              <td>
                <FitText>{info.process}</FitText>
              </td>
              <td className="approval num">{ap.charge}</td>
              <td className="approval num">{ap.review}</td>
              <td className="approval num">{ap.approve}</td>
            </tr>
          </tbody>
        </table>

        {/* 본표 */}
        <div className="steps">
          <table>
            <colgroup>
              <col style={{ width: "30mm" }} />
              <col style={{ width: "30mm" }} />
              <col style={{ width: "15mm" }} />
              <col style={{ width: "28mm" }} />
              <col style={{ width: "18mm" }} />
              <col style={{ width: "18mm" }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2}>공정(작업)순서</th>
                <th colSpan={2}>기계 · 기구 및 설비</th>
                <th colSpan={3}>유해화학물질 등 취급물질</th>
                <th rowSpan={2}>
                  그 밖의 유해위험정보 <span style={{ fontWeight: 400 }}>(유/무 Check)</span>
                </th>
              </tr>
              <tr>
                <th>기계 · 기구 및 설비명</th>
                <th>수량</th>
                <th>화학물질명</th>
                <th>취급량/일</th>
                <th>취급시간</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={s.id}>
                  <td className="num">
                    <FitText>{s.order}</FitText>
                  </td>
                  <td>
                    <FitText>{s.equipName}</FitText>
                  </td>
                  <td className="num">
                    <FitText>{s.equipQty}</FitText>
                  </td>
                  <td>
                    <FitText>{s.chemName}</FitText>
                  </td>
                  <td className="num">
                    <FitText>{s.chemAmount}</FitText>
                  </td>
                  <td className="num">
                    <FitText>{s.chemTime}</FitText>
                  </td>
                  {i === 0 && (
                    <td className="extra" rowSpan={steps.length}>
                      <div className="extra-fill">
                      <G title="3년간 재해발생 사례">
                        <table>
                          <tbody>
                            <tr>
                              <td style={{ width: "28mm" }}>
                                <YN flag={e.accident3y.flag} />
                              </td>
                              <td>재해내용: {e.accident3y.detail}</td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="아차사고 사례">
                        <table>
                          <tbody>
                            <tr>
                              <td style={{ width: "28mm" }}>
                                <YN flag={e.nearMiss.flag} />
                              </td>
                              <td>사례내용: {e.nearMiss.detail}</td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="교대작업 유무">
                        <table>
                          <tbody>
                            <tr>
                              <td className="num">
                                교대작업 유 <Box on={e.shiftWork === "유"} />
                              </td>
                              <td className="num">
                                교대작업 무 <Box on={e.shiftWork === "무"} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="근로자 구성 및 경력 특성">
                        <table>
                          <tbody>
                            <tr>
                              <td className="num">
                                여성근로자 <Box on={e.workers.female} />
                              </td>
                              <td className="num">
                                1년 미만 미숙련자 <Box on={e.workers.novice} />
                              </td>
                            </tr>
                            <tr>
                              <td className="num">
                                고령근로자 <Box on={e.workers.elderly} />
                              </td>
                              <td className="num">
                                비정규직 근로자 <Box on={e.workers.irregular} />
                              </td>
                            </tr>
                            <tr>
                              <td className="num">
                                외국인 근로자 <Box on={e.workers.foreign} />
                              </td>
                              <td className="num">
                                장애근로자 <Box on={e.workers.disabled} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="운반수단">
                        <table>
                          <tbody>
                            <tr>
                              <th style={{ width: "28mm" }}>구 분</th>
                              <th>내 용</th>
                            </tr>
                            <tr>
                              <td className="num">
                                기계 <Box on={e.transport.machine} />
                              </td>
                              <td>{e.transport.machineNote}</td>
                            </tr>
                            <tr>
                              <td className="num">
                                인력 <Box on={e.transport.manual} />
                              </td>
                              <td>{e.transport.manualNote}</td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="중량물 인력취급시 단위중량(12kg) 및 취급형태">
                        <table>
                          <tbody>
                            <tr>
                              <td className="num">
                                들기 <Box on={e.heavyLoad.lift} />
                              </td>
                              <td className="num">
                                밀기 <Box on={e.heavyLoad.push} />
                              </td>
                              <td className="num">
                                끌기 <Box on={e.heavyLoad.pull} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="안전작업계획·허가서 필요작업 유무">
                        <table>
                          <tbody>
                            <tr>
                              <th style={{ width: "28mm" }}>구 분</th>
                              <th>내 용</th>
                            </tr>
                            <tr>
                              <td className="num">
                                작업계획 · 허가서 <Box on={e.permit.required} />
                              </td>
                              <td rowSpan={2}>{e.permit.note || "EX) 하역운반기계, 중량물취급계획서"}</td>
                            </tr>
                            <tr>
                              <td className="num">
                                해당없음 <Box on={e.permit.none} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="작업환경측정">
                        <table>
                          <tbody>
                            <tr>
                              <td className="num">
                                측정 <Box on={e.envMeasure === "측정"} />
                              </td>
                              <td className="num">
                                미측정 <Box on={e.envMeasure === "미측정"} />
                              </td>
                              <td className="num">
                                해당없음 <Box on={e.envMeasure === "해당없음"} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </G>

                      <G title="작업에 대한 특별안전교육 필요">
                        <table>
                          <tbody>
                            <tr>
                              <td style={{ width: "28mm" }}>
                                <YN flag={e.specialEdu.flag} />
                              </td>
                              <td>대상항목: {e.specialEdu.detail}</td>
                            </tr>
                          </tbody>
                        </table>
                      </G>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
