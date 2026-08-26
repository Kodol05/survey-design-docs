import "server-only";
import { cookies } from "next/headers";
import { prisma } from "../db";

/** 세션 쿠키. Next 16에서 cookies()는 비동기다. */

const COOKIE = "survey_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12시간 — 하루 일과를 넘기지 않는다

/**
 * 만료된 로그인 기록을 치운다 (2026-08-26).
 *
 * ## 무엇이 남고 있었나
 *
 * 이 표는 네 칸뿐이다 — 쿠키에 담기는 무작위 `id`, 누구인지, 언제 로그인했나,
 * 언제까지 유효한가. **설문과 관련된 것은 하나도 없다** (그건 `TestSession`과
 * `Response`다. 이름이 둘 다 「세션」이라 헷갈린다).
 *
 * 12시간이 지나면 인증에 더는 안 쓰이는데, **행 자체는 그대로 남았다.**
 * `destroySession`은 로그아웃을 눌렀을 때만 지우고, 그냥 창을 닫으면 남는다.
 * 실제로 확인해 보니 아홉 개 중 여덟이 만료된 것이었다.
 *
 * 기능에는 지장이 없지만 **「누가 언제 로그인했다」가 지워지지 않고 쌓인다.**
 * 50명이 1년 쓰면 만 8천 줄이고, 그건 없어도 되는데 계속 보관하는 개인
 * 기록이다. 감사 로그를 일부러 두지 않기로 한 결정(D-29)과도 어긋난다.
 *
 * ## 왜 여기서 치우나
 *
 * 이 표는 **로그인할 때만 늘어난다.** 늘어나는 자리에서 치우면 늘어나는
 * 속도와 치우는 속도가 같아져 테이블이 커지지 않는다. 별도 스케줄러를 두지
 * 않는 것은 「오래된 응시 세션 정리」·「백업」과 같은 방식이다.
 *
 * ⚠️ **만료된 것만** 지운다. 「로그인하면 이전 기기는 로그아웃」은 동작이
 * 바뀌는 정책이라 여기서 하지 않는다 — 이건 청소지 정책 변경이 아니다.
 */
async function sweepExpired() {
  await prisma.authSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function createSession(employeeId: string) {
  // 만드는 자리에서 치운다. 실패해도 로그인은 되어야 하므로 막지 않는다
  await sweepExpired().catch(() => {});

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

/**
 * 로그아웃.
 *
 * ⚠️ **쿠키를 먼저 지운다** (2026-08-26 순서 바로잡음).
 *
 * 전에는 DB에서 행을 지운 뒤 쿠키를 지웠다. DB가 끊긴 상태에서 로그아웃을
 * 누르면 첫 줄에서 던지고 **쿠키가 그대로 남는다** — 로그아웃을 눌렀는데
 * 여전히 로그인 상태다. 그게 가장 나쁜 실패다.
 *
 * 쿠키가 없어지면 그 브라우저는 이미 로그아웃된 것이다. DB에 남은 행은
 * 만료되면 다음 로그인 때 치워진다.
 */
export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (id) await prisma.authSession.deleteMany({ where: { id } });
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
