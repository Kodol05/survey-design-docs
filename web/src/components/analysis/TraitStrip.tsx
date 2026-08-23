import { colorAt } from "../charts/scale";
import { TRAIT_SCALES } from "@/lib/items/types";

/**
 * 7축 색 띠 — 구성원 목록에서 한 사람을 한 줄로 훑는 용도.
 *
 * 숫자 일곱 개를 늘어놓으면 50명을 훑을 수 없다. 색으로 두면 **모양이 먼저
 * 보이고**, 튀는 사람이 눈에 들어온다. 정확한 값은 마우스를 올리면 나온다.
 *
 * 색은 성향 눈금과 같다 — 왼쪽(낮음) 청회색, 오른쪽(높음) 테라코타.
 */
export function TraitStrip({
  traits,
  labels,
}: {
  traits: Record<string, number> | null;
  labels?: boolean;
}) {
  if (!traits) return <span className="text-ink-muted text-axis">—</span>;

  return (
    <div className="flex gap-px" role="img" aria-label={describe(traits)}>
      {TRAIT_SCALES.map((s) => {
        const v = traits[s];
        const has = typeof v === "number";
        return (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div
              title={has ? `${s} ${Math.round(v)}` : s}
              className="h-8 w-full first:rounded-l-sm last:rounded-r-sm"
              style={{ background: has ? colorAt(v) : "var(--grid)" }}
            />
            {labels && (
              <span className="text-ink-muted" style={{ fontSize: 12 }}>
                {SHORT[s]}
              </span>
            )}
          </div>
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

/** 목록 머리에 한 번 두는 축 이름 줄 */
export function TraitStripHeader() {
  return (
    <div className="flex gap-px">
      {TRAIT_SCALES.map((s) => (
        <span
          key={s}
          className="text-ink-muted flex-1 text-center"
          style={{ fontSize: 13 }}
          title={s}
        >
          {SHORT[s]}
        </span>
      ))}
    </div>
  );
}
