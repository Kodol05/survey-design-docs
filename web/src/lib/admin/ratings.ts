import { prisma } from "../db";

/**
 * 대표님이 한 축이라도 매긴 사람 수.
 *
 * 소스 전환기를 열 수 있는지 판단하는 데 쓴다. 0이면 「대표님 평가」와
 * 「두 값 평균」이 빈 화면이 되므로 아예 고를 수 없게 둔다.
 */
export async function countRatedEmployees(): Promise<number> {
  const rows = await prisma.managerRating.findMany({
    distinct: ["employeeId"],
    select: { employeeId: true },
  });
  return rows.length;
}
