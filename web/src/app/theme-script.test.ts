import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
  밝기 규칙 (2026-08-26 사용자 결정).

    관리자 화면        기본 어둡게 · 바꾸면 그대로 유지
    그 밖의 화면       기본 밝게  · 바꾸면 그대로 유지

  **기본값은 저장된 것이 없을 때만 쓴다.** 한 번 고르면 그 선택이 이긴다.
  두 영역은 열쇠가 달라 서로 간섭하지 않는다.

  ## 왜 파일에서 꺼내 돌려 보는가

  이 규칙은 `<head>`에 문자열로 심기는 스크립트 안에 있다. 그림이 그려지기
  전에 돌아야 화면이 번쩍이지 않기 때문이다. 문자열이라 **타입 검사도 lint도
  들여다보지 못한다** — 실제로 여기서 두 번 어긋났다.

    ① 관리자를 벗어날 때 관리자 쪽 선택을 지웠다
    ② 첫 화면에 들르면 사원 쪽 선택을 지웠다 — 로그인한 사람은 그 화면을
       보지도 못하고 지나가는데도 지워졌다

  그래서 **진짜 스크립트를 파일에서 꺼내** 가짜 저장소를 물려 돌려 본다.
*/

const SCRIPT = (() => {
  const src = readFileSync("src/app/layout.tsx", "utf8");
  const m = src.match(/const THEME_SCRIPT = `([\s\S]*?)`;/);
  if (!m) throw new Error("layout.tsx 에서 THEME_SCRIPT 를 못 찾았다");
  return m[1];
})();

type Store = Record<string, string>;

function run(pathname: string, saved: Store = {}) {
  const store: Store = { ...saved };
  const localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
  const documentElement = { dataset: {} as { theme?: string } };
  new Function("location", "localStorage", "document", SCRIPT)(
    { pathname },
    localStorage,
    { documentElement },
  );
  return { theme: documentElement.dataset.theme, store };
}

const ADMIN = "survey-theme:admin";
const APP = "survey-theme:app";

describe("저장된 것이 없으면 영역별 기본값", () => {
  it("관리자는 어둡게 — 숫자와 그래프를 오래 보는 자리다", () => {
    expect(run("/admin").theme).toBe("dark");
    expect(run("/admin/stats").theme).toBe("dark");
  });

  it("그 밖은 밝게", () => {
    for (const p of ["/", "/me", "/survey", "/login", "/signup"])
      expect(run(p).theme).toBe("light");
  });

  it("관리자 로그인 화면은 아직 관리자 화면이다", () => {
    expect(run("/admin/login").theme).toBe("dark");
  });
});

describe("한 번 고르면 그 선택이 기본값을 이긴다", () => {
  it("관리자를 밝게 해 두면 밝게 열린다", () => {
    expect(run("/admin", { [ADMIN]: "light" }).theme).toBe("light");
  });

  it("사원 화면을 어둡게 해 두면 어둡게 열린다", () => {
    expect(run("/survey", { [APP]: "dark" }).theme).toBe("dark");
  });
});

describe("두 영역은 서로 간섭하지 않는다", () => {
  const both = { [ADMIN]: "light", [APP]: "dark" };

  it("영역마다 자기 선택을 쓴다", () => {
    expect(run("/admin", both).theme).toBe("light");
    expect(run("/me", both).theme).toBe("dark");
  });

  it("⚠️ 관리자를 벗어나도 관리자 쪽 선택을 지우지 않는다", () => {
    expect(run("/me", both).store[ADMIN]).toBe("light");
  });

  it("⚠️ 첫 화면에 들러도 사원 쪽 선택을 지우지 않는다", () => {
    // 로그인한 사람은 이 화면을 보지도 못하고 지나간다
    expect(run("/", both).store[APP]).toBe("dark");
    expect(run("/", both).theme).toBe("dark");
  });
});

describe("영역을 나누기 전에 쓰던 열쇠", () => {
  it("남아 있으면 치운다", () => {
    expect(run("/me", { "survey-theme": "dark" }).store).not.toHaveProperty(
      "survey-theme",
    );
  });

  it("치우면서 지금 값을 건드리지 않는다", () => {
    const r = run("/me", { "survey-theme": "dark", [APP]: "light" });
    expect(r.theme).toBe("light");
    expect(r.store[APP]).toBe("light");
  });
});

describe("저장소를 못 쓰는 곳에서도 죽지 않는다", () => {
  it("사생활 보호 모드처럼 접근이 막히면 기본값으로 간다", () => {
    const documentElement = { dataset: {} as { theme?: string } };
    const blocked = {
      getItem() {
        throw new Error("접근 거부");
      },
      setItem() {
        throw new Error("접근 거부");
      },
      removeItem() {
        throw new Error("접근 거부");
      },
    };
    expect(() =>
      new Function("location", "localStorage", "document", SCRIPT)(
        { pathname: "/admin" },
        blocked,
        { documentElement },
      ),
    ).not.toThrow();
    expect(documentElement.dataset.theme).toBe("dark");
  });
});
