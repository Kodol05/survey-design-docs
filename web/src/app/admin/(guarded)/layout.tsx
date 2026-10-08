import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/guard";
import { NavItem } from "./NavItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** 순서는 보는 순서다 — 요약 → 해석 → 사람 → 입력 (2026-08-24 사용자 결정) */
const NAV = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/stats", label: "분석" },
  { href: "/admin/employees", label: "구성원" },
  { href: "/admin/items", label: "문항" },
];

/**
 * 관리자 화면 틀 (2026-10-07 사용자 결정).
 *
 *   위쪽 줄    왼쪽 사이트 제목 · 오른쪽 다크 / 관리자 표시 / 로그아웃
 *   왼쪽 사이드바  메뉴 넷 · 맨 아래 다크 / 관리자 표시 / 비밀번호 / 로그아웃
 *
 * 다크·관리자 표시·로그아웃은 위와 사이드바 **두 곳에** 둔다(사용자 결정).
 * 비밀번호 바꾸기는 **사이드바 아래에만** 둔다 — 자주 쓰는 것이 아니다.
 *
 * 좁은 화면에서는 사이드바를 접고 위쪽 줄 아래에 메뉴를 가로로 깐다.
 * 메뉴를 숨기면 지금 어느 화면인지 표시가 같이 사라지기 때문이다.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  /*
    **누구로 들어와 있는지 눈에 띄게** (2026-08-25 사용자 요청).
    관리자 화면은 남의 응답을 보는 자리라 지금 누구 자격으로 보고 있는지가
    흐릿하면 안 된다. 붉은색은 이 시스템에서 「조심할 것」을 뜻한다.
  */
  const badge = (
    <span
      className="rounded-md px-2.5 py-1 font-medium"
      style={{
        background: "color-mix(in oklab, var(--status-critical) 12%, transparent)",
        color: "var(--status-critical)",
      }}
      title="지금 로그인한 계정"
    >
      {me.name}
    </span>
  );
  const logoutButton = (
    <form action={logout}>
      <button className="hover:text-ink underline">로그아웃</button>
    </form>
  );

  return (
    <div className="admin-shell flex min-h-full flex-1 flex-col">
      <header className="bg-card sticky top-0 z-30 border-b border-(--border)">
        <div className="flex h-15 items-center justify-between gap-4 px-5 lg:px-6">
          <Link href="/admin" className="flex items-baseline gap-2.5">
            <span className="text-card-title">7차원 성향 설문</span>
            <span className="text-axis text-ink-muted">관리자</span>
          </Link>
          <div className="text-axis text-ink-secondary flex shrink-0 items-center gap-4">
            <ThemeToggle />
            <span className="hidden sm:inline">{badge}</span>
            {logoutButton}
          </div>
        </div>
        <nav className="flex h-11 items-center gap-1.5 overflow-x-auto px-4 lg:hidden">
          {NAV.map((n) => (
            <NavItem key={n.href} {...n} />
          ))}
        </nav>
      </header>

      <div className="flex flex-1">
        <aside
          className="bg-card sticky hidden w-56 shrink-0 flex-col justify-between border-r border-(--border) lg:flex"
          style={{ top: "var(--admin-top)", height: "calc(100vh - var(--admin-top))" }}
        >
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((n) => (
              <NavItem key={n.href} {...n} block />
            ))}
          </nav>
          <div className="text-axis text-ink-secondary flex flex-col gap-3 border-t border-(--border) p-4">
            <div>{badge}</div>
            <ThemeToggle />
            <div className="flex items-center gap-4">
              <Link href="/admin/password" className="hover:text-ink underline">
                비밀번호 바꾸기
              </Link>
            </div>
            {logoutButton}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[100rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
