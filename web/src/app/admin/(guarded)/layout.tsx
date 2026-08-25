import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/guard";
import { NavItem } from "./NavItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** 순서는 보는 순서다 — 요약 → 해석 → 사람 → 입력 (2026-08-24 사용자 결정) */
const NAV = [
  { href: "/admin", label: "관리자", exact: true },
  { href: "/admin/stats", label: "분석" },
  { href: "/admin/employees", label: "구성원" },
  { href: "/admin/ratings", label: "대표님 평가" },
  { href: "/admin/items", label: "문항" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  return (
    <>
      <header className="border-b border-[--border]">
        {/*
          좁은 화면에서 **메뉴가 화면 밖으로 밀려났다** (2026-08-25).
          다섯 칸에 사용자 영역까지 하면 40rem이 필요한데 폰은 24rem이다.

          두 줄로 쌓고, 메뉴 줄만 가로로 넘길 수 있게 둔다 — 메뉴를 접어
          숨기면 지금 어느 화면인지 표시(잉크 바탕)가 같이 사라진다.
        */}
        <div className="page-column flex min-h-16 flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
          <nav className="-mx-1 flex items-center gap-2 overflow-x-auto px-1">
            {NAV.map((n) => (
              <NavItem key={n.href} {...n} />
            ))}
          </nav>
          <div className="text-axis text-ink-secondary flex shrink-0 items-center gap-4">
            <ThemeToggle />
            <span>{me.name}</span>
            <Link href="/admin/password" className="underline">비밀번호</Link>
            <form action={logout}>
              <button className="underline">로그아웃</button>
            </form>
          </div>
        </div>
      </header>

      <div className="page-column flex-1 py-10">{children}</div>
    </>
  );
}
