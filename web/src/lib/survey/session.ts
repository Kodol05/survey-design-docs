import "server-only";
import { prisma } from "../db";

/**
 * 응시 세션 — 01 §2.6
 *
 * ⚠️ **브라우저로 내려보내는 문항에는 `isReverse`·`scale`·`abilityAxis`를
 *    절대 포함하지 않는다.** 어느 문항이 뒤집히는지 알면 원하는 대로 답을
 *    맞출 수 있고, 반대 문항 짝을 알면 응답 품질 검사가 통째로 무력해진다.
 *    `PublicItem` 타입이 그 경계다.
 */

export const SECTION_COUNT = 7;

/**
 * 오래된 미완료 세션을 정리하는 기준 기간.
 * **아직 정하지 않았다** — 이전 초안의 30일은 근거 없이 들어간 값이라 뺐다.
 * `null`이면 정리하지 않는다 (01 §2.6).
 */
export const STALE_SESSION_DAYS: number | null = null;

/** 브라우저가 볼 수 있는 문항 정보. 이게 전부다. */
export type PublicItem = {
  id: string;
  code: string;
  orderNo: number;
  content: string;
};

export async function activeAssessment() {
  const a = await prisma.assessment.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  if (!a) throw new Error("활성 문항 세트가 없습니다. npm run db:seed 를 먼저 실행하세요");
  return a;
}

/**
 * 진행 중인 세션을 주거나 새로 만든다.
 * 세션 생성 시 문항 버전을 고정(pin)한다 — 진행 중인 사람은 기존 버전으로 완주한다.
 */
export async function getOrCreateSession(employeeId: string) {
  await sweepStaleSessions(employeeId);

  const open = await prisma.testSession.findFirst({
    where: { employeeId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (open) return open;

  const a = await activeAssessment();
  return prisma.testSession.create({
    data: {
      employeeId,
      assessmentId: a.id,
      assessmentVersion: a.version,
      status: "IN_PROGRESS",
    },
  });
}

/** 한 섹션의 문항. 응답한 값도 같이 준다 (이어하기). */
export async function getSection(sessionId: string, section: number) {
  const s = await prisma.testSession.findUniqueOrThrow({ where: { id: sessionId } });
  const items = await prisma.item.findMany({
    where: { assessmentId: s.assessmentId, section, status: "ACTIVE" },
    orderBy: { orderNo: "asc" },
    // 필요한 필드만 고른다. 여기에 isReverse를 넣으면 화면으로 새어나간다
    select: { id: true, code: true, orderNo: true, content: true },
  });
  const saved = await prisma.response.findMany({
    where: { sessionId, item: { section } },
    select: { itemId: true, value: true },
  });
  return {
    items: items satisfies PublicItem[],
    answers: Object.fromEntries(saved.map((r) => [r.itemId, r.value])),
  };
}

export type DraftResponse = {
  itemId: string;
  value: number;
  elapsedMs: number;
  changedCount: number;
};

/** 섹션 단위로 저장한다. 문항마다 서버로 보내면 114번 왕복이 된다 (01 §2.6). */
export async function saveSection(sessionId: string, drafts: DraftResponse[]) {
  for (const d of drafts) {
    if (!Number.isInteger(d.value) || d.value < 1 || d.value > 7)
      throw new Error(`응답값이 ${d.value}입니다. 1~7이어야 합니다`);
  }
  await prisma.$transaction(
    drafts.map((d) =>
      prisma.response.upsert({
        where: { sessionId_itemId: { sessionId, itemId: d.itemId } },
        create: { sessionId, ...d },
        update: {
          value: d.value,
          elapsedMs: d.elapsedMs,
          changedCount: d.changedCount,
        },
      }),
    ),
  );
}

/** 아직 답하지 않은 문항이 있는 첫 섹션. 전부 답했으면 null. */
export async function firstUnansweredSection(sessionId: string) {
  const s = await prisma.testSession.findUniqueOrThrow({ where: { id: sessionId } });
  for (let section = 1; section <= SECTION_COUNT; section++) {
    const total = await prisma.item.count({
      where: { assessmentId: s.assessmentId, section, status: "ACTIVE" },
    });
    const done = await prisma.response.count({
      where: { sessionId, item: { section } },
    });
    if (done < total) return section;
  }
  return null;
}

/**
 * 오래 방치된 세션 정리 (F-31). 별도 스케줄러를 두지 않고
 * 이미 호출되는 함수에 끼워 넣는다.
 * 기준 기간이 정해지지 않았으므로 지금은 아무것도 하지 않는다.
 */
export async function sweepStaleSessions(employeeId?: string) {
  if (STALE_SESSION_DAYS === null) return 0;
  const cutoff = new Date(Date.now() - STALE_SESSION_DAYS * 86_400_000);
  const r = await prisma.testSession.updateMany({
    where: {
      status: "IN_PROGRESS",
      startedAt: { lt: cutoff },
      ...(employeeId ? { employeeId } : {}),
    },
    data: { status: "ABANDONED" },
  });
  return r.count;
}
