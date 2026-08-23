"use client";

/**
 * 7점 리커트 — docs/01-features-ux.md §2.2, docs/11-ui-guide.md §5.1
 *
 * 16Personalities의 좋은 점(크기 눈금, 색 눈금)은 가져오고, 그쪽 문제는 고친다.
 *
 *  - 16P는 라벨이 없어서 가운데 원 세 개의 의미가 모호하다 → **전 항목 라벨 유지**
 *  - 16P는 색으로만 구분한다 → 우리는 색 + **크기** + **위치** + **라벨**
 *    네 가지가 동시에 방향을 알려준다. 색을 못 보는 사람도 읽을 수 있다.
 */

export const LABELS = [
  "전혀 아니다",
  "아니다",
  "약간 아니다",
  "보통",
  "약간 그렇다",
  "그렇다",
  "매우 그렇다",
] as const;

/** 양 끝이 크고 가운데가 작다. 눈으로 척도의 방향과 세기가 읽힌다. */
const SIZE = [88, 72, 58, 46, 58, 72, 88] as const;

/**
 * 왼쪽 보라 ↔ 오른쪽 청록. 가운데는 중립 회색.
 *
 * 빨강을 쓰지 않는다. "전혀 아니다"는 틀린 답이 아니라 그냥 반대쪽인데,
 * 빨강은 오답·경고로 읽혀서 응답을 한쪽으로 밀 수 있다.
 * 16Personalities도 같은 이유로 보라를 쓴다.
 *
 * 보라↔청록은 적록색약에서도 갈린다. 여기에 크기·위치·라벨까지 있어
 * 색을 못 봐도 방향을 읽을 수 있다.
 */
const COLOR = [
  "#7d6fd0",
  "#9d92dd",
  "#bdb6e9",
  "#c9c7c0",
  "#a5d9c5",
  "#6cc4a4",
  "#3aa77f",
] as const;

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
    <fieldset className={`transition-opacity ${dimmed ? "opacity-45" : "opacity-100"}`}>
      <legend className="sr-only">7단계 중 하나를 고르세요</legend>

      {/* 넓은 폭 — 양 끝 라벨을 크게 두고 가운데에 원 일곱 개 */}
      <div className="hidden items-center gap-6 sm:flex">
        <span className="w-24 shrink-0 text-right font-medium text-ink-secondary">
          전혀
          <br />
          아니다
        </span>

        <div className="flex flex-1 items-center justify-between">
          {LABELS.map((label, i) => {
            const v = i + 1;
            const on = value === v;
            const size = SIZE[i];
            const color = COLOR[i];
            return (
              <label
                key={v}
                className="group flex cursor-pointer flex-col items-center gap-2"
                style={{ minWidth: 96 }}
              >
                <input
                  type="radio"
                  name={name}
                  value={v}
                  checked={on}
                  onChange={() => onChange(v)}
                  className="sr-only"
                  aria-label={label}
                />
                <span
                  aria-hidden
                  className="flex items-center justify-center rounded-full transition-all duration-150 group-hover:scale-110"
                  style={{
                    width: size,
                    height: size,
                    // 안 고른 것은 테두리만, 고른 것은 꽉 채운다
                    border: `3px solid ${color}`,
                    background: on ? color : "transparent",
                    boxShadow: on ? `0 0 0 7px ${color}22` : undefined,
                  }}
                >
                  {on && (
                    <svg viewBox="0 0 24 24" className="size-1/2" fill="none" aria-hidden>
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-table text-center leading-tight whitespace-nowrap ${
                    on ? "font-semibold text-ink" : "text-ink-muted"
                  }`}
                >
                  {label}
                </span>
              </label>
            );
          })}
        </div>

        <span className="w-24 shrink-0 font-medium text-ink-secondary">
          매우
          <br />
          그렇다
        </span>
      </div>

      {/* 좁은 폭 — 세로 스택 */}
      <div className="flex flex-col gap-1.5 sm:hidden">
        {LABELS.map((label, i) => {
          const v = i + 1;
          const on = value === v;
          return (
            <label
              key={v}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4"
              style={{
                borderColor: on ? COLOR[i] : "var(--border)",
                background: on ? `${COLOR[i]}15` : "transparent",
              }}
            >
              <input
                type="radio"
                name={name}
                value={v}
                checked={on}
                onChange={() => onChange(v)}
                className="sr-only"
                aria-label={label}
              />
              <span
                aria-hidden
                className="shrink-0 rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  border: `2.5px solid ${COLOR[i]}`,
                  background: on ? COLOR[i] : "transparent",
                }}
              />
              <span className={on ? "font-semibold" : "text-ink-secondary"}>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
