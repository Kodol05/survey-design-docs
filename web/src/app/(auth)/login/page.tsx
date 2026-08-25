import Link from "next/link";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { login } from "@/lib/auth/actions";

export const metadata = { title: "로그인 — 7차원 성향 설문" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-screen-title mb-2">로그인</h1>
      <p className="text-ink-secondary mb-8">가입할 때 쓴 휴대폰번호로 들어오시면 됩니다.</p>

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

      <p className="text-table text-ink-secondary mt-8 text-center">
        아직 계정이 없으면 <Link href="/signup" className="underline">회원가입</Link>
      </p>

      {/* 아래 둘은 가끔 필요한 것이라 한 단 내려 둔다 */}
      <div className="text-axis text-ink-muted mt-12 flex flex-col gap-2 border-t border-[--border] pt-6 text-center">
        <p>비밀번호를 잊으셨으면 관리자에게 초기화를 요청해 주세요.</p>
        <p>
          <Link href="/admin/login" className="underline">관리자 로그인</Link>
        </p>
      </div>
    </>
  );
}
