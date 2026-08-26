import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  /*
    DB 없이 도는 테스트만 여기서 돈다 — 2초에 끝난다.

    ⚠️ `*.db.test.ts`는 **빼야 한다.** 안 빼면 여기서도 집어가서, DB 주소도
    없고 `server-only` 를 비켜 가는 설정도 없는 채로 열려다 터진다
    (2026-08-26 실제로 그랬다). 그쪽은 `vitest.db.config.mts` 가 맡는다.
  */
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "src/**/*.db.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
