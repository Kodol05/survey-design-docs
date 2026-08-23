import { prisma } from "../db";

/**
 * 로그인 실패 제한 (00 §1).
 *
 * IP가 아니라 **계정 단위**로 잠근다. 사무실이 공인 IP를 공유하므로
 * IP로 막으면 한 사람이 틀렸다고 사무실 전체가 로그인을 못 하게 된다.
 */
export const LIMIT = {
  /** 권한이 크므로 관리자를 더 좁게 */
  user: 10,
  admin: 5,
  windowMs: 15 * 60 * 1000,
} as const;

export class LockedError extends Error {}

export async function assertNotLocked(key: string) {
  const a = await prisma.loginAttempt.findUnique({ where: { key } });
  if (a?.lockedUntil && a.lockedUntil > new Date()) {
    const min = Math.ceil((a.lockedUntil.getTime() - Date.now()) / 60000);
    throw new LockedError(`로그인 시도가 많아 잠겼습니다. ${min}분 뒤에 다시 시도해 주세요`);
  }
}

export async function recordFailure(key: string, max: number) {
  const a = await prisma.loginAttempt.findUnique({ where: { key } });
  const count = (a?.count ?? 0) + 1;
  const lockedUntil = count >= max ? new Date(Date.now() + LIMIT.windowMs) : null;
  await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, count, lockedUntil },
    update: { count, lockedUntil },
  });
}

export async function clearFailures(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
