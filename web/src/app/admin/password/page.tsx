import { PasswordScreen } from "@/components/auth/PasswordScreen";

export const metadata = { title: "비밀번호 변경" };

export default function PasswordPage() {
  return <PasswordScreen loginPath="/admin/login" />;
}
