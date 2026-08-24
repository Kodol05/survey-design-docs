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
 * 그래서 네 부류를 섞되 **어긋나는 쪽은 몇 명으로 못 박는다.**
 *
 *   반대  1명    뒤집힌 값     — 본인은 높게, 대표님은 낮게
 *   무관  1명    아무 값       — 본인 답과 상관없는 인상
 *   느슨  나머지의 30%         — 대체로 맞지만 축마다 갈리는 사람
 *   일치  나머지 전부          — 대표님이 보시는 것과 본인 생각이 맞는 사람
 *
 * 처음에는 어긋나는 쪽을 비율(15% + 15%)로 뒀는데, 37명에서 11명이 어긋나
 * **축별 일치도가 .3~.4까지 떨어졌다.** 그 정도면 두 값이 서로 다른 것을 재고
 * 있다는 뜻이라, 화면에서 「대체로 맞는데 한둘이 튄다」는 그림이 안 나온다.
 * 눈에 띄는 사람을 찾는 것이 목적이므로 어긋나는 쪽은 **딱 둘**로 둔다.
 *
 * ⚠️ 37명에서 뒤집힌 사람 하나가 축별 일치도를 .05~.08쯤 끌어내린다.
 *    인원을 늘릴 때 이 비율을 그대로 두면 어긋나는 쪽이 묻힌다.
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
const KINDS: Kind[] = ["일치", "느슨", "무관", "반대"];

/** 어긋나는 사람은 몇 명으로 못 박는다. 비율로 두면 인원이 늘 때 같이 늘어난다 */
const ODD = { 반대: 1, 무관: 1 } as const;
/** 남은 사람 중 느슨한 쪽의 비율 */
const LOOSE_SHARE = 0.3;

function bagOf(n: number): Kind[] {
  const bag: Kind[] = [
    ...Array<Kind>(ODD.반대).fill("반대"),
    ...Array<Kind>(ODD.무관).fill("무관"),
  ];
  const rest = Math.max(0, n - bag.length);
  const loose = Math.round(rest * LOOSE_SHARE);
  bag.push(...Array<Kind>(loose).fill("느슨"));
  while (bag.length < n) bag.push("일치");
  return bag.slice(0, n);
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

/** 세 축 평균을 1~10으로 (부류를 고를 때만 쓴다) */
const meanScore = (p: (typeof rated)[number]) => {
  const a = (p.testSessions[0].result!.abilityScoresJson ?? {}) as Record<
    string,
    { percent: number }
  >;
  const vs = Object.keys(AXES)
    .map((axis) => a[axis]?.percent)
    .filter((v): v is number => typeof v === "number");
  return vs.length ? toScore(vs.reduce((x, y) => x + y, 0) / vs.length) : 5.5;
};

/*
  뒤집을 사람은 **아무나 고르지 않는다.**

  본인 점수가 가운데(5.5)에 있는 사람을 뒤집으면 값이 거의 그대로라
  화면에서 아무 일도 일어나지 않는다. 실제로 한 번 그렇게 나왔다 —
  「반대」로 찍힌 사람이 어긋난 사람 목록에 들어오지도 못했다.

  그래서 가운데에서 가장 멀리 떨어진 사람을 뒤집는다. 눈에 띄라고 만든
  자료인데 안 띄면 만든 값이 없다.
*/
const kindOf = new Map<string, Kind>();
const pool = [...rated].sort(
  (a, b) => Math.abs(meanScore(b) - 5.5) - Math.abs(meanScore(a) - 5.5),
);
for (let i = 0; i < ODD.반대 && i < pool.length; i++)
  kindOf.set(pool[i].id, "반대");

// 나머지는 섞어서 배정한다
const rest = pool.filter((p) => !kindOf.has(p.id));
for (let i = rest.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [rest[i], rest[j]] = [rest[j], rest[i]];
}
const bag = bagOf(rated.length).filter((k) => k !== "반대");
rest.forEach((p, slot) => kindOf.set(p.id, bag[slot] ?? "일치"));

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
    if (kind === "일치") raw = 5.5 + off * 1.7 + (rnd() - 0.5) * 0.8 + bias * 0.4;
    else if (kind === "느슨") raw = 5.5 + off * 1.5 + (rnd() - 0.5) * 2 + bias * 0.7;
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
for (const k of KINDS) {
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
