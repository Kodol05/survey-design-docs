import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadItemFile } from "../src/lib/items/load";
import { ABILITY_AXIS_DB, TRAIT_SCALES } from "../src/lib/items/types";
import type { AbilityItem, Item, TraitItem } from "../src/lib/items/types";

/**
 * seed — 문항 파일을 DB에 넣고 최초 관리자 계정을 만든다.
 *
 * 핵심은 **형식 검사를 통과하지 못하면 주입을 막는 것**이다(00 §2.4).
 * 근거 출처가 비었거나 역방향 짝이 어긋난 문항이 DB에 들어가면
 * 나중에 조용히 틀린 결과가 나온다.
 *
 * 몇 번을 돌려도 결과가 같아야 한다(멱등).
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ASSESSMENT_VERSION = 1;

// ── 배치 규칙 ────────────────────────────────────────────────────────
//
// 섹션은 성향 7축 그대로 7개. 직무능력 9문항은 일곱 섹션에 나눠 섞는다(07).
// 뒤에 몰아두면 "이제 능력 평가구나" 하고 태도가 바뀌기 때문이다.
//
// 같은 능력의 3문항은 서로 다른 섹션에 흩어놓는다.
const ABILITY_PLACEMENT: Record<number, string[]> = {
  1: ["AB-COOP-01"],
  2: ["AB-ORG-01"],
  3: ["AB-AUTO-01"],
  4: ["AB-COOP-02", "AB-ORG-02"],
  5: ["AB-AUTO-02"],
  6: ["AB-COOP-03", "AB-ORG-03"],
  7: ["AB-AUTO-03"],
};

/** 섹션 안에서 직무능력 문항이 들어갈 자리 (0부터 센다) */
const ABILITY_SLOTS = [4, 11];

/**
 * 같은 하위척도 문항이 연달아 나오지 않게 하위척도를 번갈아 뽑는다.
 * 부수 효과로 역방향 짝이 4칸쯤 벌어져서 응답자가 짝을 눈치채기 어려워진다.
 */
function interleaveByFacet(items: TraitItem[]): TraitItem[] {
  const buckets = new Map<string, TraitItem[]>();
  for (const it of items) {
    const b = buckets.get(it.subscale) ?? [];
    b.push(it);
    buckets.set(it.subscale, b);
  }
  const lists = [...buckets.values()];
  const out: TraitItem[] = [];
  for (let i = 0; out.length < items.length; i++) {
    for (const list of lists) if (list[i]) out.push(list[i]);
  }
  return out;
}

