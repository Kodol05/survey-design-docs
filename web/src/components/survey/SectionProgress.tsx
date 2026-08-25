"use client";

import { useEffect, useState } from "react";

/**
 * 묶음을 넘겼을 때 화면 가운데 잠깐 떴다 사라지는 알림.
 *
 * ## 화면을 따로 두지 않는다
 *
 * 한때 묶음 사이에 「몇 개 남았습니다 / 이어서 하기」 화면을 뒀다. 남은 개수를
 * 알리는 것은 맞는데, **답하던 흐름을 끊고 버튼을 한 번 더 누르게** 했다.
 * 열심히 하던 중에 막아서는 느낌이 든다.
 *
 * 알릴 것은 알리되 **길을 막지 않는다.** 다음 묶음이 이미 떠 있는 위로
 * 잠깐 지나간다.
 *
 * ## 빨리 사라진다
 *
 * 가운데에 크게 뜨는 만큼 **오래 있으면 방해가 된다.** 읽을 수 있는 만큼만
 * 두고 곧장 걷는다. 기다리기 싫으면 **눌러서 바로 없앨 수 있다** — 누르면
 * 사라지는 시간도 짧아진다.
 *
 * 사라진 뒤에는 DOM에서 아예 빠진다. 투명하게만 두면 보이지 않는 것이
 * 문항 위를 덮고 있게 된다.
 */
const HOLD_MS = 1400;
const FADE_MS = 320;
const FADE_ON_CLICK_MS = 120;

export function SectionProgress({
  section,
  sectionCount,
}: {
  section: number;
  sectionCount: number;
}) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const [fade, setFade] = useState(FADE_MS);

  useEffect(() => {
    if (phase !== "in") return;
    const t = setTimeout(() => setPhase("out"), HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), fade);
    return () => clearTimeout(t);
  }, [phase, fade]);

  if (phase === "gone") return null;

  const done = section - 1;
  const left = sectionCount - done;

  const dismiss = () => {
    setFade(FADE_ON_CLICK_MS);
    setPhase("out");
  };

  return (
    // 감싸개는 클릭을 통과시킨다. 알림 자체만 누를 수 있다
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <button
        type="button"
        onClick={dismiss}
        aria-label="알림 닫기"
        className="pointer-events-auto rounded-full px-8 py-4 shadow-sm transition-opacity"
        style={{
          background: "var(--page)",
          outline: "1px solid var(--border)",
          opacity: phase === "out" ? 0 : 1,
          transitionDuration: `${fade}ms`,
        }}
      >
        <span role="status" aria-live="polite" className="text-item">
          <span className="text-ink-secondary">{done}개 끝났습니다 · </span>
          <strong>
            {left === 1 ? "마지막 묶음입니다" : `${left}개 남았습니다`}
          </strong>
        </span>
      </button>
    </div>
  );
}
