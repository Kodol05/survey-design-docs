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
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  return (
    <>
      <header className="border-b border-[--border]">
        <div className="page-column flex h-16 items-center justify-between">
          <nav className="flex items-center gap-2">
            {NAV.map((n) => (
              <NavItem key={n.href} {...n} />
            ))}
          </nav>
          <div className="text-axis text-ink-secondary flex items-center gap-4">
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