async function main() {
  // 형식 검사를 통과하지 못하면 여기서 멈춘다
  const file = loadItemFile("data/items/v1.yaml", { strictCount: true });
  console.log(`문항 파일 검사 통과 — ${file.items.length}개`);

  const traits = file.items.filter((i): i is TraitItem => i.kind === "trait");
  const abilities = new Map(
    file.items
      .filter((i): i is AbilityItem => i.kind === "ability")
      .map((i) => [i.code, i]),
  );

  // ── 섹션·순번 배정 ──
  const ordered: { item: Item; section: number; orderNo: number }[] = [];
  let orderNo = 1;

  for (const [idx, scale] of TRAIT_SCALES.entries()) {
    const section = idx + 1;
    const inScale = interleaveByFacet(traits.filter((t) => t.scale === scale));
    const toInsert = (ABILITY_PLACEMENT[section] ?? []).map((code) => {
      const a = abilities.get(code);
      if (!a) throw new Error(`배치표에 있는 ${code} 문항이 파일에 없습니다`);
      return a;
    });

    const slots = new Map(toInsert.map((a, i) => [ABILITY_SLOTS[i], a]));
    for (let i = 0, placed = 0; i < inScale.length + toInsert.length; i++) {
      const ability = slots.get(i);
      const item = ability ?? inScale[i - placed];
      if (ability) placed++;
      ordered.push({ item, section, orderNo: orderNo++ });
    }
  }

  if (ordered.length !== file.items.length)
    throw new Error(`배치 결과가 ${ordered.length}개입니다. ${file.items.length}개여야 합니다`);

  // ── 주입 ──
  // 같은 버전을 다시 돌리면 문항을 갈아끼운다. 응답이 붙어 있으면 지우지 않는다.
  const existing = await prisma.assessment.findUnique({
    where: { version: ASSESSMENT_VERSION },
    include: { _count: { select: { sessions: true } } },
  });

  if (existing?._count.sessions) {
    console.log(
      `\n중단 — v${ASSESSMENT_VERSION}에 이미 응시 기록 ${existing._count.sessions}건이 있습니다.` +
        `\n문항을 바꾸려면 새 버전을 만드세요. 기존 응답의 근거가 사라집니다.`,
    );
    return;
  }

  const assessment = await prisma.assessment.upsert({
    where: { version: ASSESSMENT_VERSION },
    create: {
      version: ASSESSMENT_VERSION,
      title: file.title,
      itemCount: file.items.length,
      isActive: true,
    },
    update: { title: file.title, itemCount: file.items.length, isActive: true },
  });

  await prisma.item.deleteMany({ where: { assessmentId: assessment.id } });

  await prisma.item.createMany({
    data: ordered.map(({ item, section, orderNo }) => ({
      assessmentId: assessment.id,
      code: item.code,
      orderNo,
      section,
      kind: item.kind === "trait" ? ("TRAIT" as const) : ("ABILITY" as const),
      scale: item.kind === "trait" ? item.scale : null,
      subscale: item.kind === "trait" ? item.subscale : null,
      abilityAxis:
        item.kind === "ability"
          ? (ABILITY_AXIS_DB[item.axis] as "COOPERATION" | "ORG_LIFE" | "AUTONOMY")
          : null,
      isDirect: item.kind === "ability" ? item.direct : null,
      content: item.content,
      isReverse: Boolean(item.reverse),
      sourceRef: item.sourceRef,
    })),
  });

  // 역방향 짝은 코드가 아니라 DB id로 연결한다
  const saved = await prisma.item.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, code: true },
  });
  const idByCode = new Map(saved.map((s) => [s.code, s.id]));
  for (const it of file.items) {
    if (!it.antonymOf) continue;
    await prisma.item.update({
      where: { id: idByCode.get(it.code)! },
      data: { antonymPairId: idByCode.get(it.antonymOf)! },
    });
  }

  console.log(`문항 주입 완료 — v${assessment.version}, ${saved.length}개`);
  for (let s = 1; s <= 7; s++) {
    const n = ordered.filter((o) => o.section === s).length;
    const ab = ordered.filter(
      (o) => o.section === s && o.item.kind === "ability",
    ).length;
    console.log(`  섹션 ${s}: ${TRAIT_SCALES[s - 1]} ${n}문항 (직무능력 ${ab})`);
  }

  // ── 최초 관리자 ──
  const loginId = process.env.ADMIN_LOGIN_ID;
  const initial = process.env.ADMIN_INITIAL_PASSWORD;
  if (!loginId || !initial) {
    console.log("\nADMIN_LOGIN_ID / ADMIN_INITIAL_PASSWORD 가 없어 관리자 생성을 건너뜁니다");
  } else {
    const admin = await prisma.employee.upsert({
      where: { loginId },
      create: {
        name: "관리자",
        loginId,
        passwordHash: await bcrypt.hash(initial, 10),
        role: "ADMIN",
        // 비어 있으면 최초 로그인 시 비밀번호 변경을 강제한다
        passwordChangedAt: null,
      },
      update: {},
    });
    console.log(`\n관리자 계정 — ${admin.loginId} (최초 로그인 시 비밀번호 변경 필요)`);
  }
}

await main();
await prisma.$disconnect();
