"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { themeFor } from "@/lib/theme";

/**
 * 화면 안에서 주소가 바뀔 때 밝기를 다시 건다.
 *
 * ## 왜 필요한가 (2026-08-26 사용자 발견)
 *
 * 밝기를 거는 스크립트는 `<head>`에 있어서 **문서를 통째로 새로 받을 때만
 * 한 번 돈다.** 깜빡임을 막으려면 그래야 한다.
 *
 * 그런데 화면 안의 링크를 누르면 Next는 **문서를 새로 받지 않는다.** 같은
 * 문서에서 내용만 갈아 끼운다. 그러니 스크립트가 다시 돌 일이 없고, 영역이
 * 바뀌어도 밝기는 **들어올 때 것 그대로** 남는다.
 *
 * 실제로 이랬다.
 *
 *   사원 로그인(밝음) → [관리자 로그인] 클릭 → 여전히 밝음
 *                     → 로그인 → 관리자 화면 → 여전히 밝음
 *
 * 주소창에 직접 치면 문서를 새로 받으니 제대로 어두웠다. **어떻게 들어왔느냐에
 * 따라 달라지니** 「가끔 이상하다」로 보였다.
 *
 * ## ⚠️ 읽기만 한다
 *
 * **저장은 하지 않는다.** 「관리자를 밝게 해 뒀다」는 선택은 그대로 이겨야
 * 한다. 여기서 쓰기 시작하면 지나가기만 해도 값이 덮인다.
 *
 * 첫 그림에서는 인라인 스크립트가 이미 같은 답을 걸어 뒀으므로 이 효과는
 * 같은 값을 다시 넣는 것뿐이다 — 깜빡이지 않는다.
 */
export function ThemeOnRoute() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.theme = themeFor(pathname, (k) =>
      localStorage.getItem(k),
    );
  }, [pathname]);

  return null;
}
