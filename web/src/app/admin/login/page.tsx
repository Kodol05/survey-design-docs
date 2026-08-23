import Link from "next/link";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { adminLogin } from "@/lib/auth/actions";

export const metadata = { title: "관리자 로그인" };

export default function AdminLoginPage() {
  return (
    <main className="reading-column flex flex-1 items-center py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-screen-title mb-6">관리자 로그인</h1>
        <AuthForm action={adminLogin} submitLabel="로그인">
          <Field label="아이디" name="loginId" autoComplete="username" required />
          <Field label="비밀번호" name="password" type="password" autoComplete="current-password" required />
        </AuthForm>
        <p className="text-axis text-ink-muted mt-8 text-center">
          관리자 계정은 새로 만들 수 없습니다.
        </p>
        <p className="text-axis text-ink-muted mt-2 text-center">
          <Link href="/login" className="underline">사원 로그인</Link>
        </p>
      </div>
    </main>
  );
}
