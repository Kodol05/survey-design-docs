import { PasswordScreen } from "@/components/auth/PasswordScreen";

export const metadata = { title: "비밀번호 변경" };

/** 사원 비밀번호 변경. 관리자가 초기화해 준 뒤 첫 로그인 때 여기로 온다 */
export default function Page() {
  return <PasswordScreen loginPath="/login" />;
}
