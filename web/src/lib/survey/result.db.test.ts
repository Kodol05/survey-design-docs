import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { SECTION_COUNT, getSection, saveSection } from "./session";
import { completedResults, latestResult } from "./result";

/*
  제출 → 채점 결과 저장 (2026-09-30).

  여기가 잘못되면 **다 푼 응시의 결과가 안 남거나 잘못 남는다.** 제출 함수는
  로그인한 사람·화면 이동을 쓰므로, 그 둘만 가짜로 바꾸고 DB 는 진짜로 쓴다.
*/

const me = { id: "" };
vi.mock("../auth/guard", () => ({
  requireUser: async () => prisma.employee.findUniqueOrThrow({ where: { id: me.id } }),
}));
// 제출 끝의 결과 화면 이동은 예외로 끝난다. 그걸 받아 「이동했다」로 본다
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error(`REDIRECT ${to}`), { to });
  },
  unstable_rethrow: (e: unknown) => {
    if (e instanceof Error && e.message.startsWith("REDIRECT")) throw e;
  },
}));
// 제출 뒤 백업은 여기서 돌리지 않는다
vi.mock("next/server", () => ({ after: () => {} }));

const { submitAction } = await import("./actions");

/** 섹션마다 성향 1문항 + 직무능력 1문항인 작은 검사 */
async function seedAssessment() {
  const a = await prisma.assessment.create({
    data: { version: 1, title: "시험용", itemCount: SECTION_COUNT * 2, isActive: true },
  });
  const scales = ["자극추구", "위험회피", "사회적 민감성", "인내력", "자율성", "연대감", "자기초월"];
  const axes = ["COOPERATION", "ORG_LIFE", "AUTONOMY"] as const;
  let no = 0;
  for (let section = 1; section <= SECTION_COUNT; section++) {
    no++;
    await prisma.item.create({
      data: {
        assessmentId: a.id, code: `T${no}`, orderNo: no, section, kind: "TRAIT",
        scale: scales[section - 1], subscale: "하위", content: `문항 ${no}`, sourceRef: "시험용",
      },
    });
    no++;
    await prisma.item.create({
      data: {
        assessmentId: a.id, code: `A${no}`, orderNo: no, section, kind: "ABILITY",
        abilityAxis: axes[section % 3], isDirect: true, content: `문항 ${no}`, sourceRef: "시험용",
      },
    });
  }
}

async function answerAll(sessionId: string, value = 6) {
  for (let s = 1; s <= SECTION_COUNT; s++) {
    const { items } = await getSection(sessionId, s);
    await saveSection(
      sessionId,
      items.map((i) => ({ itemId: i.id, value, elapsedMs: 3000, changedCount: 0 })),
    );
  }
}

async function newSession(employeeId: string) {
  const a = await prisma.assessment.findFirstOrThrow();
  return prisma.testSession.create({
    data: { employeeId, assessmentId: a.id, assessmentVersion: 1 },
  });
}

async function submit(sessionId: string) {
  try {
    return await submitAction(sessionId);
  } catch (e) {
    return { redirect: (e as { to?: string }).to };
  }
}

beforeEach(async () => {
  await seedAssessment();
  const e = await prisma.employee.create({
    data: { name: "시험대상", phone: "01099990000", passwordHash: "x", passwordChangedAt: new Date() },
  });
  me.id = e.id;
});

describe("제출하면 결과가 남는다", () => {
  it("다 답하고 제출하면 결과·응답 신뢰도가 남고 세션이 끝난다", async () => {
    const s = await newSession(me.id);
    await answerAll(s.id);

    expect(await submit(s.id)).toEqual({ redirect: "/me" });

    const done = await prisma.testSession.findUniqueOrThrow({
      where: { id: s.id },
      include: { result: true, qualityFlag: true },
    });
    expect(done.status).toBe("COMPLETED");
    expect(done.result).not.toBeNull();
    expect(done.qualityFlag).not.toBeNull();
    // 일곱 축이 전부 채점됐다
    expect(Object.keys(done.result!.scoresJson as object)).toHaveLength(7);
  });

  it("⚠️ 빈 묶음이 있으면 결과를 만들지 않는다", async () => {
    const s = await newSession(me.id);
    const { items } = await getSection(s.id, 1);
    await saveSection(s.id, items.map((i) => ({ itemId: i.id, value: 4 })));

    const r = await submit(s.id);
    expect(r).toHaveProperty("error");
    expect(await prisma.result.count()).toBe(0);
  });

  it("끝난 응시는 다시 제출할 수 없다 — 결과가 둘이 되지 않는다", async () => {
    const s = await newSession(me.id);
    await answerAll(s.id);
    await submit(s.id);

    expect(await submit(s.id)).toHaveProperty("error");
    expect(await prisma.result.count()).toBe(1);
  });

  it("남의 응시는 제출할 수 없다", async () => {
    const other = await prisma.employee.create({
      data: { name: "남", phone: "01088880000", passwordHash: "x" },
    });
    const s = await newSession(other.id);
    await answerAll(s.id);

    expect(await submit(s.id)).toHaveProperty("error");
    expect(await prisma.result.count()).toBe(0);
  });
});

describe("다시 저장해도 응답시간이 지워지지 않는다 (2026-09-30)", () => {
  it("잰 값 없이 다시 저장하면 전에 잰 값을 그대로 둔다", async () => {
    const s = await newSession(me.id);
    const { items } = await getSection(s.id, 1);
    await saveSection(s.id, items.map((i) => ({ itemId: i.id, value: 4, elapsedMs: 2500, changedCount: 1 })));
    await saveSection(s.id, items.map((i) => ({ itemId: i.id, value: 5 })));

    const rows = await prisma.response.findMany({ where: { sessionId: s.id } });
    expect(rows.every((r) => r.value === 5 && r.elapsedMs === 2500 && r.changedCount === 1)).toBe(true);
  });
});

describe("지난 결과 보기", () => {
  it("최신 결과를 먼저, 지난 결과는 고르면 그것을 연다", async () => {
    const first = await newSession(me.id);
    await answerAll(first.id, 2);
    await submit(first.id);
    const second = await newSession(me.id);
    await answerAll(second.id, 6);
    await submit(second.id);

    const list = await completedResults(me.id);
    expect(list.map((l) => l.id)).toEqual([second.id, first.id]);

    expect((await latestResult(me.id))?.sessionId).toBe(second.id);
    expect((await latestResult(me.id, first.id))?.sessionId).toBe(first.id);
  });

  it("⚠️ 남의 응시 id 를 넣어도 남의 결과는 열리지 않는다", async () => {
    const mine = await newSession(me.id);
    await answerAll(mine.id);
    await submit(mine.id);

    const other = await prisma.employee.create({
      data: { name: "남", phone: "01088880000", passwordHash: "x", passwordChangedAt: new Date() },
    });
    me.id = other.id;
    const theirs = await newSession(other.id);
    await answerAll(theirs.id);
    await submit(theirs.id);

    // 내 id 로 남의 응시를 요청 → 내 최신 결과로
    const firstOwner = (await prisma.testSession.findUniqueOrThrow({ where: { id: mine.id } })).employeeId;
    expect((await latestResult(firstOwner, theirs.id))?.sessionId).toBe(mine.id);
  });
});
