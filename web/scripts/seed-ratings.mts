import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * 대표님 평가를 채워 넣는다 — **시험용이다.**
 *
 * ⚠️ **운영 DB에서는 절대 돌리지 말 것.** `ratedBy: "대표"`로 들어가므로
 *    대표님이 직접 매기신 값과 구분되지 않는다. 이 스크립트가 만든 것은
 *    `npm run ratings:clear`로 통째로 지운다.
 *
 * ## 왜 일부러 어긋나게 만드는가
 *
 * 전부 본인 점수와 비슷하게 채우면 소스를 바꿔도 화면이 거의 같아 보인다.
 * 그러면 **두 값을 나눠 둔 이유 자체를 확인할 수 없다.** 실제로도 자기보고와
 * 상사 평가는 곧잘 어긋나고, 어긋나는 사람을 찾는 것이 이 기능의 목적이다.
 *
 * 그래서 네 부류를 섞는다.
 *
 *   일치 40%   본인 점수 ±1     — 대표님이 보시는 것과 본인 생각이 맞는 사람
 *   느슨 30%   본인 점수 ±2~3   — 대체로 맞지만 축마다 갈리는 사람
 *   무관 15%   아무 값          — 본인 답과 상관없는 인상
 *   반대 15%   11 − 본인 점수   — 본인은 높게, 대표님은 낮게 (또는 반대)
 *
 * 부류는 사람 단위로 정한다. 축마다 바꾸면 사람별로 뭉치지 않아서
 * 「이 사람은 대표님과 어긋난다」는 이야기가 성립하지 않는다.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const AXES = { 협력: "COOPERATION", 조직생활: "ORG_LIFE", 자율적실행: "AUTONOMY" } as const;

// seed-demo와 같은 mulberry32. 돌릴 때마다 같은 결과가 나와야 화면을 믿을 수 있다
let seed = 20260824;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Kind = "일치" | "느슨" | "무관" | "반대";
const KINDS: [Kind, number][] = [
  ["일치", 0.4],
  ["느슨", 0.3],
  ["무관", 0.15],
  ["반대", 0.15],
];

function kindFor(i: number, n: number): Kind {
  // 비율대로 순서를 만들어 놓고 섞는다. 확률로 뽑으면 44명에서 비율이 크게 틀어진다
  const bag: Kind[] = [];
  for (const [k, share] of KINDS) bag.push(...Array(Math.round(n * share)).fill(k));
  while (bag.length < n) bag.push("일치");
  return bag[i % bag.length];
}

/** 0~100 → 1~10 */
const toScore = (pct: number) => (pct / 100) * 9 + 1;
const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v)));

const people = await prisma.employee.findMany({
  where: { role: "USER" },
  orderBy: { name: "asc" },
  include: {
    testSessions: {
      where: { status: "COMPLETED", result: { isNot: null } },
      orderBy: { completedAt: "desc" },
      take: 1,
      include: { result: true },
    },
  },
});

const rated = people.filter((p) => p.testSessions[0]?.result);

// 부류를 사람 단위로 섞어 배정한다
const order = rated.map((_, i) => i);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}
const kindOf = new Map<string, Kind>();
order.forEach((personIndex, slot) => {
  kindOf.set(rated[personIndex].id, kindFor(slot, rated.length));
});

// 기존 시험 데이터를 걷어낸다 — 두 벌이 겹치면 무엇을 보고 있는지 알 수 없다
const wiped = await prisma.managerRating.deleteMany({
  where: { ratedBy: { in: ["대표", "데모"] } },
});

const pairs: { self: number; boss: number }[] = [];
const gaps: { name: string; kind: Kind; self: number; boss: number }[] = [];
let count = 0;

