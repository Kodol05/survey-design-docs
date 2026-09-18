import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/guard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * 사원 화면의 머리.
 *
 * ## 관리자에게는 돌아갈 길을 준다 (2026-08-25 사용자 신고)
 *
 * 관리자도 `/me`에 들어올 수 있다 — `requireUser`는 역할을 가리지 않는다.
 * 실제로 여러 경로가 관리자를 여기로 보낸다(`requireAdmin`이 사원 계정을
 * 튕겨내는 자리, 첫 화면의 자동 이동 등).
 *
 * 그런데 **여기서 관리자 화면으로 돌아갈 길이 없었다.** 주소를 직접 치거나
 * 로그아웃했다 다시 들어오는 수밖에 없었다. 사원 화면은 사원의 자리라
 * 관리자 메뉴를 통째로 달 것은 아니고, **돌아가는 링크 하나**면 된다.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <>
      <header className="border-b border-[--border]">
        {/*
          폰 폭(390px)에서 제목·「다크」·이름·「로그아웃」이 제각기 두 줄로 접혔다
          (2026-09-18). 머리의 글자는 **절대 접지 않는다** — 좁으면 사이를 좁히고
          「다크」 표시만 숨긴다(스위치 자체가 뜻을 말한다).
        */}
        <div className="page-column flex h-16 items-center justify-between gap-3">
          <Link href="/me" className="shrink-0 font-medium whitespace-nowrap">
            7차원 성향 설문
          </Link>
          <div className="text-axis text-ink-secondary flex items-center gap-3 whitespace-nowrap sm:gap-4">
            {me.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 font-medium"
                style={{ background: "var(--wash)", color: "var(--ink)" }}
              >
                ← 관리자 화면
              </Link>
            )}
            <ThemeToggle labelClassName="hidden sm:inline" />
            <span>{me.name}</span>
            <form action={logout}>
              <button className="underline">로그아웃</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
