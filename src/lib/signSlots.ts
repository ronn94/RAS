/**
 * 미리보기(완성본) 문서 위 서명(2026-11-14) — work-permit 완성본 화면과 같은 방식.
 * 서식의 서명 칸에 이 표시를 붙여 두면 SignablePreview가 강조하고, 누르면 그 자리에서 서명하고,
 * 오른쪽 '서명 현황'을 만든다. target은 기존 서명 팝업이 쓰던 값 그대로(store의 sign 함수에 넘긴다).
 */
export const signSlot = (target: string, sec: string, label: string, signed: boolean) => ({
  "data-sign": target,
  "data-sign-sec": sec,
  "data-sign-label": label,
  "data-signed": signed ? "1" : "0",
});
