import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7은 접속을 드라이버 어댑터로 한다.
 * URL은 .env 에만 있고 schema.prisma 에는 없다 (prisma.config.ts 참고).
 *
 * 개발 중 핫리로드로 커넥션이 계속 늘어나는 것을 막기 위해 전역에 하나만 둔다.
 */

/**
 * ## 드라이버를 주소 보고 고른다 (2026-09-18)
 *
 * 밖에서 열어 보다가 **가끔 서버가 끊기는** 증상이 있었다. 원인 —
 * Vercel 은 요청이 끝나면 컨테이너를 얼리고, Neon 무료 요금제는 5분이면
 * 잠들며 TCP 커넥션을 끊는다. 다음 요청 때 `pg` 풀이 **죽은 커넥션**을 꺼내
 * 쓰면 503 이 난다.
 *
 * 처음엔 Neon 을 **HTTP 드라이버**로 붙였다. 매 질의가 새 HTTP 요청이라
 * 죽은 소켓이 없어 503 은 사라졌는데, **트랜잭션을 아예 못 한다.** Prisma 는
 * `upsert`·`updateMany`·`deleteMany` 같은 것을 내부적으로 트랜잭션으로 돌려서,
 * 회원가입 뒤 첫 응시 화면부터 「Transactions are not supported in HTTP mode」로
 * 깨졌다. 이 앱은 트랜잭션이 꼭 필요하다.
 *
 * 그래서 **Neon 에는 WebSocket 드라이버(`PrismaNeon`)**를 쓴다 — 트랜잭션을
 * 지원한다. 대신 `poolQueryViaFetch` 를 켜서 **단발 질의는 stateless HTTP** 로
 * 나가게 한다: 얼었다 깬 커넥션 때문에 503 나던 그 경로를 그대로 막으면서,
 * 트랜잭션이 필요할 때만 WebSocket 을 연다. Vercel + Neon + Prisma(트랜잭션)
 * 조합의 정석이다.
 *
 * 로컬 개발과 테스트는 Neon 이 아니라 **도커 PostgreSQL**(localhost)이라
 * 기존 `pg` 로 간다. 주소에 `neon.tech` 가 있으면 Neon, 아니면 pg.
 *
 * ## 로컬 pg 풀 설정
 *
 * 사내 서버(도커)로 옮기면 컨테이너가 얼지도 DB 가 잠들지도 않아 아래 값은
 * 굳이 필요 없지만 해롭지도 않다. `max` 만 사람 수에 맞춰 올리면 된다.
 */
const url = process.env.DATABASE_URL ?? "";
const isNeon = url.includes("neon.tech");

if (isNeon) {
  // 단발 질의는 HTTP fetch 로 (죽은 소켓 없음). 트랜잭션만 WebSocket 을 연다.
  neonConfig.poolQueryViaFetch = true;
  // Node 22+ 는 전역 WebSocket 이 있다. 드라이버가 이걸 쓰게 넘겨준다.
  const g = globalThis as { WebSocket?: unknown };
  if (g.WebSocket) neonConfig.webSocketConstructor = g.WebSocket as never;
}

const makeAdapter = () =>
  isNeon
    ? new PrismaNeon({ connectionString: url })
    : new PrismaPg({
        connectionString: url,
        max: 3,
        connectionTimeoutMillis: 8_000,
        idleTimeoutMillis: 5_000,
        allowExitOnIdle: true,
      });

const makeClient = () => new PrismaClient({ adapter: makeAdapter() });

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof makeClient>;
};

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
