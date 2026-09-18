import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7은 접속을 드라이버 어댑터로 한다.
 * URL은 .env 에만 있고 schema.prisma 에는 없다 (prisma.config.ts 참고).
 *
 * 개발 중 핫리로드로 커넥션이 계속 늘어나는 것을 막기 위해 전역에 하나만 둔다.
 */

/**
 * 서버리스(Vercel) + 잠드는 DB(Neon) 조합에서 나던 두 증상을 막는 설정이다
 * (2026-09-18. 사용자가 밖에서 열어 보다가 발견).
 *
 *   ① DB 오류가 뜨고, 새로고침하면 된다
 *   ② 오류는 안 뜨는데 다음 화면으로 안 넘어가고 멈춘다
 *
 * ## 왜 이런 일이 생기나
 *
 * Vercel 은 요청이 끝나면 컨테이너를 **얼린다.** 프로세스를 죽이는 게 아니라
 * 멈춰 세우는 것이라, 안에 있던 커넥션 풀이 그대로 살아 있는 것처럼 남는다.
 * 그런데 **타이머가 같이 얼어서 안 돈다.** `idleTimeoutMillis` 로 「10초 놀면
 * 닫는다」고 해둬도 그 10초가 흐르지 않는다.
 *
 * 그 사이 Neon 무료 요금제는 **5분만 안 쓰면 잠들고 커넥션을 끊는다.** 다음
 * 요청이 오면 컨테이너가 녹으면서 풀에 남아 있던 **이미 끊긴 커넥션**을 꺼내
 * 쓴다 → ①. 새로고침하면 풀이 그것을 버리고 새로 열기 때문에 된다.
 *
 * ②는 기본값에 **`connectionTimeoutMillis` 가 없어서** 생긴다. 없으면 무한정
 * 기다린다. Neon 이 깨는 데 오래 걸리면 요청이 매달린 채로 있다가 Vercel 쪽
 * 시간 제한에 걸려 끊긴다. 서버가 오류를 돌려준 게 아니라 **응답 자체가 없는**
 * 것이라, 화면에서는 버튼만 멈추고 아무 문장도 안 뜬다.
 *
 * ## 값을 이렇게 잡은 이유
 *
 * `max` — 컨테이너 하나가 동시에 처리하는 요청은 많지 않다. 10 개를 열어 두면
 * 얼었다 녹을 때 **죽은 커넥션이 그만큼 쌓인다.** 적게 잡을수록 ①이 줄어든다.
 *
 * `connectionTimeoutMillis` — 무한 대기를 없애는 것이 핵심이다. 8초 안에 못
 * 붙으면 포기하고 오류를 던진다. 그러면 위쪽 `try` 가 잡아 **사람에게 보이는
 * 문장**으로 바꾼다 (`lib/survey/actions.ts` 의 `guarded`). 멈춘 화면보다
 * 「잠시 후 다시 눌러 주세요」가 낫다.
 *
 * `idleTimeoutMillis` — 얼지 않은 동안에는 빨리 닫아 죽은 커넥션이 될 틈을
 * 줄인다. 얼어 있는 동안 안 도는 것은 위에 적은 대로다.
 *
 * `allowExitOnIdle` — 풀이 비면 프로세스가 끝날 수 있게 한다. 남은 커넥션
 * 하나 때문에 컨테이너가 안 죽는 일을 막는다.
 *
 * ⚠️ **사내 서버로 옮기면 이 값들은 굳이 필요 없다.** 컨테이너가 얼지도 않고
 * DB 가 잠들지도 않는다. 그래도 해롭지 않으니 그대로 둔다 — `max` 만 사람
 * 수에 맞춰 올리면 된다.
 */
const POOL = {
  max: 3,
  connectionTimeoutMillis: 8_000,
  idleTimeoutMillis: 5_000,
  allowExitOnIdle: true,
} as const;

const makeClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      ...POOL,
    }),
  });

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof makeClient>;
};

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
