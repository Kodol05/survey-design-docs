"use client";

import { useActionState } from "react";
import { Button } from "../ui/Button";
import type { FormState } from "@/lib/auth/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** 로그인·회원가입·비밀번호 변경이 같은 껍데기를 쓴다 */
export function AuthForm({
  action,
  submitLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {children}
      {state?.error && (
        <p
          role="alert"
          className="text-table rounded-lg px-4 py-3"
          style={{
            background: "color-mix(in oklab, var(--status-critical) 10%, transparent)",
            color: "var(--status-critical)",
          }}
        >
          {state.error}
        </p>
      )}
      {/* 이 화면의 유일한 동작이라 폭을 다 쓴다. 옆에 다른 버튼이 없다 */}
      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending ? "잠시만요…" : submitLabel}
      </Button>
    </form>
  );
}

export function Field({
  label,
  name,
  type = "text",
  hint,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    /*
      칸을 키우고 초점 표시를 분명히 한다 (2026-08-25).

      본문이 21px인데 입력 칸만 44px이라 눌려 보였다. 로그인·가입은 사원이
      **가장 처음 만나는 화면**이라 여기서 받는 인상이 오래 간다.

      `focus-within`으로 라벨까지 같이 반응하게 둔다 — 어느 칸에 있는지가
      테두리 하나보다 분명하게 보인다.
    */
    <label className="group flex flex-col gap-1.5">
      <span className="text-table text-ink-secondary font-medium group-focus-within:text-ink">
        {label}
      </span>
      <input
        name={name}
        type={type}
        className="text-item h-14 rounded-lg border border-[--border] bg-surface px-4 transition-colors focus:border-[--series-1]"
        {...rest}
      />
      {hint && <span className="text-axis text-ink-muted">{hint}</span>}
    </label>
  );
}
