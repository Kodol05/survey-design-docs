import Link from "next/link";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { authCard } from "@/components/auth/authCard";
import { login } from "@/lib/auth/actions";

export const metadata = { title: "로그인 — 7가지 성향 검사" };

/**
 * 로그인 — 좁은 카드 하나 (2026-10-28). 제목 · 칸 둘 · 버튼, 그 아래 가끔 필요한
 * 것(비밀번호 분실 · 관리자 로그인)은 옅은 띠 하나에 모은다.
 */
export default function LoginPage() {
  return (
    <div className={`${authCard} max-w-md`}>
      <h1 className="mb-1.5 text-[1.75rem] leading-tight font-semibold">로그인</h1>
      <p className="text-table text-ink-secondary mb-7">가입한 휴대폰번호로 로그인해 주세요.</p>

      <AuthForm action={login} submitLabel="로그인">
        <Field
          label="휴대폰번호"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          placeholder="010-1234-5678"
          required
        />
        <Field label="비밀번호" name="password" type="password" autoComplete="current-password" required />
      </AuthForm>

      <p className="text-table text-ink-secondary mt-6 text-center">
        아직 계정이 없으면{" "}
        <Link href="/signup" className="text-ink font-medium underline underline-offset-4">
          회원가입
        </Link>
      </p>

      {/* 가끔 필요한 것 — 선 대신 옅은 바탕 띠로 한 단 내려 둔다 */}
      <div className="text-axis text-ink-secondary mt-7 flex flex-col items-center gap-1 rounded-lg bg-(--wash)/50 px-4 py-3 text-center">
        <p>비밀번호를 잊으셨으면 관리자에게 초기화를 요청해 주세요.</p>
        <Link href="/admin/login" className="text-ink-muted underline underline-offset-4">
          관리자 로그인
        </Link>
      </div>
    </div>
  );
}
