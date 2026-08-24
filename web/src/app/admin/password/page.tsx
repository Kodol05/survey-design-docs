import { redirect } from "next/navigation";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { changePassword } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "비밀번호 변경" };

export default async function PasswordPage() {
  const me = await currentUser();
  if (!me) redirect("/admin/login");

  const initial = !me.passwordChangedAt;

  return (
    <main className="reading-column flex flex-1 items-center py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-screen-title mb-2">비밀번호 변경</h1>
        {initial && (
          <p className="text-ink-secondary mb-6">
            초기 비밀번호입니다. 바꾸기 전에는 다른 화면으로 갈 수 없습니다.
          </p>
        )}

        <AuthForm action={changePassword} submitLabel="변경">
          {!initial && (
            <Field label="현재 비밀번호" name="currentPassword" type="password" autoComplete="current-password" required />
          )}
          <Field label="새 비밀번호" name="password" type="password" autoComplete="new-password" hint={`${PASSWORD_MIN}자 이상`} required />
          <Field label="새 비밀번호 확인" name="passwordConfirm" type="password" autoComplete="new-password" required />
        </AuthForm>
      </div>
    </main>
  );
}
