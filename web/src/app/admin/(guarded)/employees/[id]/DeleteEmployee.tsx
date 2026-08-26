"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteEmployeeAction } from "@/lib/admin/actions";

/**
 * 직원 완전 삭제.
 *
 * 되돌릴 수 없는 자리라 **세 겹**으로 막는다.
 *
 *  1. 평소에는 접혀 있다 — 다른 버튼 옆에 나란히 두지 않는다
 *  2. 무엇이 지워지는지 이름을 붙여 적는다 — "정말 지울까요?"만으로는
 *     응답 120개가 같이 간다는 것이 안 보인다
 *  3. 이름을 그대로 입력해야 눌린다 — 확인 버튼 한 번은 손이 미끄러진다
 */
export function DeleteEmployee({ employeeId, name }: { employeeId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-axis text-ink-muted underline"
      >
        이 사람 기록 완전 삭제
      </button>
    );

  return (
    <div
      className="border-l-2 py-2 pl-4"
      style={{ borderColor: "var(--status-critical)" }}
    >
      <p className="text-table mb-1 font-medium">되돌릴 수 없습니다.</p>
      <p className="text-axis text-ink-secondary mb-4 max-w-[42rem]">
        <strong>{name}</strong> 님의 계정과 함께 <strong>설문 응답 · 채점 결과 · 응답
        신뢰도 · 관리자 평가</strong>가 모두 지워집니다. 분석 화면의 인원도 그만큼
        줄어듭니다.
      </p>

      <label className="text-axis text-ink-secondary mb-2 block">
        지우려면 아래에 <strong className="text-ink">{name}</strong> 을(를) 그대로
        입력해 주세요
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="text-table mt-1 block h-11 w-48 rounded-lg border border-[--border] bg-surface px-3"
          autoComplete="off"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          disabled={pending || typed.trim() !== name}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await deleteEmployeeAction(employeeId, typed);
              if (r?.error) setError(r.error);
            });
          }}
        >
          {pending ? "지우는 중…" : "완전히 지우기"}
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
        >
          취소
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-table mt-3" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
