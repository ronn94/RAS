import * as React from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button, Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** 브라우저가 설치 가능하다고 알리는 이벤트는 한 번만, 그것도 로그인 화면이 뜨기 전에 올 수 있어 모듈에서 붙잡아 둔다 */
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((fn) => fn());
  });
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallAppButton() {
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  const [guideOpen, setGuideOpen] = React.useState(false);

  React.useEffect(() => {
    listeners.add(tick);
    return () => void listeners.delete(tick);
  }, []);

  if (isInstalled()) return null;

  const onClick = async () => {
    if (deferred) {
      const ev = deferred;
      deferred = null;
      await ev.prompt();
      await ev.userChoice;
      tick();
      return;
    }
    setGuideOpen(true);
  };

  const ios = isIos();

  return (
    <>
      <Button variant="outline" size="lg" className="w-full" onClick={() => void onClick()}>
        <Download className="size-3.5" />
        앱 설치 · 홈 화면에 추가
      </Button>

      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)}>
        <DialogHeader>
          <DialogTitle>홈 화면에 추가하기</DialogTitle>
        </DialogHeader>
        {ios ? (
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Share className="mt-0.5 size-4 shrink-0" />
              <span>Safari 하단(또는 상단)의 <b>공유</b> 버튼을 누릅니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <SquarePlus className="mt-0.5 size-4 shrink-0" />
              <span><b>홈 화면에 추가</b>를 선택한 뒤 <b>추가</b>를 누릅니다.</span>
            </li>
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            브라우저 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택하세요. 메뉴에 보이지 않으면 Chrome·Safari 등 기본 브라우저에서 이 주소를 다시 열어 주세요.
          </p>
        )}
        <DialogFooter>
          <Button onClick={() => setGuideOpen(false)}>확인</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
