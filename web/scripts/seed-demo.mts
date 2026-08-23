import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { scoreAssessment, type Answer, type ScorableItem } from "../src/lib/scoring/score";
import { assessQuality, type AntonymPair } from "../src/lib/scoring/quality";
import { ABILITY_AXIS_FROM_DB } from "../src/lib/items/types";

/**
 * 화면을 눈으로 확인하기 위한 가짜 데이터.
 * **운영 DB에서는 절대 돌리지 말 것.** 지울 때는 npm run demo:clear
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const TAG = "0109000"; // 데모 계정 번호 앞자리
const N = Number(process.argv[2] ?? 35);

const NAMES = "김서준 이하윤 박도윤 최시우 정하은 강지호 조수아 윤예준 장서연 임민준 한지아 오건우 신유진 서准호 권나윤 황시윤 안다은 송지훈 전소율 홍재원 유하린 고은우 문채원 양시후 배주하 백서윤 남도현 심예린 노준서 하지안 곽서아 성민재 차예온 주하람 구시온 표지우 방윤서 석태민 원가은 지승현".split(" ");

let seed = 20260823;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

await prisma.employee.deleteMany({ where: { phone: { startsWith: TAG } } });

const assessment = await prisma.assessment.findFirstOrThrow({ where: { isActive: true } });
const items = await prisma.item.findMany({ where: { assessmentId: assessment.id } });
const codeById = new Map(items.map((i) => [i.id, i.code]));
const scorable: ScorableItem[] = items.map((i) =>
  i.kind === "TRAIT"
    ? { code: i.code, kind: "TRAIT", scale: i.scale!, subscale: i.subscale!, isReverse: i.isReverse }
    : { code: i.code, kind: "ABILITY", abilityAxis: ABILITY_AXIS_FROM_DB[i.abilityAxis!], isReverse: i.isReverse },
);
const pairs: AntonymPair[] = items
  .filter((i) => i.antonymPairId && !i.isReverse)
  .map((i) => ({ a: i.code, b: codeById.get(i.antonymPairId!)! }));
const hash = await bcrypt.hash("demo1234", 10);

for (let n = 0; n < N; n++) {
  const phone = TAG + String(1000 + n).slice(-4);
  const emp = await prisma.employee.create({
    data: { name: NAMES[n % NAMES.length], phone, passwordHash: hash, passwordChangedAt: new Date() },
  });
  // 아직 응시 안 한 사람도 몇 명 둔다
  if (n % 9 === 8) continue;

  const session = await prisma.testSession.create({
    data: { employeeId: emp.id, assessmentId: assessment.id, assessmentVersion: assessment.version },
  });
  if (n % 9 === 7) continue; // 진행 중

  // 사람마다 성향이 다르게 나오도록 치우침을 준다
  const bias = -1.2 + rnd() * 2.4;
  const rows = items.map((it) => {
    const v = Math.round(4 + bias + (rnd() - 0.5) * 3);
    return {
      sessionId: session.id,
      itemId: it.id,
      value: Math.max(1, Math.min(7, v)),
      elapsedMs: 2500 + Math.round(rnd() * 6000),
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
    data: { status: "COMPLETED", completedAt: new Date(), durationSec: 900 + Math.round(rnd() * 600) },
  });
}

const done = await prisma.testSession.count({ where: { status: "COMPLETED" } });
console.log(`데모 계정 ${N}명 생성 — 응시 완료 ${done}명. 비밀번호는 전부 demo1234`);
await prisma.$disconnect();
