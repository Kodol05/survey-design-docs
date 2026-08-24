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

  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className="text-table rounded-lg px-4 py-2"
      style={{
        background: on ? "var(--ink)" : "transparent",
        color: on ? "var(--page)" : "var(--ink-secondary)",
        fontWeight: on ? 600 : 400,
      }}
    >
      {label}
    </Link>
  );
}
