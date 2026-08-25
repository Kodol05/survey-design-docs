"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 상단 메뉴 한 칸.
 *
 * **지금 어느 화면인지 보여야 한다.** 전에는 넷 다 같은 모양이라 주소창을
 * 봐야 알 수 있었다. 지금 화면은 잉크색 바탕에 흰 글씨로 뒤집는다.
 *
 * `/admin`은 정확히 일치할 때만 켠다 — `startsWith`로 하면 어느 화면에서나
 * 「관리자」가 같이 켜져 둘이 동시에 눌린 것처럼 보인다.
 *
 * ## 첫 칸은 색으로 표시한다 (2026-08-25 사용자 요청)
 *
 * 「관리자」는 **돌아갈 자리**(대시보드)인데 다른 메뉴와 똑같은 회색이라
 * 눈에 안 띄었다. 다른 화면을 보다가 처음으로 돌아가려면 다섯 칸을 읽어야
 * 했다. 켜지지 않은 상태에서도 **옅은 색을 남겨** 어디가 집인지 보이게 한다.
 *
 * 켜졌을 때는 다른 칸과 같은 규칙(잉크 바탕)을 쓴다 — 「지금 여기」 표시는
 * 하나여야 한다.
 */
export function NavItem({
  href,
  label,
  exact,
}: {
  href: string;
  label: string;
  exact?: boolean;
}) {
  const path = usePathname();
  const on = exact ? path === href : path.startsWith(href);
  // 첫 칸(대시보드)만 꺼졌을 때 색을 남긴다
  const home = Boolean(exact);

  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className="text-table shrink-0 rounded-lg px-4 py-2 whitespace-nowrap"
      style={{
        background: on
          ? "var(--ink)"
          : home
            ? "color-mix(in oklab, var(--status-critical) 12%, transparent)"
            : "transparent",
        color: on
          ? "var(--page)"
          : home
            ? "var(--status-critical)"
            : "var(--ink-secondary)",
        fontWeight: on || home ? 600 : 400,
      }}
    >
      {label}
    </Link>
  );
}
