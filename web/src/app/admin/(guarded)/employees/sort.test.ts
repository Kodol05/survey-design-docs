import { describe, expect, it } from "vitest";

/**
 * 구성원 목록 정렬 규칙.
 *
 * 화면 코드에서 그대로 옮긴 비교 함수다. 규칙이 셋 얽혀 있어
 * (상태 우선 · 값 없는 사람 아래 · 방향 뒤집기) 눈으로 확인하기 어렵다.
 */
type Row = {
  name: string;
  status: string | null;
  value: number | null;
};

const statusRank = (s: string | null) =>
  s === "COMPLETED" ? 0 : s === "IN_PROGRESS" ? 1 : 2;

function sortRows(rows: Row[], byValue: boolean, dir: "asc" | "desc") {
  // 부호가 갈래마다 반대다 — 점수는 desc가 큰 값부터, 이름은 asc가 가나다순
  const valueFlip = dir === "asc" ? -1 : 1;
  const nameFlip = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus) return byStatus;
    if (byValue) {
      if (a.value === null && b.value === null) return a.name.localeCompare(b.name, "ko");
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      if (a.value !== b.value) return (b.value - a.value) * valueFlip;
      return a.name.localeCompare(b.name, "ko");
    }
    return a.name.localeCompare(b.name, "ko") * nameFlip;
  });
}

const done = (name: string, value: number | null): Row => ({
  name,
  status: "COMPLETED",
  value,
});

describe("구성원 정렬", () => {
  it("점수는 기본이 높은 순, 다시 누르면 낮은 순", () => {
    const rows = [done("가", 30), done("나", 70), done("다", 50)];
    expect(sortRows(rows, true, "desc").map((r) => r.name)).toEqual(["나", "다", "가"]);
    expect(sortRows(rows, true, "asc").map((r) => r.name)).toEqual(["가", "다", "나"]);
  });

  it("이름은 기본이 가나다순, 다시 누르면 역순", () => {
    const rows = [done("다", 1), done("가", 2), done("나", 3)];
    expect(sortRows(rows, false, "asc").map((r) => r.name)).toEqual(["가", "나", "다"]);
    expect(sortRows(rows, false, "desc").map((r) => r.name)).toEqual(["다", "나", "가"]);
  });

  it("완료한 사람이 늘 먼저다 — 방향을 뒤집어도", () => {
    const rows: Row[] = [
      { name: "미응시", status: null, value: null },
      { name: "진행중", status: "IN_PROGRESS", value: null },
      done("완료", 50),
    ];
    for (const d of ["asc", "desc"] as const)
      expect(sortRows(rows, true, d)[0].name).toBe("완료");
  });

  it("값이 없는 사람은 방향과 무관하게 아래로", () => {
    /*
      뒤집었을 때 값 없는 사람이 맨 위로 올라오면 목록이 가로막힌다.
      NaN이나 −1로 때우면 정확히 그렇게 된다.
    */
    const rows = [done("값없음", null), done("낮음", 10), done("높음", 90)];
    expect(sortRows(rows, true, "desc").map((r) => r.name)).toEqual([
      "높음",
      "낮음",
      "값없음",
    ]);
    expect(sortRows(rows, true, "asc").map((r) => r.name)).toEqual([
      "낮음",
      "높음",
      "값없음",
    ]);
  });

  it("점수가 같으면 이름순으로 가른다", () => {
    const rows = [done("나", 50), done("가", 50)];
    expect(sortRows(rows, true, "desc").map((r) => r.name)).toEqual(["가", "나"]);
    // 방향을 뒤집어도 동점 처리는 이름순 그대로 — 뒤집으면 순서가 흔들린다
    expect(sortRows(rows, true, "asc").map((r) => r.name)).toEqual(["가", "나"]);
  });
});
