import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  SECTION_COUNT,
  STALE_SESSION_DAYS,
  firstUnansweredSection,
  getOrCreateSession,
  getSection,
  saveSection,
  sessionProgress,
  sweepStaleSessions,
} from "./session";

/*
  설문을 **저장하고 이어받는** 부분 (2026-08-26).

  ## 왜 여기만 DB 테스트인가

  나머지 252개는 순수 계산이라 DB 없이 2초에 끝난다. 그런데 이 파일의
  함수들은 **DB를 직접 다루는 것 자체가 일**이라, 가짜로 바꿔치기하면
  정작 확인하고 싶은 것(덮어쓰나·통째로 취소되나·연쇄 삭제가 되나)이
  하나도 안 확인된다.

  ## 무엇을 지키려는 것인가

  이 파일이 잘못되면 **사람이 답한 것이 날아간다.** 화면이 어긋나는 것과는
  무게가 다르다. 특히 `sweepStaleSessions`는 조건 하나만 틀려도 **끝낸
  응시를 지운다.**
*/

/** 문항 몇 개짜리 검사 하나를 세운다. 실제 120문항을 쓸 필요는 없다 */
async function seedAssessment(perSection = 3) {
  const a = await prisma.assessment.create({
    data: {
      version: 1,
      title: "시험용",
      itemCount: perSection * SECTION_COUNT,
      isActive: true,
    },
  });

  let no = 0;
  for (let section = 1; section <= SECTION_COUNT; section++) {
    for (let i = 0; i < perSection; i++) {
      no++;
      await prisma.item.create({
        data: {
          assessmentId: a.id,
          code: `Q${no}`,
          orderNo: no,
          section,
          kind: "TRAIT",
          scale: "자극추구",
          subscale: "탐색적 흥분",
          content: `문항 ${no}`,
          sourceRef: "시험용",
        },
      });
    }
  }
  return a;
}

async function seedEmployee(name = "시험대상") {
  return prisma.employee.create({
    data: { name, phone: `0109999${Date.now() % 10000}`, passwordHash: "x" },
  });
}

/** 그 묶음 문항에 전부 같은 값으로 답한 초안 */
const draftsFor = (items: { id: string }[], value = 4) =>
  items.map((i) => ({ itemId: i.id, value, elapsedMs: 1000, changedCount: 0 }));

describe("응시 세션은 하나만 이어진다", () => {
  it("처음 들어오면 만든다", async () => {
    await seedAssessment();
    const me = await seedEmployee();

    const s = await getOrCreateSession(me.id);
    expect(s.status).toBe("IN_PROGRESS");
    expect(await prisma.testSession.count()).toBe(1);
  });

  it("⚠️ 다시 들어오면 **하던 것을 이어받는다** — 새로 만들면 처음부터 다시 하게 된다", async () => {
    await seedAssessment();
    const me = await seedEmployee();

    const first = await getOrCreateSession(me.id);
    const again = await getOrCreateSession(me.id);

    expect(again.id).toBe(first.id);
    expect(await prisma.testSession.count()).toBe(1);
  });

  it("다른 사람은 자기 세션을 받는다", async () => {
    await seedAssessment();
    const a = await seedEmployee("갑");
    const b = await seedEmployee("을");

    expect((await getOrCreateSession(a.id)).id).not.toBe(
      (await getOrCreateSession(b.id)).id,
    );
  });
});

describe("묶음 저장", () => {
  it("답한 수만큼 남는다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);
    const { items } = await getSection(s.id, 1);

    await saveSection(s.id, draftsFor(items));

    expect(await prisma.response.count({ where: { sessionId: s.id } })).toBe(
      items.length,
    );
  });

  it("⚠️ 같은 문항에 다시 답하면 **덮어쓴다** — 줄이 늘어나면 한 사람 답이 둘이 된다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);
    const { items } = await getSection(s.id, 1);

    await saveSection(s.id, draftsFor(items, 2));
    await saveSection(s.id, draftsFor(items, 6));

    expect(await prisma.response.count({ where: { sessionId: s.id } })).toBe(
      items.length,
    );
    const one = await prisma.response.findFirst({ where: { sessionId: s.id } });
    expect(one?.value).toBe(6);
  });

  it("1~7 밖의 값은 받지 않는다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);
    const { items } = await getSection(s.id, 1);

    await expect(saveSection(s.id, draftsFor(items, 0))).rejects.toThrow();
    await expect(saveSection(s.id, draftsFor(items, 8))).rejects.toThrow();
  });

  it("잘못된 값이 하나라도 있으면 DB 에 닿기 전에 멈춘다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);
    const { items } = await getSection(s.id, 1);

    const mixed = draftsFor(items);
    mixed[mixed.length - 1].value = 99; // 마지막 하나만 잘못된 값

    await expect(saveSection(s.id, mixed)).rejects.toThrow();
    expect(await prisma.response.count({ where: { sessionId: s.id } })).toBe(0);
  });

  /*
    ⚠️ **트랜잭션이 없어졌으니 여기서 무엇이 남는지 못 박아 둔다** (2026-09-18).

    예전에는 이 저장이 `$transaction([...])` 한 덩어리라 「저장하다 실패하면
    통째로 취소된다」였다. 지금은 Neon 을 HTTP 드라이버로 붙는데 이건
    트랜잭션을 지원하지 않아(`lib/db.ts` 참고), **하나씩 순서대로 쓴다.**
    그래서 저장 도중 DB 에서 걸리면 **앞의 정상 응답은 남는다.**

    그래도 사람 답이 뒤틀리지 않는 이유는 두 가지다 —
    ① 값 1~7 검사가 DB 에 닿기 전에 다 끝나므로, 실제 응시에서 나올 수 있는
       실패가 아니다(여기선 없는 문항으로 억지로 실패시킨다).
    ② 각 응답이 (세션·문항)으로 upsert 라, 그 묶음을 다시 저장하면 남은 것은
       채워지고 이미 쓴 것은 같은 값으로 덮여 **겹치지 않는다.**

    이 테스트는 그 두 가지를 함께 못 박는다 — 중간에 걸리면 앞은 남고,
    이어서 온전히 다시 저장하면 묶음이 정확히 완성된다.
  */
  it("⚠️ 저장 도중 걸리면 앞부분은 남고, 다시 저장하면 온전히 채워진다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);
    const { items } = await getSection(s.id, 1);

    const broken = [
      ...draftsFor(items),
      { itemId: "없는문항", value: 4, elapsedMs: 1000, changedCount: 0 },
    ];

    // 없는 문항에서 외래키에 걸려 던진다. 하지만 앞의 정상 응답은 이미 쓰였다
    await expect(saveSection(s.id, broken)).rejects.toThrow();
    expect(await prisma.response.count({ where: { sessionId: s.id } })).toBe(
      items.length,
    );

    // 이어하기로 그 묶음을 온전히 다시 저장하면, upsert 라 겹치지 않고 완성된다
    await saveSection(s.id, draftsFor(items, 5));
    expect(await prisma.response.count({ where: { sessionId: s.id } })).toBe(
      items.length,
    );
    const one = await prisma.response.findFirst({ where: { sessionId: s.id } });
    expect(one?.value).toBe(5);
  });
});

