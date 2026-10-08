"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 목록 화면의 도구줄 — 검색 · 고르개 칩 · 열 머리글을 **카드 하나**로 묶고
 * 스크롤을 따라 위에 붙어 다닌다 (2026-10-07 사용자 결정).
 *
 * ## 왜 붙여 두는가
 *
 * 구성원 50명, 문항 120개를 내려 보다 보면 **지금 무엇으로 줄 세워 봤는지,
 * 이 칸이 어느 축인지**를 잊는다. 그때마다 맨 위로 올라가야 했다. 열 머리글을
 * 카드 아래 끝에 붙여 같이 따라오게 하면 그 왕복이 없어진다.
 *
 * ## 내려가면 접고, 다가가면 편다
 *
 * 칩을 다 펼친 채 붙어 다니면 화면 위 3분의 1을 늘 잡아먹는다. 그래서
 * 제자리를 지나 내려가면 칩 묶음을 접고 `정렬: 최근 응시순 ▼` 같은 한 줄
 * 요약만 검색 칸 옆에 남긴다.
 *
 *  - **맨 위에서는 늘 펼친다.** 제자리에 있을 때 접을 이유가 없다.
 *  - 마우스가 카드에 들어오면 펼치고, 나가면
 *    200ms 뒤에 다시 접는다 — 칩 사이를 지나가다 잠깐 벗어나도 덜컥이지 않게.
 *  - 키보드로 안에 들어오면(`:focus-visible`) 펼친다. 접힌 칩은 `inert`라
 *    탭이 건너뛰므로, 요약 단추에 닿는 순간 펼쳐지고 다음 탭이 칩으로 간다.
 *  - 터치에는 「다가감」이 없다. 요약을 누르면 펴고, 다시 누르면 접는다.
 *  - `prefers-reduced-motion`이면 움직임 없이 바로 바뀐다.
 *
 * ## 접어도 아래 목록이 튀지 않게
 *
 * 붙는 요소(`sticky`)는 흐름 안에 자리를 차지한다. 접힐 때 키가 줄면 아래
 * 목록 전체가 그만큼 위로 **덜컥 올라간다.** 그래서 줄어든 만큼을 아래
 * 바깥 여백으로 채운다 — 키 + 여백이 늘 같아서 흐름은 그대로이고, 펼칠 때는
 * 카드가 목록 **위로 덮이며** 자란다.
 *
 * 제자리를 지났는지는 카드 바로 앞에 둔 1px 표지를 `IntersectionObserver`로
 * 본다. 표지는 카드 앞에 있어 카드 키가 바뀌어도 자리가 안 움직이므로,
 * 접고 펴는 것이 다시 판정을 뒤집는 일이 없다.
 *
 * 접힌 키(검색 줄 + 머리글)는 `--sticky-toolbar-h`로 문서에 적어 둔다.
 * 목록 줄이 `scroll-margin-top`으로 이 값을 써서, 펼친 사람의 윗변이
 * 도구줄 바로 아래에 오게 맞춘다.
 */
