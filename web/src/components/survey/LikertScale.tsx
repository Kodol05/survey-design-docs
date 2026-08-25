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
 * 왼쪽 청회색 ↔ 오른쪽 테라코타. 가운데는 중립 회색.
 *
 * 빨강을 쓰지 않는다. "전혀 아니다"는 틀린 답이 아니라 그냥 반대쪽인데,
 * 빨강은 오답·경고로 읽혀서 응답을 한쪽으로 밀 수 있다.
 * 16Personalities도 같은 이유로 빨강 대신 보라를 쓴다.
 *
 * 청회색↔테라코타는 적록색약에서도 갈린다(ΔE 14.5). 여기에 크기·위치·라벨까지 있어
 * 색을 못 봐도 방향을 읽을 수 있다.
 */
/*
  ── 색을 토큰에서 가져온다 (2026-08-25) ──

  전에는 hex를 그대로 박아 뒀다. 그래서 **어두운 화면에서 밝은 곳 색이
  그대로 깔렸다** — 응시 중에 어둡게 바꾸면 원들이 배경에서 겉돈다.

  일곱 단계가 성향 눈금의 일곱 단계와 정확히 같은 자리다. 같은 토큰을 쓰면
  다크 모드가 따라오고, **응시 화면과 결과 화면이 같은 색 언어**를 쓰게 된다.
*/
const COLOR = [
  "var(--scale-0)",
  "var(--scale-20)",
  "var(--scale-38)",
  "var(--scale-50)",
  "var(--scale-62)",
  "var(--scale-80)",
  "var(--scale-100)",
] as const;

/**
 * 고른 칸의 글자색.
 *
 * **원의 색을 글자에 그대로 쓰지 않는다.** 가운데 세 단계는 옅어서 작은
 * 글자로 쓰면 배경에 묻힌다. 색은 원이 지고, 글자는 본문 잉크로 굵게 쓴다 —
 * 어느 화면에서든 읽힌다.
 */
const PICKED_INK = "var(--ink)";

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
      className="transition-opacity duration-200"
      style={{ opacity: dimmed ? 0.3 : 1 }}
    >
      <legend className="sr-only">7단계 중 하나를 고르세요</legend>

      {/*
        넓은 폭 — 원 일곱 개를 가로로.

        두 가지를 고쳤다 (2026-08-24).

        1. **양 끝 안내 라벨을 뺐다.** 왼쪽에 「전혀 아니다」, 오른쪽에
           「매우 그렇다」가 따로 있었는데, 첫 원과 마지막 원 밑에 **같은 글자가
           이미 붙어 있었다.** 같은 말을 두 번 하면서 폭만 15rem을 먹었다.
           방향은 원 크기와 색이 이미 말해준다.

        2. **가로로 펴는 지점을 `sm`(640px)에서 `lg`(1024px)로 올렸다.**
           글자를 1.3배로 키우면서 라벨이 19px가 됐다. 좁은 화면에서 억지로
           펴면 밀려나고, 손으로 누르기도 아래 세로 목록이 낫다.
      */}
      <div className="hidden items-center lg:flex">
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
                    /*
                      고른 것이 **한눈에 잡혀야 한다** (2026-08-25).
                      전에는 채우기 말고는 안 고른 것과 차이가 적었다.
                      테두리를 굵히고 후광을 진하게 넓혀 둔다.
                    */
                    border: `${on ? 4 : 2.5}px solid ${on ? color : `color-mix(in oklab, ${color} 60%, transparent)`}`,
                    background: on ? color : "transparent",
                    boxShadow: on ? `0 0 0 9px color-mix(in oklab, ${color} 22%, transparent)` : undefined,
                    transform: on ? "scale(1.06)" : undefined,
                  }}
                >
                  {on && (
                    <svg viewBox="0 0 24 24" className="size-1/2" fill="none" aria-hidden>
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="var(--page)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className="text-table text-center leading-tight whitespace-nowrap transition-all"
                  style={{
                    color: on ? PICKED_INK : "var(--ink-muted)",
                    fontWeight: on ? 700 : 400,
                  }}
                >
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 좁은 폭 — 세로 스택 */}
      <div className="flex flex-col gap-1.5 lg:hidden">
        {LABELS.map((label, i) => {
          const v = i + 1;
          const on = value === v;
          return (
            <label
              key={v}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-4 transition-all"
              style={{
                border: on ? `2.5px solid ${COLOR[i]}` : "1.5px solid var(--border)",
                background: on ? `color-mix(in oklab, ${COLOR[i]} 16%, transparent)` : "transparent",
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
                  width: 24,
                  height: 24,
                  border: on ? `4px solid ${COLOR[i]}` : `2px solid color-mix(in oklab, ${COLOR[i]} 60%, transparent)`,
                  background: on ? COLOR[i] : "transparent",
                }}
              />
              <span
                style={{
                  color: on ? PICKED_INK : "var(--ink-secondary)",
                  fontWeight: on ? 700 : 400,
                }}
              >
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
