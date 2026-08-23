"use client";

/**
 * 7점 리커트 — docs/01-features-ux.md §2.2, docs/11-ui-guide.md §5.1
 *
 * 지키는 것
 *  - 방향은 색이 아니라 **위치와 라벨**로 표현한다 (색맹 대응)
 *  - 선택 표시는 **색 + 굵기 + 채움 세 가지 동시**
 *  - 터치 타깃 최소 44×44
 *  - 폭 1024 이상 가로 / 768~1023 라벨 두 줄 / 768 미만 세로 스택
 */

export const LABELS = [
  ["전혀", "아니다"],
  ["아니다", ""],
  ["약간", "아니다"],
  ["보통", ""],
  ["약간", "그렇다"],
  ["그렇다", ""],
  ["매우", "그렇다"],
] as const;

const flat = (i: number) => LABELS[i].filter(Boolean).join(" ");

export function LikertScale({
  name,
  value,
  onChange,
  dimmed,
}: {
  name: string;
  value?: number;
  onChange: (v: number) => void;
  dimmed?: boolean;
}) {
  return (
    <fieldset
      className={`transition-opacity ${dimmed ? "opacity-40" : "opacity-100"}`}
    >
      <legend className="sr-only">7단계 중 하나를 고르세요</legend>

      {/* 넓은 폭 — 가로 7개 */}
      <div className="hidden sm:grid grid-cols-7 gap-1">
        {LABELS.map((pair, i) => {
          const v = i + 1;
          const on = value === v;
          return (
            <label
              key={v}
              className="flex min-h-11 cursor-pointer flex-col items-center gap-1.5 rounded-lg py-2 hover:bg-page"
            >
              <input
                type="radio"
                name={name}
                value={v}
                checked={on}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              {/* 색 + 굵기 + 채움 세 가지로 동시에 표시한다 */}
              <span
                aria-hidden
                className="flex size-6 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: on ? "var(--series-1)" : "var(--axis)",
                  borderWidth: on ? 3 : 2,
                  background: on ? "var(--series-1)" : "transparent",
                }}
              >
                {on && (
                  <svg viewBox="0 0 12 12" className="size-3" fill="none">
                    <path d="M2 6.5l2.5 2.5L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span
                className={`text-axis text-center leading-tight ${on ? "font-semibold text-ink" : "text-ink-secondary"}`}
              >
                {pair[0]}
                {pair[1] && (
                  <>
                    <br />
                    {pair[1]}
                  </>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* 좁은 폭 — 세로 스택. 미디어쿼리 한 블록이라 지금 넣는 비용이 거의 0이다 */}
      <div className="flex flex-col gap-px sm:hidden">
        {LABELS.map((_, i) => {
          const v = i + 1;
          const on = value === v;
          return (
            <label
              key={v}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[--border] px-3"
              style={on ? { borderColor: "var(--series-1)", borderWidth: 2 } : undefined}
            >
              <input
                type="radio"
                name={name}
                value={v}
                checked={on}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="size-5 shrink-0 rounded-full border-2"
                style={{
                  borderColor: on ? "var(--series-1)" : "var(--axis)",
                  background: on ? "var(--series-1)" : "transparent",
                }}
              />
              <span className={on ? "font-semibold" : "text-ink-secondary"}>{flat(i)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
