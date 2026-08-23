import { colorAt } from "../charts/scale";
import { TRAIT_SCALES } from "@/lib/items/types";

/**
 * 7축 한 줄 표시 — 구성원 목록에서 한 사람을 훑는 용도.
 *
 * **숫자를 왼쪽에, 색 네모를 그 오른쪽에** 둔다. 칸 전체를 색으로 칠하면
 * 줄마다 색 덩어리가 이어져 화면이 시끄럽다. 작은 네모로 떼어 두면 숫자가
 * 먼저 읽히고 색은 옆에서 거들기만 한다.
 *
 * 색은 성향 눈금과 같다 — 청회색이 낮음, 테라코타가 높음.
 */

const CELL = "w-[3.25rem]";

export function TraitStrip({ traits }: { traits: Record<string, number> | null }) {
  if (!traits)
    return <span className="text-ink-muted text-axis">아직 결과가 없습니다</span>;

  return (
    <div className="flex gap-3" role="img" aria-label={describe(traits)}>
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
    <div className="flex gap-3">
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
