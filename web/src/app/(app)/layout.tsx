import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/guard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <>
      <header className="border-b border-[--border]">
        <div className="page-column flex h-16 items-center justify-between">
          <Link href="/me" className="font-medium">7차원 성향 설문</Link>
          <div className="text-axis text-ink-secondary flex items-center gap-4">
            <ThemeToggle />
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
