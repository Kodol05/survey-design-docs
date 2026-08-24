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

export type CompletionPoint = { date: string; cumulative: number };

/**
 * 날짜별 누적 완료.
 *
 * 하루치 막대가 아니라 **누적**으로 둔다. 40여 명이 몇 주에 걸쳐 응시하므로
 * 하루치로 보면 0인 날이 대부분이라 들쭉날쭉하고, "지금 몇 명까지 왔나"를
 * 읽으려면 눈으로 더해야 한다.
 *
 * 응답이 없는 날도 빈칸으로 채운다. 안 채우면 **멈춰 있던 기간이 직선으로
 * 이어져 사라진다** — 평평한 구간이 곧 멈춰 있던 기간이라는 게 이 차트의 요점이다.
 *
 * 날짜는 Asia/Seoul 기준으로 자른다. 서버가 UTC면 자정 근처 응시가 전날로 밀린다.
 */
export async function loadCompletionByDate(): Promise<CompletionPoint[]> {
  const rows = await prisma.testSession.findMany({
    where: { status: "COMPLETED", completedAt: { not: null } },
    select: { completedAt: true },
    orderBy: { completedAt: "asc" },
  });
  if (!rows.length) return [];

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const perDay = new Map<string, number>();
  for (const r of rows) {
    const key = fmt.format(r.completedAt!);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const keys = [...perDay.keys()].sort();
  const out: CompletionPoint[] = [];
  let cumulative = 0;
  const cursor = new Date(`${keys[0]}T00:00:00Z`);
  const last = new Date(`${keys[keys.length - 1]}T00:00:00Z`);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    cumulative += perDay.get(key) ?? 0;
    out.push({ date: key, cumulative });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
