"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 결과지를 **장(page)으로 넘겨 본다** (2026-09-18 사용자 결정).
 *
 * ## 왜 장으로 나누나
 *
 * 전에는 한눈에·7축 상세·조합·안내가 화면 대여섯 장 길이로 한 줄에 이어졌다.
 * 실제 결과지는 그렇게 읽히지 않는다 — **첫 장에 요약이 다 들어오고**, 나머지는
 * 장을 넘겨 본다. 그래서 위에 탭 줄을 두고, 화면 양옆에 ‹ › 넘김을 둔다.
 *
 * ## 넘김의 느낌 (2026-09-18 사용자 요청으로 손봄)
 *
 *  - **순환한다.** 마지막 장에서 › 는 첫 장으로, 첫 장에서 ‹ 는 마지막 장으로.
 *    끝에서 버튼이 죽어 있으면 책장이 아니라 슬라이드처럼 느껴진다.
 *  - **밀려 들어온다.** 다음 장은 오른쪽에서, 이전 장은 왼쪽에서 살짝 밀려
 *    들어오며 나타난다(`globals.css` 의 `page-in-*`). 움직임을 줄이도록 설정한
 *    사람에게는 걸지 않는다.
 *  - 양옆 버튼은 배경(모래색)과 구분되게 진한 색으로, 너무 크지 않게.
 *
 * ## 주소 — `?p=N`
 *
 * 현재 장을 `?p=1`·`?p=2`… 로 남긴다. **hash 가 아니라 query 인 이유**: 서버는
 * `#hash` 를 못 보지만 `?p=` 는 읽을 수 있어, 새로고침이나 공유 링크로 열어도
 * 그 장이 **서버에서 바로 그려진다**. `#pN` 링크(차트의 「바로 가기」)도 받는다.
 *
 * ## 인쇄
 *
 * 화면에서는 현재 장만 그리지만 DOM 에는 전부 있다. 인쇄할 때는 전 장이
 * 이어서 나온다. 넘김 UI 는 숨긴다.
 */

export type BookPage = { key: string; label: string; content: ReactNode };

type Dir = "next" | "prev";

export function ResultBook({
  pages,
  initial = 0,
}: {
  pages: BookPage[];
  /** 처음 펼 장(0부터). 서버가 `?p=` 를 읽어 넘겨주므로 그 장이 바로 그려진다 */
  initial?: number;
}) {
  const count = pages.length;
  const wrap = (n: number) => ((n % count) + count) % count;

  const [i, setI] = useState(() => wrap(initial));
  const iRef = useRef(i);
  iRef.current = i;

  /** 방금 들어온 장과 방향 — 전환 효과를 한 번만 건다 */
  const [enter, setEnter] = useState<{ key: string; dir: Dir } | null>(null);

  const go = useCallback(
    (n: number, dir?: Dir) => {
      const c = wrap(n);
      if (c === iRef.current) return;
      const d: Dir = dir ?? (c > iRef.current ? "next" : "prev");
      setI(c);
      setEnter({ key: pages[c].key, dir: d });
      // 서버도 읽을 수 있는 `?p=N` 으로 남긴다 — 새로고침해도 그 장이다
      history.replaceState(null, "", `?p=${c + 1}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, pages],
  );

  // `#pN` 링크(차트의 「바로 가기」 등)로도 넘어간다
  useEffect(() => {
    const fromHash = () => {
      const m = /^#p(\d+)$/.exec(window.location.hash);
      if (m) go(Number(m[1]) - 1);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [go]);

  // 키보드 ← → 로도 넘긴다. 입력칸 안에서는 건드리지 않는다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
        return;
      if (e.key === "ArrowRight") go(iRef.current + 1, "next");
      if (e.key === "ArrowLeft") go(iRef.current - 1, "prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const prev = pages[wrap(i - 1)];
  const next = pages[wrap(i + 1)];

  const edge =
    "result-book-nav fixed top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-1.5 lg:flex";
  const circle =
    "flex size-11 items-center justify-center rounded-full text-2xl leading-none shadow-md transition hover:scale-105";
  const circleStyle = { background: "var(--ink)", color: "var(--page)" } as const;

  return (
    <div className="result-book">
      {/* ── 탭 줄 ── */}
      <nav
        className="result-book-nav mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[--border] pb-4"
        aria-label="결과지 장"
      >
        <div role="tablist" className="text-axis flex flex-wrap gap-1.5">
          {pages.map((p, n) => (
            <button
              key={p.key}
              role="tab"
              type="button"
              aria-selected={n === i}
              onClick={() => go(n)}
              className="rounded-md px-3 py-1.5 transition"
              style={{
                background: n === i ? "var(--ink)" : "var(--wash)",
                color: n === i ? "var(--page)" : "var(--ink-secondary)",
                fontWeight: n === i ? 600 : 400,
              }}
            >
              <span className="tabular mr-1.5 opacity-70">{n + 1}</span>
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-axis text-ink-muted tabular">
          {i + 1} / {count}
        </span>
      </nav>

      {/* ── 장 — 화면엔 현재 장만, DOM 엔 전부 (인쇄용) ── */}
      {pages.map((p, n) => (
        <section
          key={p.key}
          className={`result-page${
            enter?.key === p.key && n === i ? ` result-page-enter-${enter.dir}` : ""
          }`}
          data-inactive={n === i ? undefined : "true"}
          aria-hidden={n !== i}
          onAnimationEnd={() => setEnter(null)}
        >
          {p.content}
        </section>
      ))}

      {/* ── 양옆 넘김 (넓은 화면). 끝에서도 반대편 장으로 이어진다 ── */}
      <button
        type="button"
        className={`${edge} left-3 xl:left-5`}
        onClick={() => go(i - 1, "prev")}
        aria-label={`이전 장: ${prev.label}`}
      >
        <span className={circle} style={circleStyle}>
          ‹
        </span>
        <span className="text-axis text-ink-secondary max-w-[6.5rem] text-center leading-tight">
          {prev.label}
        </span>
      </button>
      <button
        type="button"
        className={`${edge} right-3 xl:right-5`}
        onClick={() => go(i + 1, "next")}
        aria-label={`다음 장: ${next.label}`}
      >
        <span className={circle} style={circleStyle}>
          ›
        </span>
        <span className="text-axis text-ink-secondary max-w-[6.5rem] text-center leading-tight">
          {next.label}
        </span>
      </button>

      {/* ── 아래 넘김 줄 (좁은 화면) ── */}
      <div
        className="result-book-nav fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-[--border] px-4 py-3 lg:hidden"
        style={{ background: "var(--page)" }}
      >
        <button
          type="button"
          onClick={() => go(i - 1, "prev")}
          className="text-table flex items-center gap-2"
        >
          <span className="text-2xl leading-none">‹</span>
          <span>{prev.label}</span>
        </button>
        <span className="text-axis text-ink-muted tabular">
          {i + 1} / {count}
        </span>
        <button
          type="button"
          onClick={() => go(i + 1, "next")}
          className="text-table flex items-center gap-2"
        >
          <span>{next.label}</span>
          <span className="text-2xl leading-none">›</span>
        </button>
      </div>
    </div>
  );
}
