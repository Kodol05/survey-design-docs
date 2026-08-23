import "server-only";
import { redirect } from "next/navigation";
import { currentUser } from "./session";

/** 로그인 필수 화면에서 맨 앞에 부른다 */
export async function requireUser() {
  const me = await currentUser();
  if (!me) redirect("/login");
  return me;
}

/** 관리자 전용. 초기 비밀번호 상태면 변경 화면으로 보낸다 */
export async function requireAdmin() {
  const me = await currentUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/me");
  if (!me.passwordChangedAt) redirect("/admin/password");
  return me;
}
