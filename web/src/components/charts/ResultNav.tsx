"use client";

import { useEffect, useState } from "react";

/**
 * 결과지 목차 — 지금 어디를 읽고 있는지 보여준다.
 *
 * ## 왜 필요한가
 *
 * 결과지가 화면 대여섯 개 분량으로 이어진다. 7축 상세에 4쌍 해석까지 붙으면
 * **어디쯤인지도, 아까 본 축으로 돌아가는 방법도** 없다. 스크롤을 위아래로
 * 헤매게 된다.
 *
 * ## 탭으로 나누지 않는다
 *
 * 결과지는 **한 번 처음부터 끝까지 읽는 글**이다. 탭으로 쪼개면 사람이
 * 전체를 훑지 않고 첫 탭만 보고 나간다. 흐름은 그대로 두고 **길잡이만**
 * 붙인다.
 *
 * 화면이 좁으면 숨는다 — 목차가 본문 폭을 먹으면 정작 읽을 것이 좁아진다.
 */
export type NavItem = { id: string; label: string };

export function ResultNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    /*
      화면 위쪽 1/3 안에 들어온 절 중 **가장 아래**를 현재로 본다.
      가장 위를 고르면 다음 절이 화면을 거의 다 채운 뒤에야 바뀌어
      한 박자 늦게 따라온다.
    */
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
        if (seen.length) setActive(seen[seen.length - 1]);
      },
      { rootMargin: "0px 0px -67% 0px" },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="결과 목차"
      className="sticky top-8 hidden xl:block"
      data-print="hide"
    >
      <p className="text-axis text-ink-muted mb-3">목차</p>
      <ul className="flex flex-col gap-0.5">
        {items.map((it) => {
          const on = active === it.id;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={on ? "true" : undefined}
                className="text-axis block rounded-md py-1.5 pl-3 transition-colors"
                style={{
                  borderLeft: `2px solid ${on ? "var(--series-1)" : "transparent"}`,
                  color: on ? "var(--ink)" : "var(--ink-muted)",
                  fontWeight: on ? 600 : 400,
                }}
              >
                {it.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
