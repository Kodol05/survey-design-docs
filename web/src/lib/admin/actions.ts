"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { requireAdmin } from "../auth/guard";
import { assertPasswordOk, hashPassword } from "../auth/password";
import { revokeSessions } from "../auth/session";
import { clearFailures } from "../auth/rateLimit";
import {
  itemUpdateData,
  validateItemPatch,
  type ItemKind,
  type ItemPatch,
} from "../items/edit";

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
    // 길이 규칙은 화면에서만 보고 있었다 — 서버에서도 본다 (2026-09-18)
    try {
      assertPasswordOk(temporary);
    } catch (e) {
      return { error: (e as Error).message };
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { passwordHash: await hashPassword(temporary), passwordChangedAt: null },
    });
    // 잠긴 상태였다면 같이 풀어주고, 살아 있는 로그인은 전부 끊는다
    if (target.phone) await clearFailures(target.phone);
    await revokeSessions(employeeId);
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

/**
 * 문항 수정 (2026-09-18 사용자 결정 — 문항 목록에서 바로 고친다).
 *
 * ## 원래는 못 고치게 해 두었다
 *
 * 문항의 원본은 `data/items/v1.yaml`(→ seed → DB)이라, 화면에서 고치면
 * 파일과 DB 가 갈라진다. 그래도 목록에서 바로 고치는 편이 낫다고 정해,
 * **이 저장은 DB 만 바꾼다.** 이미 응답이 쌓인 뒤라 seed 는 어차피 막혀
 * 있어(응시 기록이 있으면 중단), 운영 중 진짜 값은 DB 다.
 *
 * ## ⚠️ 채점값을 바꾸면 지난 응답의 근거가 어긋난다
 *
 * 축·세부·역채점을 바꾸면, 그 문항에 이미 답한 사람들의 점수 근거가
 * 달라진다 — 지난 결과는 채점 시점 값으로 고정돼 있어 그대로지만(D-09),
 * **다시 채점하면 달라진다.** 화면에서 이 경고를 분명히 띄운다. 무엇을
 * 감수할지는 회사의 판단이다.
 *
 * `code`·`orderNo`·`kind`·반대짝은 여기서 바꾸지 않는다 (`items/edit.ts`).
 */
export async function updateItemAction(
  id: string,
  kind: ItemKind,
  patch: ItemPatch,
): Promise<{ error: string } | undefined> {
  try {
    await requireAdmin();

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return { error: "없는 문항입니다." };
    if (item.kind !== kind)
      return { error: "문항 종류가 맞지 않습니다. 목록을 새로고침해 주세요." };

    const bad = validateItemPatch(kind, patch);
    if (bad) return { error: bad };

    await prisma.item.update({
      where: { id },
      data: itemUpdateData(kind, patch) as Prisma.ItemUncheckedUpdateInput,
    });
  } catch (e) {
    unstable_rethrow(e);
    console.error("[admin]", e);
    return { error: "지금 저장할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/admin/items");
  revalidatePath(`/admin/items/${id}`);
  redirect("/admin/items");
}
