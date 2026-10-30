"use client";

import { startTransition, useActionState } from "react";
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
    <form
      /*
        `action=` 으로 넘기면 React 19 가 제출 뒤 입력칸을 **전부 비운다.**
        「비밀번호가 서로 다릅니다」 한 번에 이름·번호까지 다시 쳐야 했다
        (2026-09-30). 제출을 직접 받아 칸을 그대로 둔다.
      */
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-4"
    >
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
      {/*
        이 화면의 유일한 동작이라 폭을 다 쓴다. 먹색으로 (2026-10-28) — 테두리
        없는 카드와 옅은 칸 사이에서 파랑 상자만 겉돌았다.
      */}
      <button
        type="submit"
        disabled={pending}
        className="text-item mt-2 h-13 w-full rounded-lg font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "var(--ink)", color: "var(--page)" }}
      >
        {pending ? "잠시만요…" : submitLabel}
      </button>
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
      <span className="text-axis text-ink-secondary font-medium group-focus-within:text-ink">
        {label}
      </span>
      {/*
        칸은 테두리 대신 옅은 바탕으로 (2026-10-28 — 정안 시안처럼). 초점이 오면
        바탕이 한 단 진해지고 바깥에 먹색 고리가 둘린다.
      */}
      <input
        name={name}
        type={type}
        className="text-table h-12 rounded-lg bg-(--wash)/60 px-4 transition-colors placeholder:text-(--ink-muted) focus:bg-(--wash) focus:outline-2 focus:outline-offset-0 focus:outline-(--ink)/30"
        {...rest}
      />
      {hint && <span className="text-axis text-ink-muted">{hint}</span>}
    </label>
  );
}
