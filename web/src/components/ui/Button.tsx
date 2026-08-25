import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

/**
 * 버튼 — docs/11-ui-guide.md §2.5
 *
 * ## 링크도 같은 모양을 쓴다 (2026-08-25)
 *
 * 전에는 이 컴포넌트를 **두 곳에서만** 쓰고, `background: var(--series-1)` +
 * `color: #fff`를 **열 곳에서 직접** 적고 있었다. 높이가 `h-12`·`h-13`·`h-14`로
 * 제각각이었고, 색이나 높이를 바꾸려면 열 곳을 찾아다녀야 했다.
 *
 * 눌러서 **가는** 것(링크)과 **하는** 것(버튼)은 하는 일이 다르지만 생김새는
 * 같아야 한다. 그래서 `ButtonLink`를 같은 파일에 두고 같은 표를 쓰게 한다.
 *
 * 크기는 세 단계만 둔다. 화면마다 조금씩 다른 높이를 쓰면 그게 쌓여서
 * 화면이 어수선해진다.
 */

export type Variant = "primary" | "secondary" | "quiet";
export type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-lg font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-series-1 text-white hover:brightness-110",
  // 세로는 작아도 터치 영역은 44px를 유지한다 (01 §2.4)
  secondary: "border border-[--border] bg-surface text-ink hover:bg-page",
  quiet: "text-ink-secondary hover:text-ink",
};

const sizes: Record<Size, string> = {
  /** 44px — 목록 안, 폼 옆 */
  md: "h-11 min-h-11 px-4",
  /** 52px — 화면의 주 동작 */
  lg: "text-item h-13 px-6",
};

const classesFor = (variant: Variant, size: Size, extra: string) =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={classesFor(variant, size, className)} {...rest} />;
}

/** 생김새는 버튼, 하는 일은 이동 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
}) {
  return <Link href={href} className={classesFor(variant, size, className)} {...rest} />;
}
