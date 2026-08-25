"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * 저장 키 — **영역별로 따로 기억한다.**
 *
 * 한 곳에 저장하면 관리자에서 어둡게 바꾼 것이 사원 화면까지 따라간다.
 * 관리자는 숫자를 오래 보는 자리고 사원은 결과를 한 번 읽는 자리라
 * 편한 밝기가 다르다.
 *
 * 관리자 쪽 값은 **관리자를 벗어나는 순간 지워진다** (`app/layout.tsx`).
 * 그래서 관리자는 들어갈 때마다 어둡게 시작한다.
 */
const scopeOf = (path: string) => (path.indexOf("/admin") === 0 ? "admin" : "app");
export const themeKey = (path: string) => `survey-theme:${scopeOf(path)}`;

/**
 * 밝게/어둡게 전환.
 *
 * ## 깜빡임을 막는 것이 핵심이다
 *
 * 리액트가 붙은 뒤에 테마를 걸면 **첫 그림이 밝게 그려졌다가 어두워진다.**
 * 그래서 실제 적용은 `<head>`의 인라인 스크립트가 그림 그리기 전에 한다
 * (`layout.tsx`). 이 컴포넌트는 **바꾸는 일만** 맡는다.
 *
 * 관리자 화면은 기본이 어둡다 — 숫자와 그래프를 오래 보는 자리라
 * 밝은 바탕이 눈에 부담이 된다. 사원 화면은 기본이 밝다.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  // 서버에서는 무엇이 걸렸는지 알 수 없다. 붙고 나서 실제 값을 읽는다
  useEffect(() => {
    const now = document.documentElement.dataset.theme;
    setTheme(now === "dark" ? "dark" : "light");
  }, []);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(themeKey(window.location.pathname), next);
    } catch {
      // 사생활 보호 모드 등에서 막힐 수 있다. 이번 방문에만 적용되고 끝난다
    }
    setTheme(next);
  };

  const dark = theme === "dark";

  /*
    ── 스위치로 둔다 (2026-08-25) ──

    전에는 버튼 하나가 `☀`↔`☾`로 모양만 바뀌었다. 그러면 **지금 아이콘이
    현재 상태인지 누르면 될 상태인지** 알 수 없다 — 해가 떠 있으면 지금
    밝다는 뜻인지, 누르면 밝아진다는 뜻인지 매번 헷갈린다.

    스위치는 **꺼짐/켜짐이 위치로 보인다.** 손잡이가 오른쪽에 가 있으면
    켜진 것이고, 그건 아이콘과 달리 해석할 여지가 없다.
  */
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={flip}
      className={`inline-flex items-center gap-2 ${className}`}
      // 값을 읽기 전에는 자리만 잡아 둔다. 손잡이가 튀는 것을 막는다
      style={{ opacity: theme ? 1 : 0 }}
      title={dark ? "밝게 보기" : "어둡게 보기"}
    >
      <span className="text-axis text-ink-muted">다크</span>

      <span
        aria-hidden
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors"
        style={{
          background: dark ? "var(--series-1)" : "var(--grid)",
          outline: "1px solid var(--border)",
        }}
      >
        <span
          className="absolute size-5 rounded-full transition-[left] duration-200"
          style={{
            left: dark ? "1.5rem" : "0.25rem",
            background: dark ? "#fff" : "var(--page)",
            boxShadow: "0 1px 2px rgb(0 0 0 / 0.2)",
          }}
        />
      </span>
    </button>
  );
}
