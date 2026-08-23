import Link from "next/link";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { login } from "@/lib/auth/actions";

export const metadata = { title: "로그인 — 7차원 성향 설문" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-screen-title mb-6">로그인</h1>

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
        아직 계정이 없으면 <Link href="/signup" className="underline">회원가입</Link>
      </p>
      <p className="text-axis text-ink-muted mt-8 text-center">
        비밀번호를 잊으셨으면 관리자에게 초기화를 요청해 주세요.
      </p>
      <p className="text-axis text-ink-muted mt-2 text-center">
        <Link href="/admin/login" className="underline">관리자 로그인</Link>
      </p>
    </>
  );
}
