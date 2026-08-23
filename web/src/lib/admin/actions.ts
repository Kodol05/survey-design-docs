"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireAdmin } from "../auth/guard";
import { hashPassword } from "../auth/password";
import { clearFailures } from "../auth/rateLimit";
import { openResults } from "./phase";

/** 결과 공개로 전환 (D-33). 되돌릴 수 없다. */
export async function openResultsAction() {
  const me = await requireAdmin();
  await openResults(me.loginId ?? me.id);
  revalidatePath("/admin", "layout");
}

/**
 * 사원 비밀번호 초기화 (F-43).
 * SMS 인증 대신 관리자가 한다 — 50명 규모에서는 이게 현실적이다.
 * 초기화하면 `passwordChangedAt`을 비워 다음 로그인 때 변경을 강제한다.
 */
export async function resetPasswordAction(employeeId: string, temporary: string) {
  await requireAdmin();
  const target = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
  if (target.role === "ADMIN") throw new Error("관리자 비밀번호는 여기서 바꿀 수 없습니다");

  await prisma.employee.update({
    where: { id: employeeId },
    data: { passwordHash: await hashPassword(temporary), passwordChangedAt: null },
  });
  // 잠긴 상태였다면 같이 풀어준다
  if (target.phone) await clearFailures(target.phone);
  revalidatePath(`/admin/employees/${employeeId}`);
}
