import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/guard";
import { getAppState } from "@/lib/admin/phase";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const state = await getAppState();
  const collecting = state.ratingPhase === "COLLECTING";

  return (
    <>
      <header className="border-b border-[--border] bg-surface">
        <div className="flex h-14 items-center justify-between px-6">
          <nav className="flex items-center gap-6">
            <Link href="/admin" className="font-medium">관리자</Link>
            <Link href="/admin/employees" className="text-table text-ink-secondary">구성원</Link>
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

      {/* 국면 잠금 (D-33) — 결과를 열기 전에는 상시 띄운다 */}
      {collecting && (
        <div
          className="text-axis px-6 py-2"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <span aria-hidden>🔒</span>{" "}
          <span className="text-ink-secondary">
            평가 수집 중입니다. 대표님 평가가 끝나기 전에는 결과를 볼 수 없습니다.
          </span>
        </div>
      )}

      <div className="flex-1 px-6 py-8">{children}</div>
    </>
  );
}
