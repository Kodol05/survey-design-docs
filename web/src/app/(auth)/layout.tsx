import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * 로그인·가입 화면의 껍데기.
 *
 * 여기가 **사원이 가장 처음 만나는 화면**이다. 전에는 상자 하나만 덩그러니
 * 있었다. 어디로 돌아가는지도, 어두운 화면을 밝게 바꿀 방법도 없었다.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="reading-column flex flex-1 flex-col py-10">
      <div className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-table text-ink-secondary">
          7차원 성향 설문
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-16">
        {children}
      </div>
    </main>
  );
}
