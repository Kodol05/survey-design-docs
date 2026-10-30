"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { smoothScrollTo } from "@/lib/smoothScroll";

/**
 * 결과지를 **장(page)으로 넘겨 본다** (2026-09-18 사용자 결정).
 *
 * ## 옆으로 넘기는 종이 (2026-10-30 사용자 요청 — 소시모 시안의 카드 넘김처럼)
 *
 * 장마다 **종이**(`.result-sheet`) 한 장씩이다. 지금 장은 가운데에 또렷하게,
 * 이전 장과 다음 장은 양옆 여백에 **가장자리만 살짝** 보이게 흐리고 조금 작게
 * 둔다. 넘기면 종이들이 옆으로 미끄러져 다음 장이 가운데로 온다. 옆의 흐린
 * 종이를 눌러도 그 장으로 간다.
 *
 * 종이 위에는 장 탭과 본문, 아래에는 행동 버튼과 「이전 / 다음」 줄이 있고,
 * 종이 바깥 여백에 ‹ › 넘김 버튼이 떠 있다. 옆 종이에도 같은 것이 그려지지만
 * 누를 수 없고(`inert`) 화면 낭독기도 읽지 않는다.
 *
 * 높이는 **지금 장이 정한다.** 지금 장만 흐름 안에 두고 옆 장은 그 위에
 * 겹쳐 띄워, 짧은 장을 볼 때 긴 장 때문에 아래가 비지 않게 한다.
 *
 * ## 넘김
 *
 *  - **순환한다.** 마지막 장에서 › 는 첫 장으로, 첫 장에서 ‹ 는 마지막 장으로.
 *    그래서 첫 장에서도 왼쪽에 마지막 장이 보인다.
 *  - 윈도우의 「애니메이션 끄기」와 상관없이 늘 움직인다 (2026-10-30 사용자 결정).
 *  - 키보드 ← → 도 된다.
 *
 * ## 주소 — `?p=N`
 *
 * 서버가 `?p=` 를 읽어 그 장을 바로 그리므로 새로고침·공유 링크에도 맞다.
 * `#pN` 링크(차트 「바로 가기」)도 받는다.
 *
 * ## 인쇄
 *
 * 화면엔 종이를 옆으로 늘어놓지만 인쇄하면 전 장이 위아래로 이어서 나오고
 * 넘김 UI 는 숨는다.
 */

export type BookPage = { key: string; label: string; content: ReactNode };

