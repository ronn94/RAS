/**
 * 새로고침 버튼 — 모든 화면의 상단 고정 헤더 오른쪽 끝에 붙는다.
 *
 * 브라우저를 다시 여는 것(F5)이 아니라 **서버 자료만 다시 받는다**(`reload`). 다른 기기에서
 * 누가 서명하거나 문서를 등록했을 때, 보던 화면과 열어 둔 문서를 그대로 둔 채 최신 상태로
 * 맞추는 자리다.
 *
 * 누르면 아이콘이 돈다. 서버가 빨리 답하면 깜빡임이 너무 짧아 눌린 줄도 모르므로,
 * 최소 시간만큼은 돌려 두어 "받아 왔다"는 것이 눈에 남게 한다.
 */
import * as React from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

/** 아이콘이 최소한 이만큼은 돌아야 사람이 알아본다 */
const MIN_SPIN_MS = 500;

export function RefreshButton() {
  const { reload } = useStore();
  const [busy, setBusy] = React.useState(false);
  /** 언마운트된 뒤에 setState가 불리지 않게 — 화면을 옮기며 눌러도 경고가 나지 않는다 */
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.all([reload(), new Promise((r) => setTimeout(r, MIN_SPIN_MS))]);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={busy}
      onClick={() => void run()}
      aria-label="새로고침"
      title={busy ? "불러오는 중…" : "서버에서 최신 자료를 다시 받습니다"}
    >
      <RotateCw className={cn(busy && "animate-spin")} />
    </Button>
  );
}
