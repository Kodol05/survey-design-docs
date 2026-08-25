import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  화면마다 **자기 자물쇠를 건다** (2026-08-26 사고).

  ## 무슨 일이 있었나

  관리자 화면 여덟 곳 중 대시보드 하나만 `requireAdmin()`을 부르지 않고
  레이아웃에 맡기고 있었다. App Router는 **레이아웃과 화면을 동시에 그린다** —
  레이아웃이 로그인 화면으로 보내기로 정하는 동안 화면은 이미 DB를 읽고
  결과를 흘려보낸다. 브라우저는 로그인 화면으로 넘어가지만 데이터는 이미
  나간 뒤다.

  `curl http://…/admin` 한 번에 59KB가 나왔고 그 안에 사람 이름과 사원 ID가
  들어 있었다. 고친 뒤에는 8KB에 로그인으로 가라는 말만 남는다.

  ## 왜 눈으로는 못 잡나

  브라우저로 열면 **로그인 화면이 뜬다.** 막힌 것처럼 보인다. 화면을 아무리
  들여다봐도 안 보이고, 타입 검사도 통과한다. 응답 원문을 봐야 안다.

  그래서 사람이 기억하는 대신 **파일을 세는 것으로** 막아 둔다.
*/

/**
 * ⚠️ **주석을 걷어내고 센다.**
 *
 * 처음에는 파일 원문에서 `requireAdmin()`을 찾았다. 그런데 이 사고를 설명하는
 * 주석에도 그 글자가 들어 있어서, **자물쇠를 지워도 검사가 통과했다** —
 * 실제로 주석 처리해 보고 나서야 알았다. 늘 통과하는 검사는 없는 것만 못하다.
 */
function codeOf(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ");
}

/** 레이아웃은 뺀다 — 레이아웃만으로는 못 막는다는 것이 이 검사의 요점이다 */
function screensIn(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === "page.tsx" || e.name === "route.ts")
        out.push(full.replace(/\\/g, "/"));
    }
  };
  walk(path.join("src/app", dir));
  return out.sort();
}

describe("관리자 화면은 저마다 requireAdmin 을 부른다", () => {
  const files = screensIn("admin/(guarded)");

  it("여덟 곳을 다 찾았다 — 경로가 바뀌어 빈손이 되면 이 검사는 헛돈다", () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  for (const f of files) {
    it(f, () => {
      expect(codeOf(f)).toMatch(/requireAdmin\(\)/);
    });
  }
});

describe("로그인이 필요한 사원 화면도 마찬가지", () => {
  const files = screensIn("(app)");

  it("찾은 화면이 있다", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const f of files) {
    it(f, () => {
      expect(codeOf(f)).toMatch(/require(User|Admin)\(\)/);
    });
  }
});
