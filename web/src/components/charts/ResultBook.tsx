"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

/**
 * 결과지를 **장(page)으로 넘겨 본다** (2026-09-18 사용자 결정).
 *
 * ## 왜 장으로 나누나
 *
 * 전에는 한눈에·7축 상세·조합·안내가 화면 대여섯 장 길이로 한 줄에 이어졌다.
 * 실제 결과지는 그렇게 읽히지 않는다 — **첫 장에 요약이 다 들어오고**, 나머지는
 * 장을 넘겨 본다. 그래서 위에 탭 줄을 두고, 화면 양옆에 **큰 ‹ › 넘김**을 둔다.
 * 탭만으로 넘기게 하지 않는 이유는 사용자 요청이다 — 책장 넘기듯 좌우로 오가야
 * 다음 장이 있다는 것이 보인다.
 *
 * ## 주소 — `?p=N`
 *
 * 현재 장을 `?p=1`·`?p=2`… 로 남긴다. **hash 가 아니라 query 인 이유**: 서버는
 * `#hash` 를 못 보지만 `?p=` 는 읽을 수 있어, 새로고침이나 공유 링크로 열어도
 * 그 장이 **서버에서 바로 그려진다** — hash 로 두면 자바스크립트가 뜰 때까지
 * 1장이 먼저 보였다가 튀는 게 눈에 띄었다. `#pN` 링크(차트의 「바로 가기」)도
 * 그대로 받아 넘어간다.
 *
 * ## 인쇄
 *
 * 화면에서는 현재 장만 그리지만 DOM 에는 전부 있다. 인쇄할 때는 전 장이
 * 이어서 나온다 (`globals.css` 의 `.result-page` 규칙). 넘김 UI 는 숨긴다.
 */

export type BookPage = { key: string; label: string; content: ReactNode };

export function ResultBook({
  pages,
  initial = 0,
}: {
  pages: BookPage[];
  /** 처음 펼 장(0부터). 서버가 `?p=` 를 읽어 넘겨주므로 그 장이 바로 그려진다 */
  initial?: number;
}) {
  const last = pages.length - 1;
  const [i, setI] = useState(() => Math.max(0, Math.min(last, initial)));

  const go = useCallback(
    (n: number, scroll = true) => {
      const c = Math.max(0, Math.min(last, n));
      setI(c);
      // 서버도 읽을 수 있는 `?p=N` 으로 남긴다 — 새로고침해도 그 장이다
      history.replaceState(null, "", `?p=${c + 1}`);
      if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [last],
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
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  const prev = i > 0 ? pages[i - 1] : null;
  const next = i < last ? pages[i + 1] : null;

  const edgeBtn =
    "result-book-nav fixed top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 lg:flex";
  const circle =
    "flex size-14 items-center justify-center rounded-full border text-3xl leading-none transition disabled:opacity-30";

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
          {i + 1} / {pages.length}
        </span>
      </nav>

      {/* ── 장 — 화면엔 현재 장만, DOM 엔 전부 (인쇄용) ── */}
      {pages.map((p, n) => (
        <section
          key={p.key}
          className="result-page"
          data-inactive={n === i ? undefined : "true"}
          aria-hidden={n !== i}
        >
          {p.content}
        </section>
      ))}

      {/* ── 양옆 큰 넘김 (넓은 화면) ── */}
      <button
        type="button"
        className={`${edgeBtn} left-3 xl:left-6`}
        onClick={() => go(i - 1)}
        disabled={!prev}
        aria-label={prev ? `이전 장: ${prev.label}` : "첫 장입니다"}
      >
        <span
          className={circle}
          style={{ background: "var(--wash)", borderColor: "var(--border)", color: "var(--ink)" }}
        >
          ‹
        </span>
        <span className="text-axis text-ink-muted max-w-[7rem] text-center leading-tight">
          {prev ? prev.label : ""}
        </span>
      </button>
      <button
        type="button"
        className={`${edgeBtn} right-3 xl:right-6`}
        onClick={() => go(i + 1)}
        disabled={!next}
        aria-label={next ? `다음 장: ${next.label}` : "마지막 장입니다"}
      >
        <span
          className={circle}
          style={{ background: "var(--wash)", borderColor: "var(--border)", color: "var(--ink)" }}
        >
          ›
        </span>
        <span className="text-axis text-ink-muted max-w-[7rem] text-center leading-tight">
          {next ? next.label : ""}
        </span>
      </button>

      {/* ── 아래 넘김 줄 (좁은 화면) ── */}
      <div
        className="result-book-nav fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-[--border] px-4 py-3 lg:hidden"
        style={{ background: "var(--page)" }}
      >
        <button
          type="button"
          onClick={() => go(i - 1)}
          disabled={!prev}
          className="text-table flex items-center gap-2 disabled:opacity-30"
        >
          <span className="text-2xl leading-none">‹</span>
          <span>{prev ? prev.label : "처음"}</span>
        </button>
        <span className="text-axis text-ink-muted tabular">
          {i + 1} / {pages.length}
        </span>
        <button
          type="button"
          onClick={() => go(i + 1)}
          disabled={!next}
          className="text-table flex items-center gap-2 disabled:opacity-30"
        >
          <span>{next ? next.label : "끝"}</span>
          <span className="text-2xl leading-none">›</span>
        </button>
      </div>
    </div>
  );
}
