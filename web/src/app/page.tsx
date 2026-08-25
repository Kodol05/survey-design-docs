import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { POLES } from "@/lib/interpretation/poles";
import { CHARACTER, GRADIENT, TEMPERAMENT } from "@/components/charts/scale";

export const metadata = { title: "7차원 성향 설문" };

/**
 * 첫 화면.
 *
 * ## 화면이 곧 도구다
 *
 * 설문 소개 화면의 흔한 모양은 「큰 제목 + 좋은 점 세 칸 + 시작 버튼」이다.
 * 그건 어느 설문에나 붙는 껍데기라 **이 검사가 무엇인지는 하나도 말하지
 * 않는다.**
 *
 * 여기서는 **일곱 개의 자를 그대로 펼쳐 놓는다.** 결과지에 나오는 바로 그
 * 눈금이고, 양 끝 문구도 결과지와 같은 파일(`interpretation/poles.ts`)에서
 * 가져온다. 소개와 결과가 같은 말을 쓰게 된다.
 *
 * ## 왜 이게 이 검사에 맞는가
 *
 * 링크를 받은 사람이 가장 먼저 하는 걱정은 **「이거 평가인가」**다. 좋은 점을
 * 나열하면 그 걱정이 더 커진다. 대신 자를 보여주면 **양 끝이 둘 다 그냥
 * 설명**이라는 것이 한눈에 보인다 — 말로 안심시키는 것보다 빠르다.
 *
 * ## 절제
 *
 * 움직임은 **한 번만** 쓴다. 눈금이 왼쪽에서 오른쪽으로 그려지며 나타난다 —
 * 「자를 긋는」 동작이라 내용과 맞는다. 그 밖에는 아무것도 움직이지 않는다.
 * 움직임을 줄이도록 설정한 사람에게는 걸지 않는다.
 */
export default async function Home() {
  const me = await currentUser();
  if (me) redirect(me.role === "ADMIN" ? "/admin" : "/me");

  const axes = [...TEMPERAMENT, ...CHARACTER];

  return (
    <main className="page-column flex flex-1 flex-col py-8">
      <header className="mb-20 flex items-center justify-between">
        <span className="text-axis text-ink-muted">7차원 성향 설문</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-axis text-ink-secondary underline">
            로그인
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[62rem]">
        <h1 className="text-screen-title mb-3" style={{ letterSpacing: "-0.02em" }}>
          일하는 방식을 일곱 갈래로 봅니다
        </h1>
        <p className="text-item text-ink-secondary mb-16 max-w-[40rem]">
          높고 낮음은 있지만 좋고 나쁨은 없습니다. 아래 일곱 개가 그 자입니다.
        </p>

        {/*
          ── 서명 요소 ──
          일곱 축을 자 모양 그대로. 축 이름은 눈금 아래 가운데에 작게 —
          계측기에 새긴 이름처럼 둔다. 자간을 벌려 눈금과 구분한다.
        */}
        <ul className="mb-20 flex flex-col gap-9">
          {axes.map((axis, i) => (
            <li key={axis} className="reveal" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="grid items-center gap-x-5 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <span className="text-axis text-ink-secondary sm:text-right">
                  {POLES[axis].low}
                </span>

                <span className="order-last flex flex-col items-center gap-1.5 sm:order-none">
                  <span
                    className="rule block h-2.5 w-full rounded-full sm:w-[13rem]"
                    style={{ background: GRADIENT }}
                    aria-hidden
                  />
                  <span
                    className="text-axis text-ink-muted"
                    style={{ letterSpacing: "0.18em", fontSize: "0.8125rem" }}
                  >
                    {axis}
                  </span>
                </span>

                <span className="text-axis text-ink-secondary">{POLES[axis].high}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <ButtonLink href="/signup" size="lg">
            시작하기
          </ButtonLink>
          <p className="text-table text-ink-secondary">
            약 17분 · 114문항 · 중간에 그만두어도 이어서 하실 수 있습니다
          </p>
        </div>

        <p className="text-axis text-ink-muted mt-20 max-w-[46rem] border-t border-[--border] pt-6">
          클로닝거의 기질·성격 이론을 참고해 사내에서 만든 설문입니다. 공개된 검사를
          그대로 쓴 것이 아니라 문항을 직접 썼고, <strong>아직 다듬는 중입니다.</strong>{" "}
          자기 이해를 돕는 참고 자료로 봐 주시면 됩니다.
        </p>

        <p className="text-axis text-ink-muted mt-6">
          <Link href="/admin/login" className="underline">
            관리자 로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
