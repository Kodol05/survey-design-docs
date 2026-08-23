import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { scoreAssessment, type Answer, type ScorableItem } from "../src/lib/scoring/score";
import { assessQuality, type AntonymPair } from "../src/lib/scoring/quality";
import { ABILITY_AXIS_FROM_DB, TRAIT_SCALES } from "../src/lib/items/types";

/**
 * 화면 확인용 가짜 데이터.
 *
 * ⚠️ **운영 DB에서는 절대 돌리지 말 것.** 지울 때는 npm run demo:clear
 *
 * ── 왜 이렇게 만드나 ────────────────────────────────────────────────
 *
 * 그냥 난수를 넣으면 두 가지가 다 틀린다.
 *
 *  1) 사람마다 치우침 하나만 주면 **일곱 축이 전부 같이 움직인다.** 상관
 *     화면을 켜면 모든 칸이 상관 있는 것처럼 나와서 화면 검증이 안 된다.
 *  2) 완전 무작위로 하면 **아무 상관도 안 나온다.** 상관 표·산점도·계산식이
 *     전부 빈 화면이 되어 이것도 검증이 안 된다.
 *
 * 그래서 **관련도 표(07)의 관계를 실제로 심어 넣는다.** 성향 7축은 서로
 * 거의 독립으로 뽑고, 직무능력은 그 축들의 가중합 + 잡음으로 만든다.
 * 그러면 사내 관련도 화면에 07의 값과 비슷한 숫자가 나와야 정상이다.
 *
 * 조직생활은 연구 값이 하나도 없는 축이라(07), **연구 표에는 없지만 사내
 * 데이터에는 있는 관계**를 일부러 심어 둔다. 대표님이 보실 화면에서 가장
 * 흥미로운 경우가 이것이다.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TAG = "0109000"; // 데모 계정 번호 앞자리
const N = Number(process.argv[2] ?? 42);

const NAMES =
  "김서준 이하윤 박도윤 최시우 정하은 강지호 조수아 윤예준 장서연 임민준 한지아 오건우 신유진 서준호 권나윤 황시윤 안다은 송지훈 전소율 홍재원 유하린 고은우 문채원 양시후 배주하 백서윤 남도현 심예린 노준서 하지안 곽서아 성민재 차예온 주하람 구시온 표지우 방윤서 석태민 원가은 지승현 배소민 임찬영".split(
    " ",
  );

// ── 고정 난수 ──────────────────────────────────────────────────────
//
// mulberry32를 쓴다. 단순 LCG(`seed * 1103515245 + 12345`)는 **연속해서 뽑은
// 값끼리 상관이 생긴다.** 한 사람의 7축을 연달아 뽑으면 축끼리 독립이 아니게
// 되고, 그러면 심지도 않은 상관이 화면에 나타난다. 실제로 그렇게 나왔다.
let seed = 20260823;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** 표준정규. 사람 점수가 가운데 몰리고 양끝이 드물게 나오도록 */
const gauss = () => {
  const u = Math.max(1e-9, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
};

/**
 * 직무능력을 만들 가중치. 07 관련도 표의 값을 그대로 쓴다.
 * 조직생활만 연구 값이 없어 우리가 정한다 — 사내에서만 보이는 관계.
 */
const ABILITY_WEIGHTS: Record<string, Record<string, number>> = {
  협력: { 인내력: 0.28, 사회적민감성: -0.34, 위험회피: -0.25 },
  자율적실행: { 자율성: 0.48, 위험회피: -0.36, 연대감: 0.23, 인내력: 0.14 },
  // 연구 표는 비어 있지만 사내 데이터에는 관계가 보이는 경우
  조직생활: { 연대감: 0.4, 사회적민감성: 0.22, 자극추구: -0.18 },
};

await prisma.employee.deleteMany({ where: { phone: { startsWith: TAG } } });

const assessment = await prisma.assessment.findFirstOrThrow({ where: { isActive: true } });
const items = await prisma.item.findMany({ where: { assessmentId: assessment.id } });
const codeById = new Map(items.map((i) => [i.id, i.code]));

const scorable: ScorableItem[] = items.map((i) =>
  i.kind === "TRAIT"
    ? {
        code: i.code,
        kind: "TRAIT",
        scale: i.scale!,
        subscale: i.subscale!,
        isReverse: i.isReverse,
      }
    : {
        code: i.code,
        kind: "ABILITY",
        abilityAxis: ABILITY_AXIS_FROM_DB[i.abilityAxis!],
        isReverse: i.isReverse,
      },
);
const pairs: AntonymPair[] = items
  .filter((i) => i.antonymPairId && !i.isReverse)
  .map((i) => ({ a: i.code, b: codeById.get(i.antonymPairId!)! }));

const hash = await bcrypt.hash("demo1234", 10);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 나중에 상관을 확인하려고 모아둔다 */
const collected: { traits: Record<string, number>; abilities: Record<string, number> }[] = [];

for (let n = 0; n < N; n++) {
  const phone = TAG + String(1000 + n).slice(-4);
  const emp = await prisma.employee.create({
    data: {
      name: NAMES[n % NAMES.length],
      phone,
      passwordHash: hash,
      passwordChangedAt: new Date(),
    },
  });

  if (n % 11 === 10) continue; // 미응시자

  const session = await prisma.testSession.create({
    data: {
      employeeId: emp.id,
      assessmentId: assessment.id,
      assessmentVersion: assessment.version,
    },
  });
  if (n % 11 === 9) continue; // 진행 중

  // ── 이 사람의 속성 ──
  // 성향 7축은 서로 거의 독립. 한 축이 높다고 다른 축이 따라 높지 않게 한다.
  const traitZ: Record<string, number> = {};
  for (const s of TRAIT_SCALES) traitZ[s] = gauss();

  // 하위척도는 축을 따라가되 조금씩 흔들린다 (같은 71도 안이 갈리도록)
  const facetOffset = new Map<string, number>();
  for (const it of items)
    if (it.kind === "TRAIT" && !facetOffset.has(`${it.scale}/${it.subscale}`))
      facetOffset.set(`${it.scale}/${it.subscale}`, gauss() * 0.45);

  // 직무능력은 성향의 가중합 + 잡음. 여기가 상관을 심는 자리다.
  const abilityZ: Record<string, number> = {};
  for (const [axis, w] of Object.entries(ABILITY_WEIGHTS)) {
    let v = 0;
    for (const [scale, k] of Object.entries(w)) v += k * traitZ[scale];
    // 잡음이 너무 크면 심은 관계보다 우연 상관이 커진다. 능력 문항이 3개뿐이라
    // 측정 자체의 잡음도 이미 상당하므로(α 문제, 07) 여기는 적당히 둔다.
    abilityZ[axis] = v + gauss() * 0.45;
  }

  // 열에 한 명쯤은 대충 찍는 사람 — 응답 품질 화면을 확인하려면 필요하다
  const careless = n % 10 === 4;

  const rows = items.map((it) => {
    let desired: number;
    if (careless) {
      desired = 1 + Math.floor(rnd() * 7);
    } else {
      const z =
        it.kind === "TRAIT"
          ? traitZ[it.scale!] + (facetOffset.get(`${it.scale}/${it.subscale}`) ?? 0)
          : abilityZ[ABILITY_AXIS_FROM_DB[it.abilityAxis!]];
      // z(표준정규) → 1~7. 문항 단위 잡음도 넣는다
      desired = clamp(Math.round(4 + z * 1.15 + gauss() * 0.7), 1, 7);
    }
    // 역채점 문항은 뒤집어서 답해야 채점 결과가 의도대로 나온다
    const value = it.isReverse ? 8 - desired : desired;
    return {
      sessionId: session.id,
      itemId: it.id,
      value,
      elapsedMs: careless ? 400 + Math.round(rnd() * 800) : 2500 + Math.round(rnd() * 6500),
      changedCount: rnd() < 0.15 ? 1 : 0,
    };
  });
  await prisma.response.createMany({ data: rows });

  const answers: Answer[] = rows.map((r) => ({ code: codeById.get(r.itemId)!, value: r.value }));
  const scores = scoreAssessment(scorable, answers);
  const q = assessQuality(
    rows.map((r) => ({ code: codeById.get(r.itemId)!, value: r.value, elapsedMs: r.elapsedMs })),
    pairs,
  );

  collected.push({
    traits: Object.fromEntries(Object.entries(scores.traits).map(([k, v]) => [k, v.percent])),
    abilities: Object.fromEntries(
      Object.entries(scores.abilities).map(([k, v]) => [k, v.percent]),
    ),
  });

  await prisma.result.create({
    data: {
      sessionId: session.id,
      scoresJson: scores.traits,
      abilityScoresJson: scores.abilities,
      snapshotJson: { traits: scores.traits, abilities: scores.abilities },
    },
  });
  await prisma.qualityFlag.create({
    data: {
      sessionId: session.id,
      meanElapsedMs: q.meanElapsedMs,
      fastCount: q.fastCount,
      antonymAgreement: q.antonymAgreement,
      flag: q.flag,
    },
  });
  await prisma.testSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      durationSec: 900 + Math.round(rnd() * 600),
    },
  });
}

// ── 심은 관계가 실제로 나오는지 확인 ──
function corr(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

const done = await prisma.testSession.count({ where: { status: "COMPLETED" } });
console.log(`\n데모 계정 ${N}명 — 응시 완료 ${done}명. 비밀번호는 전부 demo1234`);
console.log(`대충 찍은 사람 ${collected.length > 0 ? Math.floor(N / 10) : 0}명쯤 섞여 있습니다\n`);

console.log("심은 관계가 데이터에 나오는지 확인 (사내 상관)");
for (const [axis, w] of Object.entries(ABILITY_WEIGHTS)) {
  const ys = collected.map((c) => c.abilities[axis]);
  const parts = TRAIT_SCALES.map((s) => {
    const r = corr(
      collected.map((c) => c.traits[s]),
      ys,
    );
    const planted = w[s];
    const mark = planted ? "*" : " ";
    return `${mark}${s} ${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(2)}`;
  });
  console.log(`  ${axis.padEnd(6)} ${parts.join("  ")}`);
}
console.log("\n  * 표시가 일부러 심은 관계입니다. 나머지는 우연히 나온 값입니다.\n");

await prisma.$disconnect();
