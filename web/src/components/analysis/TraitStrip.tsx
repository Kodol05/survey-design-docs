import { colorAt } from "../charts/scale";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";

/**
 * 7축 한 줄 표시 — 구성원 목록에서 한 사람을 훑는 용도.
 *
 * **숫자를 왼쪽에, 색 네모를 그 오른쪽에** 둔다. 칸 전체를 색으로 칠하면
 * 줄마다 색 덩어리가 이어져 화면이 시끄럽다. 작은 네모로 떼어 두면 숫자가
 * 먼저 읽히고 색은 옆에서 거들기만 한다.
 *
 * 색은 성향 눈금과 같다 — 청회색이 낮음, 테라코타가 높음.
 */

// 넓은 화면에서 늘어나되 무한정은 아니다.
//
// 관리자 표는 max-width 없이 전체 폭을 쓴다 (11 §1.4). 그건 표 이야기고,
// **한 칸 안의 스트립까지 끝없이 늘리면 반대 문제가 생긴다** — 2560 화면에서
// 7칸이 1,200px로 퍼지면 숫자와 머리글이 멀어져 어느 축인지 못 찾는다.
// 그래서 셀은 늘어나되 스트립 전체에 상한을 둔다. 남는 폭은 여백으로 둔다.
const CELL = "min-w-[3.25rem] flex-1";

export function TraitStrip({ traits }: { traits: Record<string, number> | null }) {
  if (!traits)
    return <span className="text-ink-muted text-axis">아직 결과가 없습니다</span>;

  return (
    <div className="flex w-full max-w-[46rem] gap-3" role="img" aria-label={describe(traits)}>
      {TRAIT_SCALES.map((s) => {
        const v = traits[s];
        const has = typeof v === "number";
        return (
          <span
            key={s}
            title={has ? `${s} ${Math.round(v)}` : s}
            className={`${CELL} flex items-center justify-end gap-1.5`}
          >
            <span className="tabular text-table">{has ? Math.round(v) : "—"}</span>
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-[3px]"
              style={{ background: has ? colorAt(v) : "var(--grid)" }}
            />
          </span>
        );
      })}
    </div>
  );
}

const A_CELL = "min-w-[3.75rem] flex-1";

/**
 * 직무능력 3축 한 줄 표시 — 관리자 목록 전용.
 *
 * **성향의 발산 색을 쓰지 않는다.** 성향은 낮음도 높음도 틀린 게 아니라
 * 양쪽으로 갈라지는 색을 쓰지만, 직무능력은 높을수록 좋은 값이다(D-34에서
 * 대표님 평가와 대조하는 대상이 이것이다). 같은 색 언어를 쓰면 "낮음"이
 * 청회색으로 곱게 보여서 반대로 읽힌다.
 *
 * 그래서 한 가지 색의 **길이**로만 말한다. 계열 1을 쓰고 굵기는 얇게 둔다.
 */
export function AbilityStrip({ abilities }: { abilities: Record<string, number> | null }) {
  if (!abilities || Object.keys(abilities).length === 0)
    return <span className="text-ink-muted text-axis">—</span>;

  return (
    <div className="flex w-full max-w-[20rem] gap-3" role="img" aria-label={describeAbility(abilities)}>
      {ABILITY_AXES.map((a) => {
        const v = abilities[a];
        const has = typeof v === "number";
        return (
          <span key={a} title={has ? `${a} ${Math.round(v)}` : a} className={`${A_CELL} block`}>
            <span className="tabular text-table block text-right leading-none">
              {has ? Math.round(v) : "—"}
            </span>
            <span aria-hidden className="mt-1 block h-[3px] rounded-full" style={{ background: "var(--grid)" }}>
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${has ? Math.max(2, Math.min(100, v)) : 0}%`,
                  background: "var(--series-1)",
                }}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function AbilityStripHeader() {
  return (
    <div className="flex w-full max-w-[20rem] gap-3">
      {ABILITY_AXES.map((a) => (
        <span key={a} className={`${A_CELL} text-ink-muted text-right`} style={{ fontSize: 13 }}>
          {A_SHORT[a]}
        </span>
      ))}
    </div>
  );
}

const A_SHORT: Record<string, string> = {
  협력: "협력",
  조직생활: "조직",
  자율적실행: "실행",
};

function describeAbility(a: Record<string, number>) {
  return ABILITY_AXES.map((x) =>
    typeof a[x] === "number" ? `${x} ${Math.round(a[x])}` : `${x} 없음`,
  ).join(", ");
}

export const SHORT: Record<string, string> = {
  자극추구: "자극",
  위험회피: "위험",
  사회적민감성: "민감",
  인내력: "인내",
  자율성: "자율",
  연대감: "연대",
  자기초월: "초월",
};

function describe(traits: Record<string, number>) {
  return TRAIT_SCALES.map((s) =>
    typeof traits[s] === "number" ? `${s} ${Math.round(traits[s])}` : `${s} 없음`,
  ).join(", ");
}

/** 목록 머리에 한 번 두는 축 이름 줄. 아래 칸과 자리를 맞춘다. */
export function TraitStripHeader() {
  return (
    <div className="flex w-full max-w-[46rem] gap-3">
      {TRAIT_SCALES.map((s) => (
        <span
          key={s}
          className={`${CELL} text-ink-muted pr-[1.125rem] text-right`}
          style={{ fontSize: 13 }}
          title={s}
        >
          {SHORT[s]}
        </span>
      ))}
    </div>
  );
}
