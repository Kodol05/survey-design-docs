"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

/*
  갈래 안에서 그리다 오류가 나면 **머리(메뉴)는 남기고** 본문만 오류 화면으로
  바꾼다 (2026-09-18). 뿌리의 error.tsx 하나뿐이면 메뉴까지 통째로 사라져
  돌아갈 길이 없었다.

  ## 뿌리 것을 그대로 쓰지 않는다 (2026-10-07 사용자 결정)

  전에는 뿌리 `app/error.tsx`를 다시 내보냈다. 그건 화면 전체를 쓰는 틀이라
  관리자 틀 안에서는 **`<main>` 안에 `<main>`이 또 생기고** 위아래 여백이
  크게 벌어졌다. 「관리자에게 알려주시면 됩니다」라는 말도 관리자가 보는
  화면에는 맞지 않았다. 관리자 화면의 다른 덩어리처럼 카드 하나로 세운다.

  ⚠️ 뿌리 것과 같은 약속은 지킨다 — **오류 원문을 화면에 찍지 않는다.**
     원문은 콘솔로, 화면에는 추적용 번호만.

  다시 시도는 `retry`를 쓴다 (Next 16.3부터 정식). `reset`은 화면만 다시
  그려서 서버에서 난 오류(DB 끊김 등)는 그대로 다시 난다. `retry`는 서버
  내용을 다시 받아 온다.
*/
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[render]", error);
  }, [error]);

  return (
    <Panel title="화면을 열지 못했습니다" className="max-w-[40rem]">
      <p className="text-ink-secondary mb-5">잠시 후 다시 시도해 주세요.</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button onClick={() => retry()}>다시 시도</Button>
        <Link href="/admin" className="text-table text-ink-secondary underline">
          대시보드로
        </Link>
      </div>
      {error.digest && (
        <p className="text-axis text-ink-muted tabular mt-5">
          오류 번호 {error.digest}
        </p>
      )}
    </Panel>
  );
}
