"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { openResultsAction } from "@/lib/admin/actions";

/** 결과 공개 전환 — 되돌릴 수 없으므로 한 번 더 묻는다 (D-33) */
export function OpenResultsButton({ completed }: { completed: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming)
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        결과 공개로 전환
      </Button>
    );

  return (
    <div className="border-l-2 py-1 pl-4" style={{ borderColor: "var(--status-serious)" }}>
      <p className="mb-1 font-medium">되돌릴 수 없습니다.</p>
      <p className="text-table text-ink-secondary mb-4">
        지금 열면 다시 잠글 수 없습니다. 대표님 평가가 모두 들어왔는지 확인하고 눌러 주세요.
        현재 응시 완료 {completed}명입니다.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => start(() => void openResultsAction())} disabled={pending}>
          {pending ? "여는 중…" : "그래도 열기"}
        </Button>
        <Button variant="quiet" onClick={() => setConfirming(false)}>
          취소
        </Button>
      </div>
    </div>
  );
}
