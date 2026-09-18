import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7은 접속을 드라이버 어댑터로 한다.
 * URL은 .env 에만 있고 schema.prisma 에는 없다 (prisma.config.ts 참고).
 *
 * 개발 중 핫리로드로 커넥션이 계속 늘어나는 것을 막기 위해 전역에 하나만 둔다.
 */

/**
 * ## 두 가지 드라이버를 주소 보고 고른다 (2026-09-18)
 *
 * 밖에서 열어 보다가 **가끔 서버가 끊기는** 증상이 있었다. DB 오류가 뜨고
 * 새로고침하면 되는 것, 그리고 오류 없이 멈추는 것. 원인은 하나다 —
 *
 * Vercel 은 요청이 끝나면 컨테이너를 **얼린다.** 그 사이 Neon 무료 요금제는
 * 5분이면 잠들며 TCP 커넥션을 끊는다. 다음 요청 때 컨테이너가 깨면서 풀에
 * 남아 있던 **죽은 커넥션**을 꺼내 쓰면 503 이 난다. `pg` 풀은 커넥션을
 * 꺼낼 때 살아있는지 검사하지 않기 때문에 첫 요청이 실패한다.
 *
 * 그래서 **Neon 에는 HTTP 드라이버**를 쓴다. 매 질의가 새 HTTP 요청이라
 * 오래 사는 소켓이 아예 없다 — 얼든 잠들든 상관이 없다. Vercel + Neon 조합의
 * 정석이다.
 *
 * 로컬 개발과 테스트는 Neon 이 아니라 **도커 PostgreSQL**(localhost)이다.
 * HTTP 드라이버는 Neon 전용이라 여기선 못 쓴다. 그래서 주소에 `neon.tech`
 * 가 있으면 HTTP, 아니면 기존 `pg` 로 간다.
 *
 * ⚠️ HTTP 드라이버는 **트랜잭션을 아예 지원하지 않는다**(배열 형·콜백 형 모두).
 * 그래서 `$transaction` 은 쓰지 않는다 — 대신 쓰기 순서를 안전하게 잡고
 * 각 쓰기를 idempotent upsert 로 둔다(`survey/actions.ts`·`survey/session.ts`
 * 참고). `$transaction` 을 새로 쓰려면 이 드라이버 선택을 다시 봐야 한다.
 *
 * ## 로컬 pg 풀 설정
 *
 * 사내 서버(도커)로 옮기면 컨테이너가 얼지도 DB 가 잠들지도 않아 아래 값은
 * 굳이 필요 없지만 해롭지도 않다. `max` 만 사람 수에 맞춰 올리면 된다.
 */
const url = process.env.DATABASE_URL ?? "";
const isNeon = url.includes("neon.tech");

const makeAdapter = () =>
  isNeon
    ? new PrismaNeonHttp(url, {})
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
