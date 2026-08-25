import { POLES } from "@/lib/interpretation/poles";
import { BAND } from "@/lib/scoring/score";
import { TRAIT_SCALES } from "@/lib/items/types";
import { colorAt } from "../charts/scale";

/** 몇 줄까지 적을지. 늘리면 요약이 아니라 목록이 된다 */
const LIMIT = 3;

/**
 * 한눈에 — 구성원 펼침 패널 오른쪽 끝에 두는 세 줄짜리 요약.
 *
 * ## 새로 쓰지 않는다
 *
 * 문장은 전부 `POLES`에서 그대로 가져온다. 점수를 보고 문장을 짓기 시작하면
 * **근거 없는 인물평이 된다.** 축별 양극 서술은 점수와 무관하게 늘 같은
 * 문장이라, 여기서 하는 일은 "어느 쪽 문장을 고를지"뿐이다.
 *
 * ## 가운데 축은 여기 올리지 않는다
 *
 * 40~60(D-26) 안에 든 축은 빼고 **몇 개가 가운데인지만** 적는다. 이 칸은
 * **가장 두드러지는 것부터** 보여주는 자리라, 기운 축과 안 기운 축을 같이
 * 올리면 무엇이 이 사람을 가르는지가 흐려진다.
 *
 * ⚠️ 「가운데는 말할 것이 없다」는 뜻이 **아니다** (2026-08-26 바로잡음).
 * 가운데는 양쪽을 다 가지고 있다는 뜻이고, 그 이야기는 아래 축별 서술이
 * 한다 (`lib/interpretation/bands.ts`). 여기서 빼는 이유는 **순위를 매기는
 * 자리**이기 때문이지 내용이 없어서가 아니다.
 *
 * 일곱 축이 다 가운데면 그것도 하나의 모습이므로 그렇게 적는다.
 */
export function QuickRead({ traits }: { traits: Record<string, number> }) {
  const standout = TRAIT_SCALES.filter((s) => typeof traits[s] === "number")
    .map((s) => ({ scale: s, v: traits[s] }))
    .filter((x) => x.v < BAND.lower || x.v > BAND.upper)
    // 가운데에서 먼 축부터. 가장 두드러지는 것이 위로 온다
    .sort((a, b) => Math.abs(b.v - 50) - Math.abs(a.v - 50));

  const shown = standout.slice(0, LIMIT);
  const middle = TRAIT_SCALES.length - standout.length;

  return (
    <div>
      <p className="text-table text-ink-secondary mb-3">한눈에</p>

      {shown.length === 0 ? (
        <p className="text-ink-secondary leading-relaxed">
          일곱 축이 모두 가운데 범위입니다. 어느 축에서도 한쪽으로 크게 기울지
          않아, 상황에 따라 양쪽을 골라 쓰는 편입니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map(({ scale, v }) => (
            <li key={scale}>
              <p className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 translate-y-px rounded-[2px]"
                  style={{ background: colorAt(v) }}
                />
                <span className="text-table font-medium">{scale}</span>
                <span className="tabular text-table text-ink-secondary">
                  {Math.round(v)}
                </span>
              </p>
              <p className="text-axis text-ink-secondary mt-0.5 leading-snug">
                {v > BAND.upper ? POLES[scale].high : POLES[scale].low}
              </p>
            </li>
          ))}
        </ul>
      )}

      {shown.length > 0 && (
        <p className="text-axis text-ink-muted mt-4 leading-snug">
          {standout.length > LIMIT && (
            <>
              두드러지는 축 {standout.length}개 중 위 {LIMIT}개입니다.{" "}
            </>
          )}
          {middle > 0 && <>나머지 {middle}개 축은 가운데 범위입니다.</>}
        </p>
      )}
    </div>
  );
}
