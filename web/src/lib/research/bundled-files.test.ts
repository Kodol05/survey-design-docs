import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
  ⚠️ **실행 중에 읽는 파일은 배포 꾸러미에 같이 들어가야 한다** (2026-08-27).

  Next 는 `import` 로 이어진 것만 따라가며 챙긴다. 문자열 경로로만 읽는
  파일은 **조용히 빠진다** — 빌드도 통과하고 타입 검사도 통과하고, 지금처럼
  프로젝트 폴더에서 켜면 파일이 그 자리에 있어서 멀쩡히 돈다.

  실제로 이 프로젝트가 그 상태였다. 구성원 상세 화면이 필요로 하는 194개
  파일을 챙기면서 `research-correlations.yaml` 은 빼고 있었다. `standalone`
  으로 이미지를 줄이거나 서버리스에 올리는 순간 세 화면이 ENOENT 로 죽는다.

  그래서 **읽는 쪽과 챙기는 쪽이 어긋나면 여기서 걸리게** 해 둔다.
  실행 중에 새 파일을 읽게 되면 `next.config.ts` 에도 넣어야 한다.
*/

const config = readFileSync("next.config.ts", "utf8");

/** 실행 중에 읽는 파일 — 늘어나면 여기에 같이 적는다 */
const RUNTIME_FILES = ["data/research-correlations.yaml"];

describe("실행 중에 읽는 파일", () => {
  it.each(RUNTIME_FILES)("%s — 파일이 실제로 있다", (file) => {
    expect(existsSync(file)).toBe(true);
  });

  it.each(RUNTIME_FILES)("%s — next.config 이 꾸러미에 챙긴다", (file) => {
    expect(config).toContain(file);
  });

  it("outputFileTracingIncludes 설정 자체가 살아 있다", () => {
    expect(config).toContain("outputFileTracingIncludes");
  });
});

describe("문항 파일은 실행 중에 안 읽는다", () => {
  /*
    `loadItemFile` 은 seed 스크립트와 테스트만 쓴다. 화면에서 부르기
    시작하면 이 파일도 꾸러미에 챙겨야 하므로 그때 여기가 빨개진다.
  */
  it("화면 코드에서 loadItemFile 을 부르지 않는다", () => {
    const hits = readdirSync("src/app", { recursive: true, encoding: "utf8" })
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => join("src/app", f))
      .filter((f) => readFileSync(f, "utf8").includes("loadItemFile"));
    expect(hits).toEqual([]);
  });
});
