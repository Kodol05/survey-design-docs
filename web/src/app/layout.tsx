import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "7차원 성향 설문",
  description: "사내 성향·직무능력 설문",
};

/**
 * 테마를 **첫 그림 전에** 건다.
 *
 * 리액트가 붙은 뒤에 걸면 밝게 한 번 그려졌다가 어두워져 화면이 번쩍인다.
 * `<head>` 안의 스크립트는 본문을 그리기 전에 돌기 때문에 그 틈이 없다.
 *
 * ## 규칙 (2026-08-25 사용자 결정)
 *
 *   관리자에 들어갈 때      항상 어둡게
 *   관리자 안에서 이동      바꾼 것이 유지된다
 *   관리자에서 나갈 때      바꾼 것을 지운다 → 다음에 또 어둡게
 *   사원 화면              바꾼 것이 계속 유지된다
 *   첫 화면(`/`)           초기화 → 밝게
 *
 * **두 영역이 서로 다른 이유** — 관리자는 숫자와 그래프를 오래 보는 자리라
 * 어두운 바탕이 기본으로 맞다. 사원은 결과를 한 번 읽고 나가는 자리라 밝은
 * 쪽이 맞지만, 응시 중에 눈이 부시면 바꿀 수 있어야 하고 그 선택은 남아야
 * 한다.
 *
 * **초기화는 여기서 하지 않는다** (2026-08-26 옮김). 첫 화면이 초기화 지점인
 * 것은 맞지만, 그 판정을 주소로만 하면 **로그인한 사람이 `/`에 들렀다가
 * 곧장 튕겨 나갈 때도 지워진다.** 사원이 로그인 화면의 「7차원 성향 설문」을
 * 눌렀을 뿐인데 어둡게 해 둔 것이 조용히 풀렸다. 초기화는 첫 화면이 실제로
 * 그려질 때만 해야 하므로 `app/page.tsx`가 맡는다.
 *
 * `try`로 감싸는 이유는 사생활 보호 모드에서 `localStorage` 접근 자체가
 * 예외를 던지기 때문이다. 그때는 기본값으로 간다.
 */
const THEME_SCRIPT = `
(function () {
  var p = location.pathname;
  var admin = p.indexOf("/admin") === 0;
  var t = admin ? "dark" : "light";
  try {
    if (admin) {
      t = localStorage.getItem("survey-theme:admin") || "dark";
    } else {
      // 관리자를 벗어났다 — 거기서 바꾼 것은 여기까지 따라오지 않는다
      localStorage.removeItem("survey-theme:admin");
      t = localStorage.getItem("survey-theme:app") || "light";
    }
  } catch (e) {}
  document.documentElement.dataset.theme = t;
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      {/* 글꼴은 시스템 산세리프 하나만 쓴다 (11 §1.2).
          별도 웹폰트를 받지 않으므로 사내망에서도 즉시 뜬다. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
