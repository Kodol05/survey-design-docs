"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "../db";
import { requireUser } from "../auth/guard";
import {
  scoreAssessment,
  type Answer,
  type ScorableItem,
} from "../scoring/score";
import { ABILITY_AXIS_FROM_DB } from "../items/types";
import {
  assessQuality,
  type AntonymPair,
  type ResponseRecord,
} from "../scoring/quality";
import {
  SECTION_COUNT,
  firstUnansweredSection,
  saveSection,
  type DraftResponse,
} from "./session";

/**
 * 응시 중 나는 예상 못 한 오류를 **사람에게 보이는 문장으로** 바꾼다.
 *
 * ## 왜 여기가 가장 중요한가
 *
 * 로그인이 실패하면 다시 누르면 된다. 그런데 **120문항을 20분 걸려 다 푼
 * 사람이 제출을 눌렀을 때** 아무 일도 안 일어나면, 그 사람은 무슨 일이
 * 벌어졌는지 알 수 없고 답도 날아간 것처럼 보인다.
 *
 * 전에는 이 파일에 `try`가 하나도 없었다. 예외가 던져지면 화면 쪽
 * `useTransition`이 그걸 잡지 않아 **버튼만 멈추고 끝났다.**
 *
 * `redirect()`는 내부적으로 예외를 던지므로 반드시 다시 던진다.
 * 안 그러면 제출에 성공하고도 결과 화면으로 안 넘어간다.
 */
async function guarded<T>(
  run: () => Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await run();
  } catch (e) {
    unstable_rethrow(e);
    console.error("[survey]", e);
    return {
      error:
        "지금 저장할 수 없습니다. 답하신 내용은 그대로 있으니 잠시 후 다시 눌러 주세요.",
    };
  }
}

/** 세션이 내 것인지 확인한다. 남의 세션에 답을 쓰지 못하게. */
async function myTestSession(sessionId: string) {
  const me = await requireUser();
  const s = await prisma.testSession.findUnique({ where: { id: sessionId } });
  if (!s || s.employeeId !== me.id) throw new Error("세션을 찾을 수 없습니다");
  return { me, session: s };
}

export async function saveSectionAction(
  sessionId: string,
  section: number,
  drafts: DraftResponse[],
): Promise<{ nextSection: number | null } | { error: string }> {
  return guarded(async () => {
    await myTestSession(sessionId);
    await saveSection(sessionId, drafts);
    if (section < SECTION_COUNT) return { nextSection: section + 1 };
    return { nextSection: null };
  });
}

/**
 * 제출 → 채점 → 결과 생성 (01 §2.8).
 *
 * 채점은 **서버에서만** 돈다. 브라우저에서 계산해 보내면 값을 바꿔서 보낼 수 있고,
 * 역채점 규칙이 새어나가면 응답 품질 검사가 무력해진다.
 */
export async function submitAction(sessionId: string) {
  return guarded(async () => {
    const { session } = await myTestSession(sessionId);

    const remaining = await firstUnansweredSection(sessionId);
    if (remaining !== null)
      return {
        error: `아직 답하지 않은 문항이 있습니다 (${remaining}번째 묶음)`,
      };

    const items = await prisma.item.findMany({
      where: { assessmentId: session.assessmentId, status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        kind: true,
        scale: true,
        subscale: true,
        abilityAxis: true,
        isReverse: true,
        antonymPairId: true,
      },
    });
    const responses = await prisma.response.findMany({
      where: { sessionId },
      select: { itemId: true, value: true, elapsedMs: true },
    });

    const codeById = new Map(items.map((i) => [i.id, i.code]));
    const answers: Answer[] = responses.map((r) => ({
      code: codeById.get(r.itemId)!,
      value: r.value,
    }));

    const scorable: ScorableItem[] = items.map((i) =>
      i.kind === "TRAIT"
        ? {
            code: i.code,
            kind: "TRAIT",
            scale: i.scale!,
            subscale: i.subscale!,
            isReverse: i.isReverse,
          }
        : {
            code: i.code,
            kind: "ABILITY",
            // DB enum이 아니라 한글 이름으로 채점한다. 화면·통계가 전부 한글 기준이다
            abilityAxis: ABILITY_AXIS_FROM_DB[i.abilityAxis!],
            isReverse: i.isReverse,
          },
    );

    const scores = scoreAssessment(scorable, answers);

    // ── 응답 품질 ──
    const pairs: AntonymPair[] = items
      .filter((i) => i.antonymPairId && !i.isReverse)
      .map((i) => ({ a: i.code, b: codeById.get(i.antonymPairId!)! }));
    const records: ResponseRecord[] = responses.map((r) => ({
      code: codeById.get(r.itemId)!,
      value: r.value,
      elapsedMs: r.elapsedMs,
    }));
    const quality = assessQuality(records, pairs);

    const startedAt = session.startedAt.getTime();
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    await prisma.$transaction([
      prisma.testSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", completedAt: new Date(), durationSec },
      }),
      prisma.result.upsert({
        where: { sessionId },
        create: {
          sessionId,
          scoresJson: scores.traits,
          abilityScoresJson: scores.abilities,
          // 결과 화면은 채점 시점 값으로 고정한다 (D-09)
          snapshotJson: { traits: scores.traits, abilities: scores.abilities },
        },
        update: {
          scoresJson: scores.traits,
          abilityScoresJson: scores.abilities,
          snapshotJson: { traits: scores.traits, abilities: scores.abilities },
        },
      }),
      prisma.qualityFlag.upsert({
        where: { sessionId },
        create: {
          sessionId,
          meanElapsedMs: quality.meanElapsedMs,
          fastCount: quality.fastCount,
          antonymAgreement: quality.antonymAgreement,
          flag: quality.flag,
        },
        update: {
          meanElapsedMs: quality.meanElapsedMs,
          fastCount: quality.fastCount,
          antonymAgreement: quality.antonymAgreement,
          flag: quality.flag,
        },
      }),
    ]);

    redirect("/me");
  });
}
