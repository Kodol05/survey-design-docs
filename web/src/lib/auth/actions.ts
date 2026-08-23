"use server";

import { redirect } from "next/navigation";
import { prisma } from "../db";
import { assertPasswordOk, hashPassword, verifyPassword } from "./password";
import { normalizePhone } from "./phone";
import { LIMIT, assertNotLocked, clearFailures, recordFailure } from "./rateLimit";
import { createSession, destroySession } from "./session";

export type FormState = { error?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/**
 * 회원가입 — 이름 · 휴대폰번호(아이디) · 비밀번호 (D-05).
 * 사전 명단 대조는 하지 않는다. 자율 등록이다 (D-25).
 */
export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const name = str(form, "name");
  let phone: string;

  if (!name) return { error: "이름을 입력해 주세요" };
  try {
    phone = normalizePhone(str(form, "phone"));
    assertPasswordOk(str(form, "password"));
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (str(form, "password") !== str(form, "passwordConfirm"))
    return { error: "비밀번호가 서로 다릅니다" };

  const existing = await prisma.employee.findUnique({ where: { phone } });
  if (existing) {
    // 이미 가입됐다는 사실을 알려주지 않는다 — 누가 응시했는지가 새어나간다
    return { error: "이 번호로는 가입할 수 없습니다. 이미 계정이 있다면 로그인해 주세요" };
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      phone,
      passwordHash: await hashPassword(str(form, "password")),
      passwordChangedAt: new Date(),
    },
  });

  await createSession(employee.id);
  redirect("/survey");
}

/** 사원 로그인 — 휴대폰번호 + 비밀번호 */
export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  let phone: string;
  try {
    phone = normalizePhone(str(form, "phone"));
  } catch {
    // 형식 오류도 "맞지 않습니다"로 묶는다. 어느 번호가 가입돼 있는지 알려주지 않는다
    return { error: "번호나 비밀번호가 맞지 않습니다" };
  }

  try {
    await assertNotLocked(phone);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const employee = await prisma.employee.findUnique({ where: { phone } });
  const ok =
    employee && (await verifyPassword(str(form, "password"), employee.passwordHash));

  if (!employee || !ok) {
    await recordFailure(phone, LIMIT.user);
    return { error: "번호나 비밀번호가 맞지 않습니다" };
  }

  await clearFailures(phone);
  await createSession(employee.id);
  redirect("/survey");
}

/** 관리자 로그인 — 아이디 + 비밀번호. 계정은 seed로만 만들어진다 (D-05) */
export async function adminLogin(_prev: FormState, form: FormData): Promise<FormState> {
  const loginId = str(form, "loginId");
  if (!loginId) return { error: "아이디를 입력해 주세요" };

  try {
    await assertNotLocked(loginId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = await prisma.employee.findUnique({ where: { loginId } });
  const ok =
    admin?.role === "ADMIN" &&
    (await verifyPassword(str(form, "password"), admin.passwordHash));

  if (!ok) {
    await recordFailure(loginId, LIMIT.admin);
    return { error: "아이디나 비밀번호가 맞지 않습니다" };
  }

  await clearFailures(loginId);
  await createSession(admin.id);
  // 초기 비밀번호 상태면 바꾸기 전에는 다른 화면으로 못 간다
  redirect(admin.passwordChangedAt ? "/admin" : "/admin/password");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** 본인 비밀번호 변경. 관리자 초기 비밀번호 변경 강제에도 쓴다 */
export async function changePassword(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { currentUser } = await import("./session");
  const me = await currentUser();
  if (!me) redirect("/login");

  const next = str(form, "password");
  try {
    assertPasswordOk(next);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (next !== str(form, "passwordConfirm"))
    return { error: "비밀번호가 서로 다릅니다" };

  // 초기 비밀번호 상태(passwordChangedAt이 null)에서는 현재 비밀번호를 묻지 않는다
  if (me.passwordChangedAt) {
    const ok = await verifyPassword(str(form, "currentPassword"), me.passwordHash);
    if (!ok) return { error: "현재 비밀번호가 맞지 않습니다" };
  }

  await prisma.employee.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
  });

  redirect(me.role === "ADMIN" ? "/admin" : "/me");
}
