import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { scoreAssessment, type Answer, type ScorableItem } from "../src/lib/scoring/score";
import { assessQuality, type AntonymPair } from "../src/lib/scoring/quality";
import { ABILITY_AXIS_FROM_DB } from "../src/lib/items/types";
import { orderedAbilities, orderedTraits } from "../src/lib/survey/result";

/** 응시 한 바퀴를 실제 DB로 돌려본다. 끝나면 만든 데이터를 지운다. */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const PHONE = "01099998888";

await prisma.employee.deleteMany({ where: { phone: PHONE } });
const emp = await prisma.employee.create({
  data: { name: "스모크", phone: PHONE, passwordHash: "x", passwordChangedAt: new Date() },
});

const assessment = await prisma.assessment.findFirstOrThrow({ where: { isActive: true } });
const session = await prisma.testSession.create({
  data: {
    employeeId: emp.id,
    assessmentId: assessment.id,
    assessmentVersion: assessment.version,
  },
});

const items = await prisma.item.findMany({
  where: { assessmentId: assessment.id },
  orderBy: { orderNo: "asc" },
});
console.log(`문항 ${items.length}개, 섹션 ${new Set(items.map((i) => i.section)).size}개`);

// 섹션마다 저장 — 실제 흐름과 같게
for (let sec = 1; sec <= 7; sec++) {
  const inSec = items.filter((i) => i.section === sec);
  await prisma.$transaction(
    inSec.map((it, k) =>
      prisma.response.create({
        data: {
          sessionId: session.id,
          itemId: it.id,
          value: (k % 7) + 1,
          elapsedMs: 4200,
          changedCount: 0,
        },
      }),
    ),
  );
}
console.log(`응답 저장 ${await prisma.response.count({ where: { sessionId: session.id } })}건`);

const codeById = new Map(items.map((i) => [i.id, i.code]));
const responses = await prisma.response.findMany({ where: { sessionId: session.id } });
const answers: Answer[] = responses.map((r) => ({
  code: codeById.get(r.itemId)!,
  value: r.value,
}));
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
const scores = scoreAssessment(scorable, answers);

console.log("\n성향 7축");
for (const t of orderedTraits(scores.traits as never))
  console.log(`  ${t.scale.padEnd(7)} ${t.raw}/${t.max}  ${t.percent.toFixed(1)}%  ${t.band}`);
console.log("직무능력");
for (const a of orderedAbilities(scores.abilities as never))
  console.log(`  ${a.axis.padEnd(7)} ${a.raw}/${a.max}  ${a.percent.toFixed(1)}%  ${a.band}`);

const pairs: AntonymPair[] = items
  .filter((i) => i.antonymPairId && !i.isReverse)
  .map((i) => ({ a: i.code, b: codeById.get(i.antonymPairId!)! }));
const q = assessQuality(
  responses.map((r) => ({
    code: codeById.get(r.itemId)!,
    value: r.value,
    elapsedMs: r.elapsedMs,
  })),
  pairs,
);
console.log(`\n응답 품질  ${q.flag}  일치도 ${q.antonymAgreement.toFixed(2)}  짝 ${q.pairCount}쌍`);

await prisma.result.create({
  data: {
    sessionId: session.id,
    scoresJson: scores.traits,
    abilityScoresJson: scores.abilities,
    snapshotJson: { traits: scores.traits, abilities: scores.abilities },
  },
});
await prisma.testSession.update({
  where: { id: session.id },
  data: { status: "COMPLETED", completedAt: new Date(), durationSec: 1020 },
});

const stored = await prisma.result.findFirstOrThrow({ where: { sessionId: session.id } });
const back = orderedAbilities(stored.abilityScoresJson as never);
console.log(`\n저장 후 다시 읽기 — 능력 ${back.length}개: ${back.map((a) => a.axis).join(", ")}`);
if (back.length !== 3) throw new Error("직무능력이 화면에서 안 읽힙니다");

await prisma.employee.delete({ where: { id: emp.id } });
console.log("정리 완료");
await prisma.$disconnect();
