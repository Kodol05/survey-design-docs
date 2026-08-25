import { prisma } from "../db";

/**
 * 대시보드 요약 — **사람을 센다, 세션을 세지 않는다** (2026-08-25 화면에서 확인).
 *
 * 전에는 `TestSession`을 셌다. 그래서 같은 화면에 **37과 38이 같이** 떴다:
 *
 *   KPI 「응시 완료」  38   ← 완료 세션 수
 *   응시 현황         37   ← 사람 수
 *   사람이 갈리는 축   38명 ← 분석이 세는 수
 *
 * 원인이 둘이었다. 한 사람이 **끝낸 뒤 다시 시작**해서 그 사람의 최근
 * 세션이 진행 중이었고, **관리자 자신의 진행 중 세션**이 「진행 중 5」에
 * 섞여 있었다.
 *
 * 이 화면이 답하는 물음은 「몇 **명**이 했나」다. 그러니 사람으로 센다.
 * 사람의 상태는 `loadAttendance`가 정하는 하나의 규칙을 따른다 — 두 군데서
 * 따로 정의하면 또 어긋난다.
 */
export async function loadSummary() {
  const [people, quality] = await Promise.all([
    loadAttendance(),
    prisma.qualityFlag.groupBy({ by: ["flag"], _count: true }),
  ]);
  const byFlag = Object.fromEntries(quality.map((q) => [q.flag, q._count]));
  const count = (k: Attendee["status"]) =>
    people.filter((p) => p.status === k).length;

  return {
    completed: count("COMPLETED"),
    inProgress: count("IN_PROGRESS"),
    signedUp: people.length,
    /** 끝낸 적 있는데 다시 시작한 사람. 「완료」로 세되 감추지는 않는다 */
    retaking: people.filter((p) => p.retaking).length,
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
  /** 끝낸 적이 있는데 새로 시작한 상태 */
  retaking: boolean;
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
 * ## 「끝낸 적 있으면 완료」다 (2026-08-25 화면에서 확인)
 *
 * 전에는 **가장 최근 세션의 상태**를 그 사람의 상태로 삼았다. 그래서 끝낸
 * 뒤에 다시 시작한 사람이 「진행 중」으로 세어졌고, 분석 화면(`loadPeople`)은
 * 같은 사람을 완료로 세어서 **37과 38이 갈렸다.**
 *
 * 「했느냐」에 대한 답은 했다는 것이다. 다시 하는 중이라는 사실은 감추지
 * 않고 `retaking`으로 따로 들고 간다.
 *
 * ⚠️ 여기서 세는 모수는 **가입한 사람**이다. 가입이 자율이라(D-25) 회사
 *    전체 인원은 모른다 — `n / 50`이 아니라 `n / 가입자`다.
 *    관리자 계정은 세지 않는다 — 관리자가 시험 삼아 시작한 세션이
 *    「진행 중」에 섞이면 안 된다.
 */
export async function loadAttendance(): Promise<Attendee[]> {
  const rows = await prisma.employee.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      // 상태를 정하려면 **전부** 필요하다. 하나만 가져오면 「끝낸 적 있는지」를
      // 알 수 없다
      testSessions: { orderBy: { startedAt: "desc" }, select: { status: true } },
    },
    orderBy: { name: "asc" },
  });

  const RANK = { COMPLETED: 0, IN_PROGRESS: 1, ABANDONED: 2, NONE: 3 } as const;
  return rows
    .map((e) => {
      const done = e.testSessions.some((s) => s.status === "COMPLETED");
      const latest = e.testSessions[0]?.status ?? "NONE";
      return {
        id: e.id,
        name: e.name,
        status: (done ? "COMPLETED" : latest) as Attendee["status"],
        retaking: done && latest === "IN_PROGRESS",
      };
    })
    // 끝낸 사람부터 — 덩어리가 지면 남은 인원이 눈에 띈다
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name, "ko"));
}
