export type Theme = "light" | "dark";

/**
 * 밝기 규칙 — **여기서만 정한다.**
 *
 *   관리자 화면        기본 어둡게 · 바꾸면 그대로 유지
 *   그 밖의 화면       기본 밝게  · 바꾸면 그대로 유지
 *
 * 기본값은 **저장된 것이 없을 때** 무엇으로 시작하느냐일 뿐이고, 한 번 고르면
 * 그 선택이 이긴다. 열쇠가 영역별로 나뉘어 있어 한쪽을 바꿔도 다른 쪽은
 * 그대로다.
 *
 * ## 왜 한 곳에 모았나 (2026-08-26)
 *
 * 이 규칙을 쓰는 데가 **셋**이다.
 *
 *   ① `<head>` 인라인 스크립트 — 첫 그림 전에 건다 (`app/layout.tsx`)
 *   ② 화면 안에서 주소가 바뀔 때 — 인라인 스크립트는 그때 안 돈다
 *      (`components/ui/ThemeOnRoute.tsx`)
 *   ③ 스위치를 눌렀을 때 저장 (`components/ui/ThemeToggle.tsx`)
 *
 * 셋이 따로 적혀 있으면 하나만 고쳤을 때 **화면마다 다른 밝기**가 된다.
 * ①은 문자열이라 이 파일을 불러올 수 없어서 열쇠 이름만 끼워 넣고, 대신
 * `theme-script.test.ts`가 **①과 이 파일이 같은 답을 내는지** 검사한다.
 */

export const THEME_KEY = {
  admin: "survey-theme:admin",
  app: "survey-theme:app",
} as const;

/** 영역을 나누기 전에 쓰던 열쇠. 남아 있으면 한 번만 치운다 */
export const OLD_THEME_KEY = "survey-theme";

export function isAdminPath(pathname: string): boolean {
  return pathname.indexOf("/admin") === 0;
}

/** 저장된 것이 없을 때 무엇으로 시작하는가 */
export function defaultTheme(pathname: string): Theme {
  return isAdminPath(pathname) ? "dark" : "light";
}

export function themeKey(pathname: string): string {
  return isAdminPath(pathname) ? THEME_KEY.admin : THEME_KEY.app;
}

/**
 * 이 주소에서 걸려야 할 밝기.
 *
 * `read`가 던져도(사생활 보호 모드 등) 기본값으로 간다.
 */
export function themeFor(
  pathname: string,
  read: (key: string) => string | null,
): Theme {
  try {
    const saved = read(themeKey(pathname));
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // 저장소를 못 읽는 곳에서는 이번 방문에만 기본값으로 간다
  }
  return defaultTheme(pathname);
}

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
export const THEME_SCRIPT = `
(function () {
  var p = location.pathname;
  var admin = p.indexOf("/admin") === 0;
  var t = admin ? "dark" : "light";
  try {
    // 영역마다 따로 기억한다. 저장된 것이 없을 때만 기본값으로 간다.
    // ⚠️ 값을 확인하고 쓴다 — 전에는 그냥 || 로 받아서, 저장소에 엉뚱한
    //    글자가 있으면 그것이 그대로 data-theme 이 됐다. 밝지도 어둡지도
    //    않은 화면이 나온다 (2026-08-26 검사가 잡음)
    var v = localStorage.getItem(admin ? "${THEME_KEY.admin}" : "${THEME_KEY.app}");
    if (v === "dark" || v === "light") t = v;
    // 영역을 나누기 전에 쓰던 열쇠. 남아 있으면 한 번만 치운다
    localStorage.removeItem("${OLD_THEME_KEY}");
  } catch (e) {}
  document.documentElement.dataset.theme = t;
})();
`;
