import { describe, expect, it } from "vitest";
import { SIGNUP_CAP, SIGNUP_FULL_MESSAGE, signupFull } from "./signupCap";

/*
  임시 가입 상한 (2026-08-26). 자세한 사연은 `signupCap.ts` 머리말에 있다.
  요점만 — 자율 등록은 **사내망 안**을 전제로 한 결정인데, 밖에 열어 두고
  시험하는 동안에는 그 전제가 깨진다.
*/

describe("가입 상한", () => {
  it("상한 아래면 통과", () => {
    expect(signupFull(0)).toBe(false);
    expect(signupFull(44)).toBe(false);
  });

  it("상한에 닿으면 막는다 — 넘어서가 아니라 닿는 순간", () => {
    expect(SIGNUP_CAP).not.toBeNull();
    expect(signupFull(SIGNUP_CAP! - 1)).toBe(false);
    expect(signupFull(SIGNUP_CAP!)).toBe(true);
    expect(signupFull(SIGNUP_CAP! + 1)).toBe(true);
  });

  it("회사 규모(50명 안팎)보다 넉넉하다 — 시험 중에 진짜 직원이 막히면 안 된다", () => {
    expect(SIGNUP_CAP!).toBeGreaterThan(100);
  });
});

describe("막혔을 때 하는 말", () => {
  it("몇 명인지 말하지 않는다 — 밖에서 회사 규모를 세는 실마리가 된다", () => {
    expect(SIGNUP_FULL_MESSAGE).not.toMatch(/\d/);
  });

  it("왜 막혔는지도 말하지 않는다", () => {
    expect(SIGNUP_FULL_MESSAGE).not.toMatch(/상한|가득|초과|정원/);
  });
});
