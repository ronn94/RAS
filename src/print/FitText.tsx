import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 칸 너비(또는 높이)에 맞춰 글자를 자동으로 줄인다.
 * 사용자 확정 정책: 최대 50%까지 축소하고, 그래도 넘치면 줄바꿈한다.
 *  - mode="line"  : 한 줄 유지. 폭 기준 축소, 하한(50%)에서도 넘치면 줄바꿈 허용.
 *  - mode="block" : 여러 줄 허용(위험내용·개선내용). 칸 높이 기준 축소.
 */
const MIN_SCALE = 0.5;

function innerBox(box: HTMLElement) {
  const cs = getComputedStyle(box);
  return {
    w: box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    h: box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
  };
}

export function FitText({
  children,
  mode = "line",
  className,
}: {
  children: React.ReactNode;
  mode?: "line" | "block";
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [scale, setScale] = React.useState(1);
  const [wrapped, setWrapped] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;

    // 측정 전 초기화
    el.style.fontSize = "";
    el.style.whiteSpace = mode === "line" ? "nowrap" : "pre-wrap";

    const avail = innerBox(box);
    let next = 1;
    let needsWrap = false;

    if (mode === "line") {
      // 실제 콘텐츠 폭을 재려면 max-content로 펼쳐서 측정해야 한다
      el.style.display = "inline-block";
      el.style.width = "max-content";
      const needed = el.getBoundingClientRect().width;
      el.style.width = "";
      el.style.display = "";
      if (needed > 0 && avail.w > 0 && needed > avail.w) {
        next = Math.max(MIN_SCALE, avail.w / needed);
        needsWrap = avail.w / needed < MIN_SCALE;
      }
    } else {
      const needed = el.scrollHeight;
      if (needed > 0 && avail.h > 0 && needed > avail.h) {
        next = Math.max(MIN_SCALE, avail.h / needed);
      }
    }

    setScale(next);
    setWrapped(needsWrap);
  }, [children, mode]);

  return (
    <span
      ref={ref}
      className={cn(mode === "line" ? "fit-line" : "fit-block", className)}
      style={{
        fontSize: scale === 1 ? undefined : `${(scale * 100).toFixed(1)}%`,
        whiteSpace: mode === "block" || wrapped ? "pre-wrap" : "nowrap",
        wordBreak: mode === "block" || wrapped ? "break-word" : undefined,
      }}
    >
      {children}
    </span>
  );
}
