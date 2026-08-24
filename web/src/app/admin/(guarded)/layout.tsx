import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  return (
    <>
      <header className="border-b border-[--border]">
        <div className="flex h-16 items-center justify-between px-8">
          <nav className="flex items-center gap-6">
            <Link href="/admin" className="font-medium">관리자</Link>
            <Link href="/admin/employees" className="text-table text-ink-secondary">구성원</Link>
            <Link href="/admin/stats" className="text-table text-ink-secondary">분석</Link>
            <Link href="/admin/ratings" className="text-table text-ink-secondary">대표님 평가</Link>
          </nav>
          <div className="text-axis text-ink-secondary flex items-center gap-4">
            <span>{me.name}</span>
            <Link href="/admin/password" className="underline">비밀번호</Link>
            <form action={logout}>
              <button className="underline">로그아웃</button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 px-8 py-10">{children}</div>
    </>
  );
}
