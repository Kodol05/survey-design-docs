"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 메뉴 한 칸.
 *
 * **지금 어느 화면인지 보여야 한다.** 지금 화면은 옅은 바탕(`--wash`)에
 * 굵은 글씨로 띄운다 (2026-10-28 — 정안 시안처럼 뒤집지 않고 바탕으로 강조).
 *
 * `/admin`은 정확히 일치할 때만 켠다 — `startsWith`로 하면 어느 화면에서나
 * 「대시보드」가 같이 켜져 둘이 동시에 눌린 것처럼 보인다.
 *
 * 왼쪽 사이드바(`block`)와 좁은 화면의 가로 메뉴(`inline`) 두 곳에서 쓴다.
 */
export function NavItem({
  href,
  label,
  exact,
  block = false,
}: {
  href: string;
  label: string;
  exact?: boolean;
  block?: boolean;
}) {
  const path = usePathname();
  const on = exact ? path === href : path.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`text-table shrink-0 rounded-lg whitespace-nowrap transition-colors ${
        block ? "block px-3.5 py-2.5" : "px-3.5 py-1.5"
      } ${on ? "" : "hover:bg-(--wash)/60"}`}
      style={{
        background: on ? "var(--wash)" : undefined,
        color: on ? "var(--ink)" : "var(--ink-secondary)",
        fontWeight: on ? 600 : 400,
      }}
    >
      {label}
    </Link>
  );
}
