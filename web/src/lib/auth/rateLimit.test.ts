import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 로그인 실패 잠금.
 *
 * **보안 장치인데 아무도 확인하지 않고 있었다.** 「정말 5번에 잠기는가」,
 * 「성공하면 풀리는가」를 사람이 손으로 시험할 수는 없다.
 *
 * DB를 띄우지 않고 보기 위해 `prisma`만 가짜로 바꾼다 — 잠금 판단 규칙
 * 자체가 시험 대상이다.
 */
const store = new Map<
  string,
  { count: number; lockedUntil: Date | null; updatedAt?: Date }
>();

vi.mock("../db", () => ({
  prisma: {
    loginAttempt: {
      findUnique: async ({ where }: { where: { key: string } }) =>
        store.get(where.key) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { key: string };
        create: { count: number; lockedUntil: Date | null };
        update: { count: number; lockedUntil: Date | null };
      }) => {
        store.set(where.key, { ...(store.has(where.key) ? update : create), updatedAt: new Date() });
      },
      deleteMany: async ({ where }: { where: { key: string } }) => {
        store.delete(where.key);
      },
    },
  },
}));

const { LIMIT, LockedError, assertNotLocked, clearFailures, recordFailure } =
  await import("./rateLimit");

beforeEach(() => store.clear());

describe("로그인 실패 잠금", () => {
  it("한도 직전까지는 안 잠근다", async () => {
    for (let i = 0; i < LIMIT.admin - 1; i++) await recordFailure("admin", LIMIT.admin);
    await expect(assertNotLocked("admin")).resolves.toBeUndefined();
  });

  it("한도에 닿으면 잠근다", async () => {
    for (let i = 0; i < LIMIT.admin; i++) await recordFailure("admin", LIMIT.admin);
    await expect(assertNotLocked("admin")).rejects.toBeInstanceOf(LockedError);
  });

  it("관리자가 사원보다 좁다", () => {
    // 권한이 크므로 시도 횟수를 적게 준다 (00 §1)
    expect(LIMIT.admin).toBeLessThan(LIMIT.user);
  });

  it("성공하면 풀린다", async () => {
    for (let i = 0; i < LIMIT.admin; i++) await recordFailure("admin", LIMIT.admin);
    await clearFailures("admin");
    await expect(assertNotLocked("admin")).resolves.toBeUndefined();
  });

  it("계정마다 따로 센다 — 한 사람 때문에 남이 잠기면 안 된다", async () => {
    /*
      IP가 아니라 계정 단위로 잠그는 이유다. 사무실이 공인 IP를 공유하므로
      IP로 막으면 한 사람이 틀렸다고 사무실 전체가 못 들어온다.
    */
    for (let i = 0; i < LIMIT.user; i++) await recordFailure("01012345678", LIMIT.user);
    await expect(assertNotLocked("01012345678")).rejects.toBeInstanceOf(LockedError);
    await expect(assertNotLocked("01099998888")).resolves.toBeUndefined();
  });

  it("잠금이 풀리는 시각이 지나면 다시 들어갈 수 있다", async () => {
    for (let i = 0; i < LIMIT.admin; i++) await recordFailure("admin", LIMIT.admin);
    const row = store.get("admin")!;
    row.lockedUntil = new Date(Date.now() - 1000);
    await expect(assertNotLocked("admin")).resolves.toBeUndefined();
  });
  it("창(15분)이 지나면 실패 횟수를 처음부터 다시 센다 — 영영 잠그기 방지", async () => {
    for (let n = 0; n < LIMIT.admin - 1; n++) await recordFailure("admin", LIMIT.admin);
    // 창이 지난 것처럼 마지막 기록 시각을 뒤로 돌린다
    const a = store.get("admin")!;
    store.set("admin", { ...a, updatedAt: new Date(Date.now() - LIMIT.windowMs - 1) });

    await recordFailure("admin", LIMIT.admin);
    expect(store.get("admin")!.count).toBe(1);
    await expect(assertNotLocked("admin")).resolves.toBeUndefined();
  });
});
