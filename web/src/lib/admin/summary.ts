import { prisma } from "../db";

/**
 * 대시보드 요약 (F-37/F-38).
 *
 * ⚠️ **미응시자는 세지 않는다.** 회원가입이 자율 등록이라(D-25) 모수를 모른다.
 *    `n / 50`을 띄우려면 참고용 명단(F-42, P1)이 필요하다.
 */
export async function loadSummary() {
  const [completed, inProgress, signedUp, quality] = await Promise.all([
    prisma.testSession.count({ where: { status: "COMPLETED" } }),
    prisma.testSession.count({ where: { status: "IN_PROGRESS" } }),
    prisma.employee.count({ where: { role: "USER" } }),
    prisma.qualityFlag.groupBy({ by: ["flag"], _count: true }),
  ]);
  const byFlag = Object.fromEntries(quality.map((q) => [q.flag, q._count]));
  return {
    completed,
    inProgress,
    signedUp,
    quality: {
      review: byFlag.review ?? 0,
      poor: byFlag.poor ?? 0,
    },
  };
}
