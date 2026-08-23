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
    <form action={formAction} className="flex flex-col gap-4">
      {children}
      {state?.error && (
        <p role="alert" className="text-table" style={{ color: "var(--status-critical)" }}>
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
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
    <label className="flex flex-col gap-1.5">
      <span className="text-table font-medium">{label}</span>
      <input
        name={name}
        type={type}
        className="h-11 rounded-lg border border-[--border] bg-surface px-3"
        {...rest}
      />
      {hint && <span className="text-axis text-ink-muted">{hint}</span>}
    </label>
  );
}
