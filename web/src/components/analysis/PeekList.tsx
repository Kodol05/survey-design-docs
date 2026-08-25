"use client";

import { useState } from "react";

/**
 * 긴 명단을 **위·가운데·아래만 보여주고 펼치면 전부** (2026-08-25 사용자 요청).
 *
 * ## 왜 양끝만으로는 안 되는가
 *
 * 처음 이야기는 「가운데를 접자」였다. 그런데 그렇게 하면 **극단만 남아서**
 * 평범한 사람이 어디쯤인지가 사라진다. 「크게 어긋난 사람 다섯」만 보면
 * 나머지 서른 명이 어떤 모양인지 모른 채로 결론을 내리게 된다.
 *
 * 그래서 **가운데도 몇 줄 남긴다.** 위에서 몇, 가운데에서 몇, 아래에서 몇 —
 * 명단이 어떤 모양인지는 그것으로 충분히 보이고, 전부 필요하면 펼친다.
 *
 * ## 줄을 이 파일이 그리지 않는다
 *
 * 명단마다 줄 모양이 다르다(이름·막대·숫자의 배치). 그래서 여기는
 * **무엇을 보여줄지만 정하고**, 그리는 것은 쓰는 쪽에 맡긴다 — `<ul>`도
 * 쓰는 쪽이 만든다. 그래야 `<li>` 안에 `<li>`가 들어가는 일이 없다.
 */

export type Peek = { head: number; mid: number; tail: number };

/** 40명 안팎에서 열한 줄쯤이 「모양은 보이되 길지 않은」 선이었다 */
export const DEFAULT_PEEK: Peek = { head: 5, mid: 3, tail: 3 };

/** 한 줄이거나, 「N명 접힘」 표시거나 */
export type PeekItem<T> =
  | { kind: "row"; row: T }
  | { kind: "gap"; n: number };

export function usePeek<T>(rows: T[], peek: Peek = DEFAULT_PEEK) {
  const [all, setAll] = useState(false);
  const { head, mid, tail } = peek;

  /*
    다 보여줄 수 있으면 접지 않는다 — 「… 1명 접힘」은 접는 뜻이 없으면서
    줄만 하나 더 잡아먹는다.
  */
  const foldable = rows.length > head + mid + tail + 2;

  if (!foldable || all) {
    return {
      items: rows.map((row) => ({ kind: "row", row }) as PeekItem<T>),
      foldable,
      all,
      toggle: () => setAll((v) => !v),
      hidden: 0,
    };
  }

  const midStart = Math.floor((rows.length - mid) / 2);
  const items: PeekItem<T>[] = [];
  const push = (rs: T[]) =>
    rs.forEach((row) => items.push({ kind: "row", row }));

  push(rows.slice(0, head));
  items.push({ kind: "gap", n: midStart - head });
  push(rows.slice(midStart, midStart + mid));
  items.push({ kind: "gap", n: rows.length - tail - (midStart + mid) });
  push(rows.slice(rows.length - tail));

  return {
    items,
    foldable,
    all,
    toggle: () => setAll((v) => !v),
    hidden: rows.length - (head + mid + tail),
  };
}

/** 접힌 자리에 두는 줄 — **몇 명이 숨어 있는지 적는다.** 숨긴 것을 숨기지 않는다 */
export function PeekGap({ n }: { n: number }) {
  return (
    <li
      className="text-axis text-ink-muted flex items-center gap-3 py-2"
      aria-label={`${n}명 접힘`}
    >
      <span className="h-px flex-1" style={{ background: "var(--border)" }} />
      <span className="tabular">{n}명 접힘</span>
      <span className="h-px flex-1" style={{ background: "var(--border)" }} />
    </li>
  );
}

export function PeekToggle({
  all,
  hidden,
  onClick,
  label = "전체 보기",
}: {
  all: boolean;
  hidden: number;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-axis text-ink-muted mt-3 underline"
    >
      {all ? "접기" : `${label} (${hidden}명 더)`}
    </button>
  );
}
