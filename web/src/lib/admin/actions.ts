"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { prisma } from "../db";
import { requireAdmin } from "../auth/guard";
import { hashPassword } from "../auth/password";
import { clearFailures } from "../auth/rateLimit";

/**
 * 사원 비밀번호 초기화 (F-43).
 * SMS 인증 대신 관리자가 한다 — 50명 규모에서는 이게 현실적이다.
 * 초기화하면 `passwordChangedAt`을 비워 다음 로그인 때 변경을 강제한다.
 */
export async function resetPasswordAction(
  employeeId: string,
  temporary: string,
): Promise<{ error: string } | undefined> {
  try {
    await requireAdmin();
    const target = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!target) return { error: "없는 사람입니다." };
    if (target.role === "ADMIN")
      return { error: "관리자 비밀번호는 여기서 바꿀 수 없습니다." };

    await prisma.employee.update({
      where: { id: employeeId },
      data: { passwordHash: await hashPassword(temporary), passwordChangedAt: null },
    });
    // 잠긴 상태였다면 같이 풀어준다
    if (target.phone) await clearFailures(target.phone);
    revalidatePath(`/admin/employees/${employeeId}`);
  } catch (e) {
    unstable_rethrow(e);
    console.error("[admin]", e);
    return { error: "지금 처리할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
}
