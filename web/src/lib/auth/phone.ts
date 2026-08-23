/**
 * 휴대폰번호 정규화 — 로그인 아이디이므로 표기가 흔들리면 안 된다.
 *
 * `010-1234-5678` / `01012345678` / `+82 10 1234 5678` 이 전부 같은 사람이다.
 * **로그인·회원가입 두 진입점 모두** 이 함수를 통과해야 한다.
 * 하나라도 빠지면 한 사람이 계정 두 개가 된다 (00 §1).
 */
export class PhoneError extends Error {}

export function normalizePhone(input: string): string {
  let d = (input ?? "").replace(/[^\d+]/g, "");
  // +82 10 ... → 010 ...
  if (d.startsWith("+82")) d = "0" + d.slice(3);
  else if (d.startsWith("82") && d.length > 10) d = "0" + d.slice(2);
  d = d.replace(/\D/g, "");

  if (!/^01[016789]\d{7,8}$/.test(d))
    throw new PhoneError("휴대폰번호 형식이 아닙니다. 010으로 시작하는 번호를 입력해 주세요");
  return d;
}

/** 화면에 보여줄 때만 쓴다. 저장은 항상 정규화된 값으로 한다. */
export function formatPhone(normalized: string): string {
  if (normalized.length === 11)
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}
