/**
 * 한 축에 사람들이 어떻게 퍼져 있는가 (2026-08-25 사용자 결정).
 *
 * ## 왜 따로 화면을 두는가
 *
 * 이 시스템의 핵심은 성향 7축과 직무능력의 **관계**다. 그런데 관계를 보기
 * 전에 「우리 회사 사람들은 대체 어떤 모양으로 퍼져 있나」가 먼저 궁금한
 * 것이 자연스럽다. 그동안 그 답이 대시보드의 **최소~최대 막대 하나**뿐이었다.
 *
 * 폭만으로는 부족하다. **폭이 같아도 가운데 몰린 축과 양끝으로 갈린 축은
 * 완전히 다른 이야기**인데 막대로는 둘이 똑같이 보인다.
 *
 * ## 평균을 앞세우지 않는다
 *
 * 눈금 자체가 문항 가운데를 50으로 잡은 것이라 **비교할 바깥 기준이 없다.**
 * 「평균 51」은 「보통보다 조금 높다」는 뜻이 아니다 — 그냥 문항이 그렇게
 * 만들어졌다는 뜻에 가깝다. 그래서 중앙값과 사분위, 그리고 **퍼진 정도**를
 * 앞세운다. 사내에서 서로 견주는 것만 말이 된다.
 *
 * ## 점을 쌓아서 그린다
 *
 * 값 하나를 점 하나로 두되 **같은 구간에 들어온 점은 위로 쌓는다.** 겹쳐
 * 그리면 세 명이 몰린 자리와 한 명뿐인 자리가 똑같아 보인다. 쌓으면 그
 * 높이가 곧 몇 명인지가 된다 — 막대 히스토그램과 같은 정보를 주면서
 * **한 사람 한 사람이 남는다.**
 */

export type Dot = {
  employeeId: string;
  name: string;
  value: number;
  /** 0~1. 왼쪽 끝이 0, 오른쪽 끝이 100점 */
  x: number;
  /** 같은 구간에 몇 번째로 들어왔는지. 0이 맨 아래 */
  level: number;
};

export type Spread = {
  scale: string;
  kind: "temperament" | "character" | "ability";
  n: number;
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  mean: number;
  sd: number;
  dots: Dot[];
  /** 한 구간에 가장 많이 쌓인 수. 그림 높이를 정하는 데 쓴다 */
  peak: number;
  /** 가장 낮은 쪽·높은 쪽 사람 (동점이면 이름 순) */
  lowest: Dot[];
  highest: Dot[];
};

/** 0~100을 몇 칸으로 자를지. 4점 단위 — 40명이면 칸당 평균 한둘이 된다 */
export const BINS = 25;

/**
 * 사분위 — 순위 사이를 직선으로 잇는 방식(R의 type 7).
 *
 * 표본이 작을 때 방식마다 값이 조금씩 다르다. 가장 널리 쓰는 것을 골라
 * 두면 다른 도구로 다시 재도 같은 숫자가 나온다.
 */
export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export function spreadOf(
  scale: string,
  kind: Spread["kind"],
  people: { employeeId: string; name: string; value: number }[],
): Spread | null {
  const usable = people.filter((p) => typeof p.value === "number" && !Number.isNaN(p.value));
  if (usable.length < 2) return null;

  const sorted = usable.map((p) => p.value).sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(
    sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1),
  );

  /*
    쌓는 순서는 **값이 낮은 사람부터**로 못 박는다. 들어온 순서대로 쌓으면
    화면을 새로 고칠 때마다 같은 칸 안에서 점이 위아래로 바뀐다 — 바뀔
    이유가 없는 것이 바뀌면 데이터가 바뀐 줄 안다.
  */
  const ordered = [...usable].sort(
    (a, b) => a.value - b.value || a.name.localeCompare(b.name, "ko"),
  );

  const filled = new Map<number, number>();
  const dots: Dot[] = ordered.map((p) => {
    const v = Math.max(0, Math.min(100, p.value));
    // 100점은 마지막 칸에 넣는다. 안 그러면 저 혼자 칸을 하나 더 만든다
    const bin = Math.min(BINS - 1, Math.floor((v / 100) * BINS));
    const level = filled.get(bin) ?? 0;
    filled.set(bin, level + 1);
    return {
      employeeId: p.employeeId,
      name: p.name,
      value: p.value,
      // 칸의 **가운데**에 찍는다. 왼쪽 끝에 찍으면 칸끼리 붙어 보인다
      x: (bin + 0.5) / BINS,
      level,
    };
  });

  const peak = Math.max(...filled.values());
  const EDGE = 3;

  return {
    scale,
    kind,
    n,
    min: sorted[0],
    max: sorted[n - 1],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    mean,
    sd,
    dots,
    peak,
    lowest: dots.slice(0, Math.min(EDGE, dots.length)),
    highest: dots.slice(-Math.min(EDGE, dots.length)).reverse(),
  };
}
