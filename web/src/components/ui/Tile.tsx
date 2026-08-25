import Link from "next/link";

/**
 * 숫자 타일 — 대시보드와 분석 화면 맨 위의 그 칸.
 *
 * **두 화면에 똑같은 것이 두 벌 있었다** (2026-08-25 정리). 한쪽에서 색을
 * 바꾸면 다른 쪽은 그대로 남아 화면마다 다른 모양이 된다.
 *
 * `href`를 주면 **누를 수 있는 타일**이 된다. 숫자만 보여주고 끝내면
 * 「37명이 했다는데 누구지?」에서 화면을 다시 뒤져야 한다. 세는 자리에서
 * 바로 명단으로 넘어가는 것이 자연스럽다.
 */
export function Tile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="mt-1 text-5xl font-semibold">{value}</p>
      {hint && (
        <p className="text-axis text-ink-muted mt-2">
          {hint}
          {href && <span aria-hidden> →</span>}
        </p>
      )}
    </>
  );

  const style = { background: "var(--wash)" };
  return href ? (
    <Link
      href={href}
      className="block rounded-xl p-6 transition hover:brightness-95"
      style={style}
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-xl p-6" style={style}>
      {body}
    </div>
  );
}
