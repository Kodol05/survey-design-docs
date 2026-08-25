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
 * ## 규칙 (2026-08-26 사용자 결정)
 *
 *   관리자 화면            기본 어둡게 · 바꾸면 그대로 유지
 *   그 밖의 화면           기본 밝게 · 바꾸면 그대로 유지
 *
 * **두 영역이 서로 다른 기본값을 갖는 이유** — 관리자는 숫자와 그래프를 오래
 * 보는 자리라 어두운 바탕이 맞고, 사원은 결과를 한 번 읽고 나가는 자리라 밝은
 * 쪽이 맞다.
 *
 * **바꾼 것은 지우지 않는다** (2026-08-26 바로잡음). 전에는 관리자를 벗어날 때
 * 관리자 쪽 선택을, 첫 화면에 들를 때 사원 쪽 선택을 지웠다. 「기본값으로
 * 되돌아갈 자리」를 두려던 것인데, 실제로는 **한번 바꿔 둔 사람의 선택이
 * 이유 없이 풀리는 것**이었다. 기본값은 저장된 것이 없을 때 무엇으로
 * 시작하느냐일 뿐이고, 고르고 나면 그 선택이 이긴다.
 *
 * 열쇠를 영역별로 나눠 두므로 **한쪽을 바꿔도 다른 쪽은 그대로다.**
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
    // 영역마다 따로 기억한다. 저장된 것이 없을 때만 기본값으로 간다
    t = localStorage.getItem(admin ? "survey-theme:admin" : "survey-theme:app") || t;
    // 영역을 나누기 전에 쓰던 열쇠. 남아 있으면 한 번만 치운다
    localStorage.removeItem("survey-theme");
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
