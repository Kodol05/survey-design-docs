import bcrypt from "bcryptjs";

/** 비밀번호 — 평문은 어디에도 저장하지 않는다 (00 D-05) */

export const PASSWORD_MIN = 8;

export class PasswordError extends Error {}

export function assertPasswordOk(pw: string) {
  if (!pw || pw.length < PASSWORD_MIN)
    throw new PasswordError(`비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다`);
  if (pw.length > 200) throw new PasswordError("비밀번호가 너무 깁니다");
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
