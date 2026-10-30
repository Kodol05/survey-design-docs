import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * 로그인·가입 화면의 껍데기.
 *
 * 여기가 **사원이 가장 처음 만나는 화면**이다. 어디로 돌아가는지와 다크
 * 스위치를 위에 둔다.
 *
 * ## 회색 바탕 위 흰 카드 하나 (2026-10-28 사용자 결정)
 *
 * 법무법인 정안 시안처럼 바탕을 한 단 가라앉히고(`--canvas`) 그 위에 **테두리
 * 없는** 카드를 띄운다. 카드는 각 화면이 직접 둔다 — 로그인은 좁게, 가입은
 * 칸이 많아 넓게 두 단으로 짜서 **한 화면에 다 들어오게** 한다. 사진은 두지
 * 않는다(사용자).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-canvas flex flex-1 flex-col">
      <header className="page-column flex h-16 items-center justify-between">
        <Link href="/" className="text-table font-medium">
          7가지 성향 검사
        </Link>
        <ThemeToggle labelClassName="hidden sm:inline" />
      </header>

      <div className="page-column flex flex-1 items-center justify-center pt-2 pb-12">
        {children}
      </div>
    </main>
  );
}

