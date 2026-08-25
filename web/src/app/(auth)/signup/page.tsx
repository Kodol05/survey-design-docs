import Link from "next/link";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { signup } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

export const metadata = { title: "회원가입 — 7차원 성향 설문" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-screen-title mb-2">회원가입</h1>
      <p className="text-ink-secondary mb-8">처음 한 번만 만들면 됩니다. 다음부터는 이 번호로 들어오시면 됩니다.</p>

      <AuthForm action={signup} submitLabel="가입하고 시작하기">
        <Field label="이름" name="name" autoComplete="name" required />
        <Field
          label="휴대폰번호"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          placeholder="010-1234-5678"
          hint="이 번호가 아이디가 됩니다"
          required
        />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`${PASSWORD_MIN}자 이상`}
          required
        />
        <Field
          label="비밀번호 확인"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </AuthForm>

      {/* 개인정보 고지는 동의를 받는 자리인 가입 화면에 둔다 (00 D-14) */}
      <section className="text-axis text-ink-secondary mt-12 border-t border-[--border] pt-6">
        <h2 className="mb-3 font-medium text-ink">개인정보 안내</h2>
        <dl className="flex flex-col gap-1">
          <div><dt className="inline font-medium">수집 항목 </dt><dd className="inline">이름, 휴대폰번호, 설문 응답</dd></div>
          <div><dt className="inline font-medium">목적 </dt><dd className="inline">사내 성향·직무능력 파악과 분석</dd></div>
          <div><dt className="inline font-medium">열람 범위 </dt><dd className="inline">본인과 관리자</dd></div>
          <div><dt className="inline font-medium">보관 기간 </dt><dd className="inline">별도 정책이 정해질 때까지 보관</dd></div>
        </dl>
        <p className="mt-2">응답 시간과 응답을 바꾼 횟수가 함께 기록됩니다.</p>
      </section>

      <p className="text-table text-ink-secondary mt-10 text-center">
        이미 계정이 있으면 <Link href="/login" className="underline">로그인</Link>
      </p>
    </>
  );
}
