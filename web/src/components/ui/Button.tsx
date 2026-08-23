"use client";

import type { ButtonHTMLAttributes } from "react";

/**
 * 버튼 — docs/11-ui-guide.md §2.5
 * 주 동작 44px / 보조 36px. 터치 타깃 44×44 유지 (01 §2.4)
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
};

const base =
  "inline-flex items-center justify-center rounded-lg px-4 font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  // 44px
  primary: "h-11 bg-series-1 text-white hover:brightness-110",
  // 36px — 세로는 작아도 터치 영역은 44px를 유지한다
  secondary:
    "h-9 min-h-11 sm:min-h-9 border border-[--border] bg-surface text-ink hover:bg-page",
  quiet: "h-9 min-h-11 sm:min-h-9 text-ink-secondary hover:text-ink",
} as const;

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}
