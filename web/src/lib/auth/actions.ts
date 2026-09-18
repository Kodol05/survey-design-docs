"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "../db";
import { assertPasswordOk, hashPassword, verifyPassword } from "./password";
import { SIGNUP_FULL_MESSAGE, signupFull } from "./signupCap";
import { normalizePhone } from "./phone";
import {
  LIMIT,
  assertNotLocked,
  clearFailures,
  recordFailure,
} from "./rateLimit";
import { createSession, destroySession } from "./session";

export type FormState = { error?: string } | undefined;

/**
 * 인증 화면에서 나는 예상 못 한 오류를 사용자에게 그대로 보여주지 않는다.
 *
 * DB가 꺼져 있거나 연결이 끊기면 Prisma가 던지는 오류에는 **파일 경로와
 * 내부 구조가 그대로 들어 있다.** 그게 로그인 화면에 찍히면 보기 흉할 뿐
 * 아니라 서버 구조를 알려주는 셈이 된다.
 *
 * `redirect()`는 내부적으로 예외를 던지므로 반드시 다시 던져야 한다.
 * 안 그러면 로그인에 성공하고도 화면이 안 넘어간다.
 */
async function guarded(run: () => Promise<FormState>): Promise<FormState> {
  try {
    return await run();
  } catch (e) {
    unstable_rethrow(e);
    console.error("[auth]", e);
    return { error: "지금 처리할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/**
 * 회원가입 — 이름 · 휴대폰번호(아이디) · 비밀번호 (D-05).
 * 사전 명단 대조는 하지 않는다. 자율 등록이다 (D-25).
 */
export async function signup(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  return guarded(async () => {
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

    // ⚠️ 밖에 열어 두고 시험하는 동안만 쓰는 임시 상한. `signupCap.ts` 참고
    const members = await prisma.employee.count({ where: { role: "USER" } });
    if (signupFull(members)) return { error: SIGNUP_FULL_MESSAGE };

    const existing = await prisma.employee.findUnique({ where: { phone } });
    if (existing) {
      // 이미 가입됐다는 사실을 알려주지 않는다 — 누가 응시했는지가 새어나간다
      return {
        error:
          "이 번호로는 가입할 수 없습니다. 이미 계정이 있다면 로그인해 주세요",
      };
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
  });
}

/** 사원 로그인 — 휴대폰번호 + 비밀번호 */
export async function login(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  return guarded(async () => {
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
      employee &&
      (await verifyPassword(str(form, "password"), employee.passwordHash));

    if (!employee || !ok) {
      await recordFailure(phone, LIMIT.user);
      return { error: "번호나 비밀번호가 맞지 않습니다" };
    }

    await clearFailures(phone);
    await createSession(employee.id);

    /*
      **어디로 보낼지는 그 사람이 어디까지 했느냐로 정한다** (2026-09-18 사용자 지적).

      전에는 무조건 `/survey` 로 보냈다. 그러면 이미 끝낸 사람도 결과 대신
      빈 새 설문 화면에 떨어지고, 그 자리에서 새 세션까지 하나 만들어진다.
      기획은 「다시 들어오면 지난 결과를 보고, 거기서 다시 응시한다」였다.

      끝낸 결과가 있으면 결과 화면(`/me`)으로 — 거기에 「다시 응시하기」가
      있다. 아직 없으면(처음이거나 하던 중) `/survey` 로 가서 시작하거나 잇는다.
      `/survey` 쪽에서 가르지 않는 이유는, 「다시 응시하기」도 `/survey` 로
      오는데 거기서 완료자를 `/me` 로 돌려보내면 서로 튕기기 때문이다.
    */
    const done = await prisma.testSession.findFirst({
      where: { employeeId: employee.id, status: "COMPLETED" },
      select: { id: true },
    });
    redirect(done ? "/me" : "/survey");
  });
}

/** 관리자 로그인 — 아이디 + 비밀번호. 계정은 seed로만 만들어진다 (D-05) */
export async function adminLogin(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  return guarded(async () => {
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
  });
}

/**
 * 로그아웃.
 *
 * ⚠️ **여기만 감싸는 것이 빠져 있었다** (2026-08-26 점검에서 발견).
 * DB가 끊긴 채로 로그아웃을 누르면 Prisma 오류가 그대로 올라가 화면에
 * 내부 경로가 찍힌다 — `guarded()`를 둔 이유가 바로 그것이다.
 *
 * 다만 **쿠키는 어떻게든 지운다.** DB에서 행을 못 지워도 브라우저에서
 * 쿠키가 없어지면 로그아웃된 것이나 마찬가지다. 「로그아웃을 눌렀는데
 * 그대로 로그인 상태」가 가장 나쁘다.
 */
export async function logout() {
  try {
    await destroySession();
  } catch (e) {
    unstable_rethrow(e);
    console.error("[auth] 로그아웃", e);
  }
  redirect("/login");
}

/** 본인 비밀번호 변경. 관리자 초기 비밀번호 변경 강제에도 쓴다 */
export async function changePassword(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  return guarded(async () => {
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
      const ok = await verifyPassword(
        str(form, "currentPassword"),
        me.passwordHash,
      );
      if (!ok) return { error: "현재 비밀번호가 맞지 않습니다" };
    }

    await prisma.employee.update({
      where: { id: me.id },
      data: {
        passwordHash: await hashPassword(next),
        passwordChangedAt: new Date(),
      },
    });

    redirect(me.role === "ADMIN" ? "/admin" : "/me");
  });
}
