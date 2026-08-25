"use client";

import { useState, useTransition } from "react";
import { deleteEmployeeAction } from "@/lib/admin/actions";

/**
 * 목록 펼침 패널에서 바로 지우기.
 *
 * ## 상세 화면의 삭제와 무엇이 다른가
 *
 * 상세 화면(`[id]/DeleteEmployee.tsx`)은 **이름을 그대로 입력**해야 눌린다.
 * 거기까지 들어간 사람은 한 명을 확실히 처리하려는 것이라 그만큼 막아도 된다.
 *
 * 여기는 여러 명을 훑으며 정리하는 자리다. **한 번 확인받는 것으로 충분하다** —
 * 이미 그 사람의 그래프와 점수를 눈앞에 펼쳐 놓고 누르는 것이라, 누구를
 * 지우는지 헷갈릴 수가 없다.
 *
 * 그래도 **무엇이 사라지는지는 반드시 적는다.** 「정말 지울까요?」만으로는
 * 설문 응답 114개가 같이 간다는 것이 보이지 않는다.
 */
export function DeleteInline({ employeeId, name }: { employeeId: string; name: string }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!asking)
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-axis text-ink-muted underline"
      >
        기록 삭제
      </button>
    );

  return (
    <div className="text-axis">
      <p className="mb-3 max-w-[22rem] leading-snug">
        <strong className="text-ink">{name}</strong> 님의 계정과 <strong>설문 응답 ·
        결과 · 대표님 평가</strong>가 모두 지워집니다. 되돌릴 수 없습니다.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            // 상세 화면과 달리 이름 입력을 받지 않으므로, 서버에는 원래 이름을 그대로 넘긴다
            start(async () => {
              const r = await deleteEmployeeAction(employeeId, name);
              if (r?.error) setError(r.error);
            });
          }}
          className="text-axis h-10 rounded-lg px-4 font-medium disabled:opacity-50"
          style={{ background: "var(--status-critical)", color: "#fff" }}
        >
          {pending ? "지우는 중…" : "지웁니다"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAsking(false);
            setError(null);
          }}
          className="text-axis text-ink-secondary underline"
        >
          취소
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
