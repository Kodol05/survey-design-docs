import { describe, expect, it } from "vitest";
import { PhoneError, formatPhone, normalizePhone } from "./phone";

describe("휴대폰번호 정규화", () => {
  it("표기가 달라도 같은 값이 된다 — 계정이 둘로 갈라지지 않게", () => {
    const forms = ["010-1234-5678", "01012345678", "010 1234 5678", "+82 10 1234 5678", "+821012345678"];
    for (const f of forms) expect(normalizePhone(f)).toBe("01012345678");
  });

  it("공백과 괄호를 지운다", () => {
    expect(normalizePhone(" (010) 1234-5678 ")).toBe("01012345678");
  });

  it("휴대폰이 아니면 던진다", () => {
    for (const bad of ["02-123-4567", "0212345678", "1234", "", "abc", "020-1234-5678"])
      expect(() => normalizePhone(bad)).toThrow(PhoneError);
  });

  it("011 등 구형 번호도 받는다", () => {
    expect(normalizePhone("011-234-5678")).toBe("0112345678");
  });

  it("보여줄 때만 하이픈을 붙인다", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
    expect(formatPhone("0112345678")).toBe("011-234-5678");
  });
});
