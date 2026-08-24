"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { isResultsOpen } from "@/lib/admin/phase";
import { isValidRating } from "@/lib/admin/abilitySource";
import { ABILITY_AXES } from "@/lib/items/types";
import type { AbilityAxis } from "@/generated/prisma/enums";

const TO_DB: Record<string, AbilityAxis> = {
  협력: "COOPERATION",
  조직생활: "ORG_LIFE",
  자율적실행: "AUTONOMY",
};

/** 대표님 평가는 한 사람이 낸다. 여러 평가자를 받을 일이 생기면 이 값을 나눈다 */
const RATED_BY = "대표";

export type RateState = { error?: string; savedAt?: number } | undefined;

/**
 * 한 사람의 한 축에 점수를 매긴다.
 *
 * ⚠️ **결과가 열린 뒤에는 받지 않는다 (D-33).** 결과를 보고 나서 매기면
 *    그 인상이 섞여서 대조하는 의미가 없어진다. 국면은 되돌릴 수 없으므로
 *    이 문은 한 번 닫히면 다시 열리지 않는다.
 */
export async function rate(
  employeeId: string,
  axis: string,
  score: number,
): Promise<RateState> {
  try {
    await requireAdmin();

    if (await isResultsOpen())
      return { error: "결과가 이미 열려서 평가를 바꿀 수 없습니다." };

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