describe("어디까지 했는지", () => {
  it("아무것도 안 했으면 첫 묶음", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);

    expect(await firstUnansweredSection(s.id)).toBe(1);
  });

  it("한 묶음을 끝내면 다음 묶음을 가리킨다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);
    const { items } = await getSection(s.id, 1);

    await saveSection(s.id, draftsFor(items));

    expect(await firstUnansweredSection(s.id)).toBe(2);
  });

  it("한 묶음 안에서 하나라도 빠지면 그 묶음에 머문다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);
    const { items } = await getSection(s.id, 1);

    await saveSection(s.id, draftsFor(items).slice(0, -1));

    expect(await firstUnansweredSection(s.id)).toBe(1);
  });

  it("전부 답하면 남은 묶음이 없다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);

    for (let n = 1; n <= SECTION_COUNT; n++) {
      const { items } = await getSection(s.id, n);
      await saveSection(s.id, draftsFor(items));
    }

    expect(await firstUnansweredSection(s.id)).toBeNull();
  });
});

describe("진행률 — 막대가 쓰는 수", () => {
  it("답한 만큼 센다", async () => {
    const a = await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);

    const before = await sessionProgress(s.id);
    expect(before.saved).toBe(0);
    expect(before.total).toBe(a.itemCount);

    const { items } = await getSection(s.id, 1);
    await saveSection(s.id, draftsFor(items));

    expect((await sessionProgress(s.id)).saved).toBe(items.length);
  });
});

describe("14일 정리", () => {
  const longAgo = () =>
    new Date(Date.now() - (STALE_SESSION_DAYS! + 1) * 86_400_000);

  it("오래 손 놓은 진행 중 세션은 중단으로 바꾼다", async () => {
    const a = await seedAssessment();
    const me = await seedEmployee();
    const s = await prisma.testSession.create({
      data: {
        employeeId: me.id,
        assessmentId: a.id,
        assessmentVersion: 1,
        startedAt: longAgo(),
      },
    });

    await sweepStaleSessions();

    expect((await prisma.testSession.findUnique({ where: { id: s.id } }))?.status).toBe(
      "ABANDONED",
    );
  });

  it("⚠️ **끝낸 세션은 건드리지 않는다** — 여기가 틀리면 완료된 응시가 사라진다", async () => {
    const a = await seedAssessment();
    const me = await seedEmployee();
    const done = await prisma.testSession.create({
      data: {
        employeeId: me.id,
        assessmentId: a.id,
        assessmentVersion: 1,
        startedAt: longAgo(),
        status: "COMPLETED",
        completedAt: longAgo(),
      },
    });

    await sweepStaleSessions();

    expect(
      (await prisma.testSession.findUnique({ where: { id: done.id } }))?.status,
    ).toBe("COMPLETED");
  });

  it("최근에 시작한 것은 그대로 둔다", async () => {
    await seedAssessment();
    const me = await seedEmployee();
    const s = await getOrCreateSession(me.id);

    await sweepStaleSessions();

    expect((await prisma.testSession.findUnique({ where: { id: s.id } }))?.status).toBe(
      "IN_PROGRESS",
    );
  });

  it("⚠️ 답한 내용은 지우지 않는다 — 상태만 바뀐다", async () => {
    const a = await seedAssessment();
    const me = await seedEmployee();
    const s = await prisma.testSession.create({
      data: {
        employeeId: me.id,
        assessmentId: a.id,
        assessmentVersion: 1,
        startedAt: longAgo(),
      },
    });
    const { items } = await getSection(s.id, 1);
    await saveSection(s.id, draftsFor(items));

    await sweepStaleSessions();

    expect(await prisma.response.count({ where: { sessionId: s.id } })).toBe(
      items.length,
    );
  });
});
