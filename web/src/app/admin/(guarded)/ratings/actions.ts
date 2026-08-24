"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { RATER, isValidRating } from "@/lib/admin/abilitySource";
import { ABILITY_AXES } from "@/lib/items/types";
import type { AbilityAxis } from "@/generated/prisma/enums";

const TO_DB: Record<string, AbilityAxis> = {
  협력: "COOPERATION",
  조직생활: "ORG_LIFE",
  자율적실행: "AUTONOMY",
};

/** 대표님 평가는 한 사람이 낸다. 여러 평가자를 받을 일이 생기면 이 값을 나눈다 */
const RATED_BY = RATER.real;

export type RateState = { error?: string; savedAt?: number } | undefined;

/**
 * 한 사람의 한 축에 점수를 매긴다.
 *
 * 언제든 고칠 수 있다. **잠그지 않는다 (D-41).** 결과를 먼저 보면 인상이
 * 섞이는 것은 맞지만, 화면을 잠그는 방식은 값을 못 치렀다 — 첫 화면에서
 * 안내하고 판단은 사람이 한다.
 */
export async function rate(
  employeeId: string,
  axis: string,
  score: number,
): Promise<RateState> {
  try {
    await requireAdmin();

    const dbAxis = ABILITY_AXES.includes(axis as never) ? TO_DB[axis] : undefined;
    if (!dbAxis) return { error: "없는 항목입니다." };
    if (!isValidRating(score)) return { error: "1에서 10 사이로 매겨 주세요." };

    const target = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!target || target.role !== "USER") return { error: "없는 사람입니다." };

    await prisma.managerRating.upsert({
      where: {
        employeeId_axis_ratedBy: { employeeId, axis: dbAxis, ratedBy: RATED_BY },
      },
      create: { employeeId, axis: dbAxis, score, ratedBy: RATED_BY },
      update: { score, ratedAt: new Date() },
    });

    revalidatePath("/admin/ratings");
    return { savedAt: Date.now() };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[ratings]", e);
    return { error: "지금 저장할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
}
