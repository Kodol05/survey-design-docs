"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
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

/**
 * 직원 완전 삭제 (2026-08-25 사용자 결정, `D-48`).
 *
 * ## 무엇이 지워지는가
 *
 * 스키마가 전부 `onDelete: Cascade`라 직원 한 줄을 지우면 딸린 것이 같이 간다.
 *
 *   계정 · 로그인 세션 · 응시 세션 · 응답 120개 · 채점 결과
 *   · 응답 신뢰도 · 대표님 평가
 *
 * **되돌릴 수 없다.** 백업에서 꺼내는 것 말고는 방법이 없다.
 *
 * ## 왜 「잠그기」를 두지 않는가
 *
 * 로그인만 막고 이름·번호를 그대로 들고 있는 것은, 수집 목적이 끝났는데
 * 계속 보관하는 것과 같다. 이름을 지우고 점수만 남기는 방법도 검토했으나
 * **50명 규모에서는 점수 프로필만으로 누구인지 짐작이 된다.** 익명이 아니다.
 *
 * 통계로 얻는 것도 적다 — 37명에서 한둘이 빠져도 상관계수는 소수 둘째
 * 자리에서나 움직인다. 지키려는 것에 비해 무릅쓰는 위험이 크다.
 *
 * ⚠️ **관리자는 지우지 않는다.** 관리자 계정이 사라지면 아무도 못 들어온다.
 */
export async function deleteEmployeeAction(
  employeeId: string,
  /** 실수로 지우는 것을 막기 위해 이름을 그대로 다시 입력받는다 */
  typedName: string,
): Promise<{ error: string } | undefined> {
  try {
    await requireAdmin();

    const target = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!target) return { error: "없는 사람입니다." };
    if (target.role === "ADMIN") return { error: "관리자 계정은 지울 수 없습니다." };
    if (typedName.trim() !== target.name)
      return { error: "이름이 맞지 않습니다. 지울 사람의 이름을 그대로 입력해 주세요." };

    // 로그인 실패 기록은 직원 표와 이어져 있지 않아 따로 지운다
    if (target.phone) await clearFailures(target.phone);
    await prisma.employee.delete({ where: { id: employeeId } });
  } catch (e) {
    unstable_rethrow(e);
    console.error("[admin]", e);
    return { error: "지금 지울 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}
