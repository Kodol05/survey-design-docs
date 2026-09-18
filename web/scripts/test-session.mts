/**
 * 테스트용 세션 발급 — 로그인 화면을 거치지 않고 관리자(또는 특정 사원)로
 * 접속하기 위한 것이다. 브라우저 자동화로 화면을 점검할 때 쓴다.
 *
 * ⚠️ **이 우회로는 코드가 아니라 여기 스크립트에만 있다.** 공개된 앱에는
 * 어떤 흔적도 남기지 않는다 — 심으면 그게 곧 아무나 관리자가 되는 문이 된다.
 * 대신 정상 로그인이 만드는 것과 똑같은 AuthSession 을 DB 에 직접 만들고,
 * 그 id 를 찍어 준다. 그 값을 survey_session 쿠키에 넣으면 로그인한 상태가
 * 된다. 세션은 만들 때 정한 시간이 지나면 저절로 사라진다.
 *
 *   사용:  npx tsx scripts/test-session.mts [admin|<phone>] [유효시간(분)]
 *   기본:  admin · 60분
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const who = process.argv[2] ?? "admin";
const minutes = Number(process.argv[3] ?? 60);

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL 이 없습니다");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const emp =
  who === "admin"
    ? await prisma.employee.findFirst({ where: { role: "ADMIN" } })
    : await prisma.employee.findFirst({ where: { phone: who.replace(/\D/g, "") } });

if (!emp) {
  console.error(`대상을 못 찾음: ${who}`);
  process.exit(1);
}

const s = await prisma.authSession.create({
  data: { employeeId: emp.id, expiresAt: new Date(Date.now() + minutes * 60_000) },
});

console.log(JSON.stringify({
  who: `${emp.name} (${emp.role})`,
  cookieName: "survey_session",
  cookieValue: s.id,
  expiresInMin: minutes,
}));

await prisma.$disconnect();
