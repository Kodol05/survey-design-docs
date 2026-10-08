import Link from "next/link";
import { panelClass } from "./Panel";

/**
 * 숫자 카드 — 대시보드 맨 위의 그 칸.
 *
 * `href`를 주면 **누를 수 있는 카드**가 된다. 숫자만 보여주고 끝내면
 * 「37명이 했다는데 누구지?」에서 화면을 다시 뒤져야 한다. 세는 자리에서
 * 바로 명단으로 넘어가는 것이 자연스럽다.
 *
 * ## 카드로 (2026-10-07)
 *
 * 다른 카드와 같은 겉모양을 쓴다. 아이콘은 넣지 않는다(사용자 결정).
 * 살펴볼 것이 있으면(`warn`) 왼쪽 끝에 주황 띠를 둘러 눈에 걸리게 한다 —
 * 색만으로 말하지 않도록 숫자 아래 글자가 같이 간다.
 */
export function Tile({
  label,
  value,
  hint,
  href,
  warn = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  warn?: boolean;
}) {
  const body = (
    <>
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="tabular mt-1 text-4xl font-semibold">{value}</p>
      {hint && (
        <p className="text-axis text-ink-muted mt-1.5">
          {hint}
          {href && <span aria-hidden> →</span>}
        </p>
      )}
    </>
  );

  const cls = `${panelClass} relative block overflow-hidden px-5 py-4`;
  const band = warn && (
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 w-1"
      style={{ background: "var(--status-warn)" }}
    />
  );

  return href ? (
    <Link href={href} className={`${cls} transition hover:brightness-[0.98]`}>
      {band}
      {body}
    </Link>
  ) : (
    <div className={cls}>
      {band}
      {body}
    </div>
  );
}
