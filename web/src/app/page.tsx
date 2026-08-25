import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
/*
  ⚠️ 문항 수를 **글자로 박지 않는다.**

  능력 문항을 축당 3→5로 늘려 105+15=120이 되었는데, 첫 화면에는 「114문항」이
  그대로 남아 있었다 (2026-08-26 발견). 사원이 처음 보는 숫자가 실제와 달랐다.
  세는 곳은 한 곳이어야 한다.
*/
import { EXPECTED } from "@/lib/items/types";

export const metadata = { title: "7차원 성향 설문" };

/**
 * 첫 화면.
 *
 * ## 첫 눈에는 한 줄만
 *
 * 처음에 일곱 축을 다 펼쳐 뒀더니 **읽을 것이 너무 많았다.** 링크를 받은
 * 사람이 처음 보는 화면에서 필요한 것은 「무슨 사이트인가」 한 줄과
 * 「시작하기」뿐이다. 나머지는 궁금한 사람만 내려 보면 된다.
 *
 * ## 사진
 *
 * `public/hero.jpg`. 바꾸려면 같은 이름으로 덮어쓴다.
 *
 * 사진이 밝고 따뜻해서 **어둡게 덮지 않는다.** 왼쪽 3분의 2가 빈 벽이라
 * 검은 글씨가 그대로 읽힌다. 왼쪽에서만 살짝 밝히는 겹 하나로 충분하다.
 *
 * 첫 화면의 글자색은 **토큰을 쓰지 않고 직접 적는다.** 사진 위라서
 * 다크 모드에서도 밝은 사진이 그대로 깔리기 때문이다 — 토큰을 쓰면
 * 어두운 화면에서 흰 글씨가 되어 밝은 사진 위에서 안 읽힌다.
 */
export default async function Home() {
  const me = await currentUser();
  if (me) redirect(me.role === "ADMIN" ? "/admin" : "/me");

  return (
    <>
      {/*
        밝기 초기화 — **첫 화면이 실제로 그려질 때만.**

        한 번 어둡게 바꾼 사람이 영영 어두운 화면만 보지 않도록 되돌아갈 곳이
        하나 필요하다. 처음 오는 사람이 보는 자리가 여기다. 사무실 공용 PC라면
        앞사람이 바꿔 둔 것을 물려받지 않는다는 뜻이기도 하다.

        ⚠️ 전에는 이 일을 최상위 레이아웃이 **주소만 보고** 했다. 그런데
        로그인한 사람도 `/`에 들르면 이 문서를 받은 뒤 튕겨 나가므로, 보이지도
        않는 화면을 지나가며 설정이 지워졌다. 위 `redirect`를 지난 자리에서만
        하면 그 일이 없다.

        `<body>` 맨 앞이라 눈에 보이는 것이 그려지기 전에 끝난다.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{localStorage.removeItem("survey-theme:app");document.documentElement.dataset.theme="light"}catch(e){}`,
        }}
      />

      {/* ── 첫 눈 ── */}
      <section className="relative flex min-h-[100svh] flex-col">
        {/*
          **사진을 어둡게 덮지 않는다.**

          받은 사진이 밝고 따뜻하다 — 우리 배경색(#f5f4f0)과 거의 같은 계열이다.
          여기에 검은 겹을 씌우고 흰 글씨를 얹으면 사진의 좋은 점이 다 죽고
          화면 전체와도 어긋난다.

          사진 **왼쪽 3분의 2가 빈 벽**이라 검은 글씨가 그대로 읽힌다.
          왼쪽에서만 살짝 밝히는 겹 하나면 어떤 화면 크기에서도 안전해진다.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: "url(/hero.jpg)",
            backgroundPosition: "72% center",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgb(247 244 238 / 0.92) 0%, rgb(247 244 238 / 0.82) 34%, rgb(247 244 238 / 0.25) 62%, rgb(247 244 238 / 0) 82%)",
          }}
        />

        <div className="page-column relative flex flex-1 flex-col">
          <header className="flex items-center justify-between py-8">
            <span className="text-axis" style={{ color: "#5a5249" }}>
              7차원 성향 설문
            </span>
            <Link
              href="/login"
              className="text-axis underline"
              style={{ color: "#5a5249" }}
            >
              로그인
            </Link>
          </header>

          <div className="flex flex-1 flex-col justify-center pb-28">
            <h1
              className="mb-6 max-w-[26rem] font-semibold"
              style={{
                fontSize: "clamp(2.5rem, 1.8rem + 3vw, 4.25rem)",
                lineHeight: 1.16,
                letterSpacing: "-0.03em",
                color: "#241f1a",
              }}
            >
              일하는 방식을
              <br />
              일곱 갈래로 봅니다
            </h1>

            <p
              className="text-item mb-12 max-w-[26rem]"
              style={{ color: "#4a433b" }}
            >
              높고 낮음은 있지만 좋고 나쁨은 없습니다.
            </p>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <ButtonLink href="/signup" size="lg">
                시작하기
              </ButtonLink>
              <p className="text-table" style={{ color: "#5a5249" }}>
                약 18분 · {EXPECTED.total}문항
              </p>
            </div>
          </div>

          <a
            href="#more"
            className="text-axis pb-10 text-center"
            style={{ color: "#6b6258" }}
          >
            <span aria-hidden className="block">
              ↓
            </span>
          </a>
        </div>
      </section>

      {/*
        아래는 **보통 웹사이트 맨 아래처럼** 둔다 (2026-08-25).

        처음에는 일곱 축을 다 펼쳐 놨었다. 내용 자체가 틀린 것은 아닌데,
        **아직 시작도 안 한 사람에게 먼저 들이밀 것이 아니었다.** 화면도
        예뻐지지 않았다. 필요한 사람만 읽는 자리로 내린다.
      */}
      <footer id="more" className="border-t border-[--border]">
        <div className="page-column py-14">
          <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-8">
            <div className="max-w-[34rem]">
              <p className="text-table mb-2 font-medium">7차원 성향 설문</p>
              <p className="text-axis text-ink-muted leading-relaxed">
                클로닝거의 기질·성격 이론을 참고해 사내에서 만들었습니다. 공개된
                검사를 그대로 쓴 것이 아니라 문항을 직접 썼고, 아직 다듬는
                중입니다. 자기 이해를 돕는 참고 자료로 봐 주시면 됩니다.
              </p>
            </div>

            <nav className="text-axis flex flex-col gap-2">
              <Link href="/signup" className="text-ink-secondary">
                시작하기
              </Link>
              <Link href="/login" className="text-ink-secondary">
                로그인
              </Link>
              <Link href="/admin/login" className="text-ink-muted">
                관리자
              </Link>
            </nav>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[--border] pt-6">
            <p className="text-axis text-ink-muted">
              약 18분 · {EXPECTED.total}문항
            </p>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </>
  );
}
