"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { resetPasswordAction } from "@/lib/admin/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

/**
 * 비밀번호 초기화 (F-43).
 * 임시 비밀번호를 알려주고, 본인이 다음 로그인 때 바꾸게 한다.
 *
 * 구성원 상세 아래 「관리」 한 줄에 들어간다 (2026-10-07 사용자 결정) —
 * 그래서 이름표 · 칸 · 버튼을 가로 한 줄로 둔다. 하는 일은 그대로다.
 */
export function ResetPassword({ employeeId, name }: { employeeId: string; name: string }) {
  const [temp, setTemp] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done)
    return (
      <div className="text-table flex flex-wrap items-center gap-x-3 gap-y-1">
        <p>초기화했습니다. {name} 님께 임시 비밀번호를 전해 주세요.</p>
        <p className="tabular rounded-lg px-3 py-1.5 font-mono" style={{ background: "var(--wash)" }}>
          {temp}
        </p>
        <p className="text-axis text-ink-muted">
          다음 로그인 때 본인이 새 비밀번호를 정하게 됩니다.
        </p>
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label className="flex items-center gap-3">
        <span className="text-table text-ink-secondary">비밀번호 초기화</span>
        <input
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          className="text-table bg-card h-11 w-60 rounded-lg border border-(--border) px-3"
          placeholder={`임시 비밀번호 ${PASSWORD_MIN}자 이상`}
          aria-label="임시 비밀번호"
        />
      </label>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (temp.length < PASSWORD_MIN) {
            setError(`${PASSWORD_MIN}자 이상 입력해 주세요`);
            return;
          }
          setError(null);
          /*
            액션이 이제 예외 대신 **문장을 돌려준다.** 서버 오류 원문이
            화면에 그대로 찍히던 것을 막기 위해서다 (로그인 쪽과 같은 규칙).
          */
          start(async () => {
            const r = await resetPasswordAction(employeeId, temp);
            if (r?.error) setError(r.error);
            else setDone(true);
          });
        }}
      >
        {pending ? "처리 중…" : "초기화"}
      </Button>
      {error && (
        <p role="alert" className="text-table" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
