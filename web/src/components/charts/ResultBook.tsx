"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 결과지를 **장(page)으로 넘겨 본다** (2026-09-18 사용자 결정).
 *
 * ## 종이 한 장 위에
 *
 * 결과지는 위 머리와 같은 폭의 **종이**(`.result-sheet`)에 얹혀 있다. 종이
 * 위에는 장 탭과 본문, 아래에는 행동 버튼과 「이전 / 다음」 줄이 있고, 종이
 * 바깥 여백에 ‹ › 넘김 버튼이 떠 있다. 첫 장에 요약이 다 들어오고, 나머지는
 * 넘겨 본다.
 *
 * ## 넘김
 *
 *  - **순환한다.** 마지막 장에서 › 는 첫 장으로, 첫 장에서 ‹ 는 마지막 장으로.
 *  - **밀려 들어온다.** 다음 장은 오른쪽에서, 이전 장은 왼쪽에서(`page-in-*`).
 *    움직임을 줄이도록 설정한 사람에게는 걸지 않는다.
 *  - 키보드 ← → 도 된다.
 *
 * ## 주소 — `?p=N`
 *
 * 서버가 `?p=` 를 읽어 그 장을 바로 그리므로 새로고침·공유 링크에도 맞다.
 * `#pN` 링크(차트 「바로 가기」)도 받는다.
 *
 * ## 인쇄
 *
 * 화면엔 현재 장만, DOM 엔 전부. 인쇄하면 전 장이 이어서 나오고 넘김 UI 는 숨는다.
 */

export type BookPage = { key: string; label: string; content: ReactNode };

type Dir = "next" | "prev";

