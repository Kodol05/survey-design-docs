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

export type Attendee = {
  id: string;
  name: string;
  /** 아직 시작조차 안 한 사람은 세션이 없다 */
  status: "COMPLETED" | "IN_PROGRESS" | "ABANDONED" | "NONE";
};

/**
 * 사람 단위 응시 현황.
 *
 * ## 날짜별 누적 곡선을 대신한다 (2026-08-25 사용자 결정)
 *
 * 누적 곡선은 **수집이 끝나면 죽는 그래프**다. 40여 명이 두 주 안에 끝내고
 * 나면 그 뒤로는 영원히 평평한 선이고, 대시보드 네 칸 중 하나를 그게
 * 차지한다.
 *
 * 사람 단위로 세면 다 끝난 뒤에도 **「누가 아직 안 했나」**를 계속 말해준다 —
 * 수집 중에도 끝난 뒤에도 같은 자리에서 쓸모가 있다.
 *
 * ⚠️ 여기서 세는 모수는 **가입한 사람**이다. 가입이 자율이라(D-25) 회사
 *    전체 인원은 모른다 — `n / 50`이 아니라 `n / 가입자`다.
 */
export async function loadAttendance(): Promise<Attendee[]> {
  const rows = await prisma.employee.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      testSessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const RANK = { COMPLETED: 0, IN_PROGRESS: 1, ABANDONED: 2, NONE: 3 } as const;
  return rows
    .map((e) => ({
      id: e.id,
      name: e.name,
      status: (e.testSessions[0]?.status ?? "NONE") as Attendee["status"],
    }))
    // 끝낸 사람부터 — 덩어리가 지면 남은 인원이 눈에 띈다
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name, "ko"));
}
