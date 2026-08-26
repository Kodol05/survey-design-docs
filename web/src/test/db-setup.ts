import { beforeAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

/**
 * DB 테스트가 돌기 전에 거는 안전장치와 청소.
 *
 * ## ⚠️ 왜 이렇게까지 확인하나
 *
 * 아래 `wipe()`는 **표를 통째로 비운다.** 그게 진짜 DB를 향하면
 * **사람 47명과 응답 4,560건이 한 번에 사라진다.** 백업이 있어도 그날 것은
 * 잃는다.
 *
 * 실제 개발에서 가장 흔하게 나는 사고가 이것이다 — 환경변수 하나가 잘못
 * 읽혀서, 또는 `.env.test`를 안 만든 채로 돌려서. 그래서 **접속하기 전에**
 * 주소를 뜯어보고 조금이라도 이상하면 아예 멈춘다.
 *
 * 세 가지를 다 만족해야 지나간다.
 *
 *   ① 포트가 5433 (진짜는 5432)
 *   ② DB 이름이 `survey_test`
 *   ③ 주소에 `localhost` 또는 `127.0.0.1` — 남의 서버를 비우지 않게
 */

const EXPECT = { port: "5433", database: "survey_test" };

function assertTestDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw)
    throw new Error(
      "DATABASE_URL 이 없습니다. `.env.test` 를 만드셨는지 확인해 주세요.",
    );

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL 을 읽을 수 없습니다.");
  }

  const database = url.pathname.replace(/^\//, "");
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  const ok = url.port === EXPECT.port && database === EXPECT.database && local;

  if (!ok)
    throw new Error(
      [
        "",
        "  ✖ 시험용 DB 가 아닙니다. 표를 비우는 테스트라 여기서 멈춥니다.",
        "",
        `      지금  ${url.hostname}:${url.port}/${database}`,
        `      필요  localhost:${EXPECT.port}/${EXPECT.database}`,
        "",
        "    `npm run db:test:up` 으로 시험용 DB 를 띄우고,",
        "    `.env.test` 가 5433 을 가리키는지 확인해 주세요.",
        "",
      ].join("\n"),
    );
}

/**
 * 표를 비운다 — **매번 0에서 시작한다.**
 *
 * 「한 묶음을 저장하면 17개가 남는다」를 확인하려면 시작할 때 0이어야 한다.
 * 앞 테스트가 남긴 것이 섞이면 세는 숫자가 흔들린다.
 *
 * `TRUNCATE ... CASCADE` 한 번으로 연결된 표까지 같이 비운다. 지우는 순서를
 * 손으로 맞추지 않아도 되고, `DELETE` 보다 빠르다.
 */
async function wipe() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Response", "Result", "QualityFlag", "TestSession",
      "ManagerRating", "AuthSession", "Employee",
      "Item", "Assessment", "Roster", "LoginAttempt"
    RESTART IDENTITY CASCADE
  `);
}

beforeAll(assertTestDatabase);
beforeEach(wipe);
