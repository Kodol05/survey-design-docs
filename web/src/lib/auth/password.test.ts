import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN,
  PasswordError,
  assertPasswordOk,
  hashPassword,
  verifyPassword,
} from "./password";

describe("비밀번호 규칙", () => {
  it(`${PASSWORD_MIN}자 미만은 막는다`, () => {
    expect(() => assertPasswordOk("a".repeat(PASSWORD_MIN - 1))).toThrow(PasswordError);
    expect(() => assertPasswordOk("")).toThrow(PasswordError);
  });

  it(`${PASSWORD_MIN}자부터 받는다`, () => {
    expect(() => assertPasswordOk("a".repeat(PASSWORD_MIN))).not.toThrow();
  });
});

describe("해시", () => {
  it("평문을 그대로 두지 않는다", async () => {
    /*
      이게 깨지면 DB에 평문이 저장된다는 뜻이다. D-05의 핵심 약속이다.
    */
    const pw = "correct horse battery";
    const hash = await hashPassword(pw);
    expect(hash).not.toContain(pw);
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("같은 비밀번호라도 매번 다른 해시가 나온다", async () => {
    // 소금(salt)이 붙기 때문이다. 같으면 무지개표 공격에 그대로 노출된다
    const a = await hashPassword("same-password-1234");
    const b = await hashPassword("same-password-1234");
    expect(a).not.toBe(b);
  });

  it("맞는 비밀번호만 통과한다", async () => {
    const hash = await hashPassword("my-secret-1234");
    expect(await verifyPassword("my-secret-1234", hash)).toBe(true);
    expect(await verifyPassword("my-secret-1235", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });
});
