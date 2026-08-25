"use client";

import { useEffect, useState } from "react";

/**
 * 묶음을 넘겼을 때 잠깐 떴다 사라지는 알림.
 *
 * ## 왜 화면을 따로 두지 않는가
 *
 * 한때 묶음 사이에 「몇 개 남았습니다 / 이어서 하기」 화면을 뒀다. 남은 개수를
 * 알리는 것은 맞는데, **답하던 흐름을 끊고 버튼을 한 번 더 누르게** 했다.
 * 열심히 하던 중에 막아서는 느낌이 든다.
 *
 * 알릴 것은 그대로 알리되 **길을 막지 않는다.** 다음 묶음이 이미 떠 있는
 * 위에서 잠깐 보였다 사라진다.
 *
 * 화면 낭독기에는 `aria-live`로 한 번 읽히고, 사라진 뒤에도 진행률 막대가
 * 같은 정보를 들고 있다.
 */
export function SectionProgress({
  section,
  sectionCount,
}: {
  section: number;
  sectionCount: number;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // 읽고 사라질 만큼만. 길면 오히려 눈에 걸린다
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const done = section - 1;
  const left = sectionCount - done;

  return (
    <p
      role="status"
      aria-live="polite"
      className="text-table text-ink-secondary pointer-events-none text-center transition-opacity duration-500"
      style={{ opacity: show ? 1 : 0 }}
    >
      {done}개 끝났습니다 ·{" "}
      <strong className="text-ink">
        {left === 1 ? "마지막 묶음입니다" : `${left}개 남았습니다`}
      </strong>
    </p>
  );
}
