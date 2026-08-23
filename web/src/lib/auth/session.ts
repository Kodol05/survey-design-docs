import "server-only";
import { cookies } from "next/headers";
import { prisma } from "../db";

/** 세션 쿠키. Next 16에서 cookies()는 비동기다. */

const COOKIE = "survey_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12시간 — 하루 일과를 넘기지 않는다

export async function createSession(employeeId: string) {
  const s = await prisma.authSession.create({
    data: { employeeId, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  const jar = await cookies();
  jar.set(COOKIE, s.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // 사내 서버가 HTTPS가 아닐 수 있어 개발/운영을 나눈다
    secure: process.env.NODE_ENV === "production",
    expires: s.expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await prisma.authSession.deleteMany({ where: { id } });
  jar.delete(COOKIE);
}

/** 로그인한 사람. 없으면 null. */
export async function currentUser() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const s = await prisma.authSession.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!s || s.expiresAt < new Date()) return null;
  return s.employee;
}