export function StickyToolbar({
  label,
  search,
  summary,
  end,
  header,
  children,
}: {
  /** 화면 읽기용 이름 — 「구성원 목록 도구」 */
  label: string;
  /** 늘 보이는 왼쪽 — 검색 칸 */
  search: React.ReactNode;
  /** 접혔을 때 검색 칸 옆에 남는 한 줄 */
  summary: React.ReactNode;
  /** 늘 보이는 오른쪽 끝 — 걸러진 개수 등 */
  end?: React.ReactNode;
  /** 카드 아래 끝에 붙는 열 머리글 (`bg-card-head`) */
  header?: React.ReactNode;
  /** 접히는 칩 묶음 */
  children: React.ReactNode;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | null>(null);
  /** 요약 단추를 누른 손가락이 터치였는가 — 마우스 클릭은 펴고 접기에 쓰지 않는다 */
  const lastPointer = useRef<string>("mouse");

  const [stuck, setStuck] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  /** 칩 묶음이 펼쳐졌을 때의 키(px) — 접힌 만큼 바깥 여백으로 채우는 데 쓴다 */
  const [chipsH, setChipsH] = useState(0);

  const expanded = !stuck || hovered || focused || touchOpen;

  // ── 제자리를 지났는가 ─────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const sticky = stickyRef.current;
    if (!sentinel || !sticky) return;

    let io: IntersectionObserver | null = null;
    const watch = () => {
      io?.disconnect();
      // 붙는 높이(`--admin-top` + 틈)는 화면 폭마다 다르다 — 계산된 `top`을 그대로 읽는다
      const top = parseFloat(getComputedStyle(sticky).top) || 0;
      io = new IntersectionObserver(
        ([e]) => {
          const past =
            !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? top);
          setStuck(past);
          // 맨 위로 돌아오면 터치로 펴 둔 것도 풀어 둔다
          if (!past) setTouchOpen(false);
        },
        { rootMargin: `-${Math.round(top)}px 0px 0px 0px`, threshold: 0 },
      );
      io.observe(sentinel);
    };
    watch();
    window.addEventListener("resize", watch);
    return () => {
      io?.disconnect();
      window.removeEventListener("resize", watch);
    };
  }, []);

  // ── 키 재기 ────────────────────────────────────────────────────────────
  useEffect(() => {
    const card = cardRef.current;
    const region = regionRef.current;
    const content = contentRef.current;
    if (!card || !region || !content) return;
    const root = document.documentElement;
    const measure = () => {
      setChipsH(content.offsetHeight);
      /*
        카드 키 − 지금 칩 칸 키 = 늘 보이는 부분(검색 줄 + 머리글)의 키.
        접고 펴는 도중에 재도 이 차이는 변하지 않는다.
      */
      root.style.setProperty(
        "--sticky-toolbar-h",
        `${card.offsetHeight - region.offsetHeight}px`,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    ro.observe(content);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--sticky-toolbar-h");
    };
  }, []);

  useEffect(
    () => () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  const cancelLeave = () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px -mb-px" />
      <div
        ref={stickyRef}
        className="sticky z-20 transition-[margin-bottom] duration-200 ease-out motion-reduce:transition-none"
        style={{
          top: "calc(var(--admin-top) + 0.5rem)",
          // 접힌 만큼 바깥 여백으로 채워 아래 목록이 움직이지 않게 한다
          marginBottom: `calc(0.75rem + ${expanded ? 0 : chipsH}px)`,
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "touch") return;
          cancelLeave();
          setHovered(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "touch") return;
          cancelLeave();
          leaveTimer.current = window.setTimeout(() => setHovered(false), 200);
        }}
        onFocus={(e) => {
          /*
            마우스로 칩을 누르면 초점이 그 링크에 남는다 — 그걸 「안에 있다」로
            치면 마우스가 떠나도 안 접힌다. 키보드로 온 초점만 센다.
            검색 칸은 접혀도 보이는 자리라 칩을 펼 까닭이 없다.
          */
          const t = e.target as HTMLElement;
          setFocused(t.matches(":focus-visible") && t.tagName !== "INPUT");
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        {/*
          붙어 있는 동안 카드 위 틈으로 지나가는 목록 줄이 비치지 않게
          바탕색으로 가린다. 제자리에서는 필요 없다.
        */}
        {stuck && (
          <div
            aria-hidden
            className="bg-canvas absolute -right-2 bottom-full -left-2 h-2"
          />
        )}

        <div
          ref={cardRef}
          role="region"
          aria-label={label}
          className="bg-card overflow-hidden rounded-xl border border-(--border) shadow-(--card-shadow)"
        >
          {/* ── 늘 보이는 줄: 검색 · 요약 · 끝 ── */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
            {search}
            {stuck && (
              <button
                type="button"
                aria-expanded={expanded}
                onPointerDown={(e) => {
                  lastPointer.current = e.pointerType;
                }}
                onClick={() => {
                  // 마우스는 이미 다가가며 펼쳤다. 터치만 눌러서 펴고 접는다
                  if (lastPointer.current === "touch") setTouchOpen((v) => !v);
                }}
                className="text-axis text-ink-secondary hover:text-ink truncate text-left"
              >
                {summary}
              </button>
            )}
            {end && <div className="text-axis text-ink-muted ml-auto">{end}</div>}
          </div>

          {/* ── 접히는 칩 묶음 ── */}
          <div
            ref={regionRef}
            inert={!expanded}
            className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
            style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
          >
            <div className="min-h-0 overflow-hidden">
              <div ref={contentRef} className="px-5 pt-1 pb-4">
                {children}
              </div>
            </div>
          </div>

          {header && (
            <div className="bg-card-head border-t border-(--border)">{header}</div>
          )}
        </div>

        {/*
          카드 아래에 보이지 않는 「다가감」 띠를 두었다가 뺐다 (2026-10-07 점검).
          그 띠가 바로 아래 목록 줄 윗부분의 클릭을 가로챘다. 떠날 때의 200ms
          여유만으로 칩 사이를 오가는 데는 충분하다.
        */}
      </div>
    </>
  );
}