for (const p of rated) {
  const kind = kindOf.get(p.id)!;
  const abilities = (p.testSessions[0].result!.abilityScoresJson ?? {}) as Record<
    string,
    { percent: number }
  >;
  // 사람마다 후하게/박하게 보는 치우침을 하나씩 준다
  const bias = (rnd() - 0.5) * 1.6;
  const selfMean: number[] = [];
  const bossMean: number[] = [];

  for (const [axis, dbAxis] of Object.entries(AXES)) {
    const pct = abilities[axis]?.percent;
    if (typeof pct !== "number") continue;

    const own = toScore(pct);
    /*
      가운데(5.5)에서 얼마나 떨어졌는지를 늘려 쓴다.

      직원 설문 직무능력은 대부분 40~60에 몰려 있어 10점 눈금으로 옮기면
      4.6~6.4밖에 안 된다. 이 상태로 `11 − 본인`을 하면 **반대로 뒤집어도
      값이 거의 안 움직인다** — 5.0이 6.0이 될 뿐이라 "어긋난 사람"이
      화면에서 눈에 띄지 않는다.

      실제로도 사람이 남을 볼 때는 자기를 볼 때보다 눈금을 넓게 쓴다.
      그래서 어느 부류든 가운데에서의 거리를 키워 둔다.
    */
    const off = own - 5.5;
    let raw: number;
    if (kind === "일치") raw = 5.5 + off * 1.5 + (rnd() - 0.5) * 1.6 + bias;
    else if (kind === "느슨") raw = 5.5 + off * 1.2 + (rnd() - 0.5) * 4.5 + bias;
    else if (kind === "무관") raw = 1 + rnd() * 9;
    else raw = 5.5 - off * 1.9 + (rnd() - 0.5) * 1.6;

    const score = clamp(raw);
    await prisma.managerRating.create({
      data: { employeeId: p.id, axis: dbAxis, score, ratedBy: "대표" },
    });
    count++;
    pairs.push({ self: own, boss: score });
    selfMean.push(own);
    bossMean.push(score);
  }

  if (selfMean.length) {
    const s = selfMean.reduce((a, b) => a + b, 0) / selfMean.length;
    const b = bossMean.reduce((a, b) => a + b, 0) / bossMean.length;
    gaps.push({ name: p.name, kind, self: s, boss: b });
  }
}

// ── 확인 ────────────────────────────────────────────────────────────
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const corr = (xs: number[], ys: number[]) => {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
};

const tally = new Map<Kind, number>();
for (const g of gaps) tally.set(g.kind, (tally.get(g.kind) ?? 0) + 1);

const byKind = new Map<Kind, { self: number; boss: number }[]>();
for (const g of gaps) {
  const list = byKind.get(g.kind) ?? [];
  list.push({ self: g.self, boss: g.boss });
  byKind.set(g.kind, list);
}

console.log(`이전 시험 평가 ${wiped.count}칸을 지우고 ${count}칸을 새로 넣었습니다`);
console.log(`사람 ${gaps.length}명 — ${[...tally].map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(
  `\n본인 답 ↔ 대표님 평가 상관: ${corr(
    pairs.map((p) => p.self),
    pairs.map((p) => p.boss),
  ).toFixed(2)}  (칸 ${pairs.length}개)`,
);

console.log("\n부류별 상관 (사람 단위 · 세 축 평균)");
for (const [k] of KINDS) {
  const list = byKind.get(k) ?? [];
  if (list.length < 3) continue;
  const r = corr(list.map((x) => x.self), list.map((x) => x.boss));
  console.log(`  ${k}  ${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(2)}  (${list.length}명)`);
}

gaps.sort((a, b) => Math.abs(b.self - b.boss) - Math.abs(a.self - a.boss));
console.log("\n가장 크게 어긋난 사람 (10점 눈금, 세 축 평균)");
for (const g of gaps.slice(0, 8)) {
  const d = g.boss - g.self;
  console.log(
    `  ${g.name.padEnd(4)} ${g.kind}  본인 ${g.self.toFixed(1)} → 대표님 ${g.boss.toFixed(
      1,
    )}  ${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}`,
  );
}
console.log("\n지우려면: npm run ratings:clear");

await prisma.$disconnect();
