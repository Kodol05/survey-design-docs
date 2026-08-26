import { config } from "dotenv";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/*
  DB를 실제로 다루는 테스트만 여기서 돈다 (`npm run test:db`).

  ## 왜 설정을 나누나

  나머지 252개는 **DB 없이 2초**에 끝난다. 순수 계산만 확인하기 때문이다.
  거기에 DB 테스트를 섞으면 느려지고, DB가 안 떠 있으면 전부 빨개진다.
  고치는 중에 매번 돌리는 것과, 가끔 돌려 확인하는 것은 성격이 다르다.

  ## ⚠️ 진짜 DB를 절대 보지 않는다

  `.env.test`가 5433(시험용)을 가리키고, 아래에서 그것만 읽는다.
  `.env`(5432, 진짜)는 읽지 않는다.

  그래도 실수로 진짜를 가리킬 수 있으므로 `setup.ts`가 **접속하기 전에 한 번 더
  확인한다** — 5433이 아니거나 DB 이름이 `survey_test`가 아니면 아예 멈춘다.
  이 테스트들은 표를 통째로 비우기 때문에, 한 번의 실수가 응답 4,560건을
  지운다.
*/

config({ path: ".env.test", override: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    setupFiles: ["src/test/db-setup.ts"],
    // 표를 비우고 시작하므로 동시에 돌면 서로를 지운다. 한 줄로 세운다
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      /*
        ⚠️ `server-only`는 「이 파일은 브라우저로 가면 안 된다」는 **표시**다.
        불러오기만 하면 던지도록 만들어져 있어서, 테스트에서 그대로 두면
        파일을 열지도 못한다.

        테스트는 애초에 서버에서만 돈다. 표시를 빈 파일로 바꿔 끼운다 —
        **앱이 쓰는 것은 그대로**이고 테스트에서만 비켜 간다.
      */
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
