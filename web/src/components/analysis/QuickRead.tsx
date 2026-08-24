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
 * ## 가운데는 말하지 않는다
 *
 * 40~60(D-26) 안에 든 축은 아예 빼고 **몇 개가 가운데인지만** 적는다.
 * 이 구간은 "이 사람은 중간이다"가 아니라 **두드러지지 않는다**는 뜻이고,
 * 거기에 서술을 붙이면 없는 특징을 만들어내게 된다.
 *
 * 일곱 축이 다 가운데면 그렇다고 적는다. 그것도 정보다.
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
          일곱 축이 모두 가운데 범위입니다. 특별히 두드러지는 쪽이 없습니다.
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
            <>두드러지는 축 {standout.length}개 중 위 {LIMIT}개입니다. </>
          )}
          {middle > 0 && <>나머지 {middle}개 축은 가운데 범위입니다.</>}
        </p>
      )}
    </div>
  );
}
