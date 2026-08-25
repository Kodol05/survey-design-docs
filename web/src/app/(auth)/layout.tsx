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
    <main className="relative flex flex-1 flex-col">
      {/*
        첫 화면과 **같은 사진을 아주 옅게** 깐다 (2026-08-25).

        랜딩에서 넘어오면 화면이 뚝 끊겼다 — 사진이 있던 자리에서 흰 상자
        하나로 바뀐다. 같은 사진을 질감처럼만 남기면 이어진 것으로 읽힌다.

        글자가 앉는 가운데는 거의 다 덮는다. 사진은 가장자리에서만 비친다.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-40 dark-hide"
        style={{ backgroundImage: "url(/hero.jpg)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, var(--page) 0%, var(--page) 55%, color-mix(in oklab, var(--page) 82%, transparent) 100%)",
        }}
      />

      <div className="reading-column relative flex flex-1 flex-col py-10">
      <div className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-table text-ink-secondary">
          7차원 성향 설문
        </Link>
        <ThemeToggle />
      </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-16">
          {children}
        </div>
      </div>
    </main>
  );
}