export function ResultBook({
  pages,
  initial = 0,
  action,
}: {
  pages: BookPage[];
  /** 처음 펼 장(0부터). 서버가 `?p=` 를 읽어 넘겨준다 */
  initial?: number;
  /** 모든 장 오른쪽 아래에 두는 행동 버튼 (예: 다시 응시하기) */
  action?: ReactNode;
}) {
  const count = pages.length;
  const wrap = (n: number) => ((n % count) + count) % count;

  const [i, setI] = useState(() => wrap(initial));
  // 콜백(키보드·해시)이 최신 장 번호를 읽기 위한 거울 — 그리는 중이 아니라 커밋 뒤에 맞춘다
  const iRef = useRef(i);
  useEffect(() => {
    iRef.current = i;
  }, [i]);

  /** 방금 들어온 장과 방향 — 전환 효과를 한 번만 건다 */
  const [enter, setEnter] = useState<{ key: string; dir: Dir } | null>(null);

  /*
    양옆 ‹ › 는 **종이의 실제 위치를 재서** 놓는다 (2026-09-18 사용자 지적).
    화면 폭(100vw)으로 계산하면 세로 스크롤바 폭과 안쪽 여백 차이 때문에
    오른쪽이 어긋나 좌우가 달라 보였다. 종이 양끝에서 같은 거리에 두고,
    여백이 모자라면 아예 숨긴다(아래 넘김 줄·탭·키보드가 남는다).
  */
  const sheetRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<{ left: number; right: number } | null>(null);
  useEffect(() => {
    // 버튼 상자는 **고정 폭 96px** — 원과 이름표를 그 안에 가운데 놓는다.
    // 이름표 글자 길이에 따라 상자 폭이 달라지면 장마다 위치가 밀렸다(사용자 지적).
    const GAP = 12; // 종이 끝 ↔ 상자
    const BOX = 96; // 상자 폭 (w-24)
    const measure = () => {
      const r = sheetRef.current?.getBoundingClientRect();
      if (!r) return;
      // `right:` 는 스크롤바를 뺀 레이아웃 폭 기준이므로 clientWidth 로 잰다
      const vw = document.documentElement.clientWidth;
      setEdges({ left: r.left - GAP - BOX, right: vw - r.right - GAP - BOX });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const showEdges = !!edges && edges.left >= 8 && edges.right >= 8;

  const go = useCallback(
    (n: number, dir?: Dir) => {
      const c = wrap(n);
      if (c === iRef.current) return;
      const d: Dir = dir ?? (c > iRef.current ? "next" : "prev");
      setI(c);
      setEnter({ key: pages[c].key, dir: d });
      history.replaceState(null, "", `?p=${c + 1}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, pages],
  );

  useEffect(() => {
    const fromHash = () => {
      const m = /^#p(\d+)$/.exec(window.location.hash);
      if (m) go(Number(m[1]) - 1);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [go]);

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

  const edge = `result-book-nav fixed top-1/2 z-20 w-24 -translate-y-1/2 flex-col items-center gap-1 ${
    showEdges ? "flex" : "hidden"
  }`;
  const circle =
    "flex size-10 items-center justify-center rounded-full text-xl leading-none shadow-md transition hover:scale-105";
  const circleStyle = { background: "var(--ink)", color: "var(--page)" } as const;
  const edgeLabel = "text-axis text-ink-secondary w-full truncate text-center";

  return (
    <div className="result-book">
      <div className="result-sheet" ref={sheetRef}>
        {/* ── 장 탭 ── */}
        <nav
          className="result-book-nav mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[--border] pb-3"
          aria-label="결과지 장"
        >
          <div role="tablist" className="text-axis flex flex-wrap gap-1">
            {pages.map((p, n) => (
              <button
                key={p.key}
                role="tab"
                type="button"
                id={`tab-${p.key}`}
                aria-controls={`page-${p.key}`}
                aria-selected={n === i}
                onClick={() => go(n)}
                className="rounded-md px-2.5 py-1 transition"
                style={{
                  background: n === i ? "var(--ink)" : "transparent",
                  color: n === i ? "var(--page)" : "var(--ink-secondary)",
                  fontWeight: n === i ? 600 : 500,
                }}
              >
                <span className="tabular mr-1 opacity-60">{n + 1}</span>
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
            id={`page-${p.key}`}
            role="tabpanel"
            aria-labelledby={`tab-${p.key}`}
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

        {/* ── 행동 버튼 — 어느 장에서든 오른쪽 아래 (2026-09-18 사용자 요청) ── */}
        {action && (
          <div className="mt-8 flex justify-end" data-print="hide">
            {action}
          </div>
        )}

        {/* ── 종이 아래 넘김 줄 — 읽고 내려오면 바로 다음 장 ── */}
        <div className="result-book-nav text-table mt-5 flex items-center justify-between gap-4 border-t border-[--border] pt-4">
          <button
            type="button"
            onClick={() => go(i - 1, "prev")}
            className="text-ink-secondary hover:text-ink flex items-center gap-2 transition"
          >
            <span aria-hidden>‹</span>
            <span>
              <span className="text-ink-muted">이전 · </span>
              {prev.label}
            </span>
          </button>
          <span className="text-axis text-ink-muted tabular">
            {i + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => go(i + 1, "next")}
            className="text-ink-secondary hover:text-ink flex items-center gap-2 transition"
          >
            <span>
              <span className="text-ink-muted">다음 · </span>
              {next.label}
            </span>
            <span aria-hidden>›</span>
          </button>
        </div>
      </div>

      {/* ── 종이 바깥 ‹ › (넓은 화면) ── */}
      <button
        type="button"
        className={edge}
        style={{ left: edges?.left ?? 0 }}
        onClick={() => go(i - 1, "prev")}
        aria-label={`이전 장: ${prev.label}`}
      >
        <span className={circle} style={circleStyle}>
          ‹
        </span>
        <span className={edgeLabel}>{prev.label}</span>
      </button>
      <button
        type="button"
        className={edge}
        style={{ right: edges?.right ?? 0 }}
        onClick={() => go(i + 1, "next")}
        aria-label={`다음 장: ${next.label}`}
      >
        <span className={circle} style={circleStyle}>
          ›
        </span>
        <span className={edgeLabel}>{next.label}</span>
      </button>

      {/* ── 아래 고정 줄 (좁은 화면) ── */}
      <div
        className="result-book-nav fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-[--border] px-4 py-2.5 lg:hidden"
        style={{ background: "var(--page)" }}
      >
        <button
          type="button"
          onClick={() => go(i - 1, "prev")}
          className="text-table flex items-center gap-2"
        >
          <span className="text-xl leading-none">‹</span>
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
          <span className="text-xl leading-none">›</span>
        </button>
      </div>
    </div>
  );
}
