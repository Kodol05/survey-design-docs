"use client";

import { useEffect, useState } from "react";
import { themeKey, type Theme } from "@/lib/theme";

// 밝기 규칙은 `lib/theme.ts` 한 곳에서 정한다

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
/*
  ── `useSyncExternalStore`를 써 봤다가 두고 왔다 (2026-08-26) ──

  지금 걸린 테마는 리액트 상태가 아니라 `<html>`의 속성이다. 그러니 「바깥 값을
  그냥 읽는」 도구가 맞아 보였고, 붙고 나서 한 번 더 그리는 것도 없앨 수 있었다.
  lint도 그걸 원한다.

  바꿔 놓고 확인하니 스위치가 안 보였다. **그런데 원래 것으로 되돌려도 똑같이
  안 보였다** — 시험하던 탭이 배경에 있어서 리액트가 아예 안 붙은 것이었다.
  즉 **두 방식을 가른 증거가 아니었다.**

  그래서 새 방식이 나쁘다는 근거도, 좋다는 근거도 없다. 근거 없이 바꾸느니
  **오래 돌아간 쪽을 둔다.** 붙고 나서 한 번 더 그리는 비용은 작은 스위치
  하나의 렌더 한 번이다. 아래에서 lint를 끄는 것은 그 판단이다.
*/
export function ThemeToggle({
  className = "",
  labelClassName = "",
}: {
  className?: string;
  /** 「다크」 글자에 붙는 class — 좁은 화면에서 숨길 때 쓴다 */
  labelClassName?: string;
}) {
  const [theme, setTheme] = useState<Theme | null>(null);

  // 서버에서는 무엇이 걸렸는지 알 수 없다. 붙고 나서 실제 값을 읽는다
  useEffect(() => {
    const now = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 위 주석 참고
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
      <span className={`text-axis text-ink-muted ${labelClassName}`}>다크</span>

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
