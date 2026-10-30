import Link from "next/link";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { authCard } from "@/components/auth/authCard";
import { signup } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";

export const metadata = { title: "회원가입 — 7가지 성향 검사" };

/**
 * 회원가입 — **한 화면에 다 들어오게** 두 단으로 (2026-10-28 사용자 결정).
 *
 * 전에는 칸 넷과 개인정보 안내가 한 줄로 쌓여 노트북에서 두 번은 내려야 했다.
 * 넓은 화면에서는 왼쪽에 칸(이름 · 번호 / 비밀번호 · 확인을 두 칸씩), 오른쪽에
 * 개인정보 안내를 옅은 바탕 띠로 둔다. 좁은 화면에서는 위아래로 쌓인다.
 */
export default function SignupPage() {
  return (
    <div className={`${authCard} max-w-4xl`}>
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <h1 className="mb-1.5 text-[1.75rem] leading-tight font-semibold">회원가입</h1>
          <p className="text-table text-ink-secondary mb-7">
            처음 한 번만 가입하면 됩니다. 다음부터는 이 번호로 로그인합니다.
          </p>

          <AuthForm action={signup} submitLabel="가입하고 시작하기">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </AuthForm>

          <p className="text-table text-ink-secondary mt-6 text-center">
            이미 계정이 있으면{" "}
            <Link href="/login" className="text-ink font-medium underline underline-offset-4">
              로그인
            </Link>
          </p>
        </div>

        {/*
          개인정보 고지는 동의를 받는 자리인 가입 화면에 둔다 (00 D-14).
          선으로 가르지 않고 옅은 바탕 띠에 담는다 (2026-10-28).
        */}
        <section className="text-axis text-ink-secondary self-start rounded-xl bg-(--wash)/50 px-5 py-5">
          <h2 className="text-table text-ink mb-3 font-semibold">개인정보 안내</h2>
          <dl className="flex flex-col gap-2">
            {[
              ["수집 항목", "이름, 휴대폰번호, 설문 응답"],
              ["목적", "사내 성향·직무능력 파악과 분석"],
              ["열람 범위", "본인과 관리자"],
              ["보관 기간", "별도 정책이 정해질 때까지 보관"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                <dt className="text-ink font-medium">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">응답 시간과 응답을 바꾼 횟수가 함께 기록됩니다.</p>
        </section>
      </div>
    </div>
  );
}
