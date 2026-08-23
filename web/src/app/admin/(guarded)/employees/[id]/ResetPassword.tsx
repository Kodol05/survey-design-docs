"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { resetPasswordAction } from "@/lib/admin/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

/**
 * 비밀번호 초기화 (F-43).
 * 임시 비밀번호를 알려주고, 본인이 다음 로그인 때 바꾸게 한다.
 */
export function ResetPassword({ employeeId, name }: { employeeId: string; name: string }) {
  const [temp, setTemp] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done)
    return (
      <div>
        <p className="mb-2">
          초기화했습니다. {name} 님께 임시 비밀번호를 전해 주세요.
        </p>
        <p className="tabular rounded-lg border border-[--border] bg-page px-3 py-2 font-mono">
          {temp}
        </p>
        <p className="text-axis text-ink-muted mt-2">
          다음 로그인 때 본인이 새 비밀번호를 정하게 됩니다.
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-table font-medium">임시 비밀번호</span>
        <input
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          className="h-11 rounded-lg border border-[--border] bg-surface px-3"
          placeholder={`${PASSWORD_MIN}자 이상`}
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
          start(async () => {
            try {
              await resetPasswordAction(employeeId, temp);
              setDone(true);
            } catch (e) {
              setError((e as Error).message);
            }
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
