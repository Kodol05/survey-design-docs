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
 * 저장된 것이 없으면 **관리자 화면만 어둡게** 시작한다 — 숫자와 그래프를
 * 오래 보는 자리라 밝은 바탕이 눈에 부담이 된다. 사원 화면은 밝게 둔다.
 *
 * `try`로 감싸는 이유는 사생활 보호 모드에서 `localStorage` 접근 자체가
 * 예외를 던지기 때문이다. 그때는 기본값으로 간다.
 */
const THEME_SCRIPT = `
try {
  var saved = localStorage.getItem("survey-theme");
  var t = saved || (location.pathname.indexOf("/admin") === 0 ? "dark" : "light");
  document.documentElement.dataset.theme = t;
} catch (e) {
  document.documentElement.dataset.theme =
    location.pathname.indexOf("/admin") === 0 ? "dark" : "light";
}
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