/** 옆 종이 사이 간격 */
const SLIDE_GAP = "2rem";
const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ResultBook({
  pages,
  initial = 0,
  action,
  sideNav = true,
}: {
  pages: BookPage[];
  /** 처음 펼 장(0부터). 서버가 `?p=` 를 읽어 넘겨준다 */
  initial?: number;
  /** 모든 장 오른쪽 아래에 두는 행동 버튼 (예: 다시 응시하기) */
  action?: ReactNode;
  /**
   * 종이 바깥 양옆에 떠 있는 ‹ › 와 옆 종이 미리 보기 (기본 켬). 관리자
   * 구성원 상세는 끈다 (2026-10-07) — 왼쪽에 사이드바가 있어 종이 왼쪽
   * 여백에 띄우면 메뉴 위에 겹친다. 그쪽은 장 탭 · 아래 넘김 줄 · 키보드로
   * 넘기고, 넘길 때 종이만 옆으로 미끄러진다.
   */
  sideNav?: boolean;
}) {
  const count = pages.length;
  const wrap = (n: number) => ((n % count) + count) % count;
  /** 지금 장 `at`을 가운데(0)로 둘 때 `n`번 장의 자리: -1 왼쪽, 0 가운데, 1 오른쪽 */
  const half = Math.floor(count / 2);
  const offsetOf = (n: number, at: number) =>
    ((n - at + count + half) % count) - half;

  const [i, setI] = useState(() => wrap(initial));
  /** 바로 앞에 펼쳐 있던 장 — 반대편으로 건너뛰는 종이를 알아보려고 */
  const [from, setFrom] = useState<number | null>(null);
  // 콜백(키보드·해시)이 최신 장 번호를 읽기 위한 거울 — 그리는 중이 아니라 커밋 뒤에 맞춘다
  const iRef = useRef(i);
  useEffect(() => {
    iRef.current = i;
  }, [i]);

  /*
    양옆 ‹ › 는 **종이의 실제 위치를 재서** 놓는다 (2026-09-18 사용자 지적).
    화면 폭(100vw)으로 계산하면 세로 스크롤바 폭과 안쪽 여백 차이 때문에
    오른쪽이 어긋나 좌우가 달라 보였다. 종이 양끝에서 같은 거리에 두고,
    여백이 모자라면 아예 숨긴다(아래 넘김 줄·탭·키보드가 남는다).
  */
  const stageRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<{ left: number; right: number } | null>(null);
  useEffect(() => {
    // 버튼 상자는 **고정 폭 96px** — 원과 이름표를 그 안에 가운데 놓는다.
    // 이름표 글자 길이에 따라 상자 폭이 달라지면 장마다 위치가 밀렸다(사용자 지적).
    const GAP = 12; // 종이 끝 ↔ 상자
    const BOX = 96; // 상자 폭 (w-24)
    const measure = () => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;
      // `right:` 는 스크롤바를 뺀 레이아웃 폭 기준이므로 clientWidth 로 잰다
      const vw = document.documentElement.clientWidth;
      setEdges({ left: r.left - GAP - BOX, right: vw - r.right - GAP - BOX });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const showEdges = sideNav && !!edges && edges.left >= 8 && edges.right >= 8;

  const go = useCallback(
    (n: number) => {
      const c = wrap(n);
      if (c === iRef.current) return;
      setFrom(iRef.current);
      setI(c);
      // `?p=` 만 바꾸고 다른 값(지난 결과 `r`)은 그대로 둔다
      const q = new URLSearchParams(location.search);
      q.set("p", String(c + 1));
      history.replaceState(null, "", `?${q}`);
      smoothScrollTo(0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, pages],
  );

  useEffect(() => {
    const fromHash = () => {
      const m = /^#p(\d+)$/.exec(window.location.hash);
      if (m) go(Number(m[1]) - 1);
      /*
        척도 링크(`#axis-…`)로 들어오면 그 축을 **펼쳐서** 보여 준다
        (2026-10-30 — 척도별 결과는 기본으로 접혀 있다).
      */
      if (window.location.hash.startsWith("#axis-")) {
        const el = document.getElementById(
          decodeURIComponent(window.location.hash.slice(1)),
        );
        if (el instanceof HTMLDetailsElement) {
          el.open = true;
          el.scrollIntoView({ behavior: "instant", block: "start" });
        }
      }
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
      if (e.key === "ArrowRight") go(iRef.current + 1);
      if (e.key === "ArrowLeft") go(iRef.current - 1);
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
    "flex size-10 items-center justify-center rounded-full text-xl leading-none shadow-md transition-opacity hover:opacity-85";
  const circleStyle = { background: "var(--ink)", color: "var(--page)" } as const;
  const edgeLabel = "text-axis text-ink-secondary w-full truncate text-center";

  /** 종이 한 장 — 장 탭 · 본문 · 행동 버튼 · 아래 넘김 줄 */
  const sheet = (n: number, active: boolean) => {
    const p = pages[n];
    const before = pages[wrap(n - 1)];
    const after = pages[wrap(n + 1)];
    return (
      <div className="result-sheet" inert={!active}>
        {/* ── 장 탭 ── */}
        <nav
          className="result-book-nav mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-(--border) pb-3"
          aria-label="결과지 장"
        >
          <div role="tablist" className="text-axis flex flex-wrap gap-1">
            {pages.map((t, k) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                id={active ? `tab-${t.key}` : undefined}
                aria-controls={`page-${t.key}`}
                aria-selected={k === n}
                onClick={() => go(k)}
                className="rounded-md px-2.5 py-1 transition"
                style={{
                  background: k === n ? "var(--ink)" : "transparent",
                  color: k === n ? "var(--page)" : "var(--ink-secondary)",
                  fontWeight: k === n ? 600 : 500,
                }}
              >
                <span className="tabular mr-1 opacity-60">{k + 1}</span>
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-axis text-ink-muted tabular">
            {n + 1} / {count}
          </span>
        </nav>

        <section
          id={`page-${p.key}`}
          role="tabpanel"
          aria-labelledby={active ? `tab-${p.key}` : undefined}
          className="result-page"
        >
          {p.content}
        </section>

        {/* ── 행동 버튼 — 어느 장에서든 오른쪽 아래 (2026-09-18 사용자 요청) ── */}
        {action && (
          <div className="mt-8 flex justify-end" data-print="hide">
            {action}
          </div>
        )}

        {/* ── 종이 아래 넘김 줄 — 읽고 내려오면 바로 다음 장 ── */}
        <div className="result-book-nav text-table mt-5 flex items-center justify-between gap-4 border-t border-(--border) pt-4">
          <button
            type="button"
            onClick={() => go(n - 1)}
            className="text-ink-secondary hover:text-ink flex items-center gap-2 transition"
          >
            <span aria-hidden>‹</span>
            <span>
              <span className="text-ink-muted">이전 · </span>
              {before.label}
            </span>
          </button>
          <span className="text-axis text-ink-muted tabular">
            {n + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => go(n + 1)}
            className="text-ink-secondary hover:text-ink flex items-center gap-2 transition"
          >
            <span>
              <span className="text-ink-muted">다음 · </span>
              {after.label}
            </span>
            <span aria-hidden>›</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="result-book">
      {/* ── 종이들 — 지금 장은 가운데, 이전·다음 장은 양옆에 살짝 ── */}
      <div
        ref={stageRef}
        className="result-stage relative"
        data-peek={sideNav ? "" : undefined}
      >
        {pages.map((p, n) => {
          const off = offsetOf(n, i);
          const active = off === 0;
          const shown = active || (sideNav && Math.abs(off) === 1);
          /*
            반대편으로 **건너뛰는** 종이(예: 세 장에서 왼쪽 → 오른쪽)는 가운데를
            가로질러 날아가지 않게 움직임 없이 자리만 옮긴다.
          */
          const jump = from !== null && Math.abs(off - offsetOf(n, from)) > 1;
          return (
            <div
              key={p.key}
              className="result-slide"
              aria-hidden={!active}
              onClick={active || !shown ? undefined : () => go(n)}
              style={{
                position: active ? "relative" : "absolute",
                top: 0,
                left: 0,
                width: "100%",
                zIndex: active ? 1 : 0,
                transform: `translateX(calc(${off} * (100% + ${SLIDE_GAP}))) scale(${active ? 1 : 0.94})`,
                transformOrigin: off < 0 ? "right center" : off > 0 ? "left center" : "center",
                opacity: active ? 1 : shown ? 0.4 : 0,
                pointerEvents: shown ? "auto" : "none",
                cursor: active ? undefined : "pointer",
                transition: jump
                  ? "none"
                  : `transform 0.55s ${SLIDE_EASE}, opacity 0.55s ${SLIDE_EASE}`,
              }}
            >
              {sheet(n, active)}
            </div>
          );
        })}
      </div>

      {/* ── 종이 바깥 ‹ › (넓은 화면) ── */}
      <button
        type="button"
        className={edge}
        style={{ left: edges?.left ?? 0 }}
        onClick={() => go(i - 1)}
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
        onClick={() => go(i + 1)}
        aria-label={`다음 장: ${next.label}`}
      >
        <span className={circle} style={circleStyle}>
          ›
        </span>
        <span className={edgeLabel}>{next.label}</span>
      </button>

      {/* ── 아래 고정 줄 (좁은 화면) ── */}
      <div
        className="result-book-nav fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-(--border) px-4 py-2.5 lg:hidden"
        style={{ background: "var(--page)" }}
      >
        <button
          type="button"
          onClick={() => go(i - 1)}
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
          onClick={() => go(i + 1)}
          className="text-table flex items-center gap-2"
        >
          <span>{next.label}</span>
          <span className="text-xl leading-none">›</span>
        </button>
      </div>
    </div>
  );
}
