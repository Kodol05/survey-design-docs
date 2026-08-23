import { colorAt } from "../charts/scale";
import { TRAIT_SCALES } from "@/lib/items/types";

/**
 * 7축 히트 표 — 구성원 목록에서 한 사람을 한 줄로 훑는 용도.
 *
 * **색과 숫자를 같이 둔다.** 색만 두면 정확한 값을 못 읽고, 숫자만 두면
 * 50명을 훑을 수 없다. 색은 모양을 먼저 보여주고 숫자는 값을 확정해 준다.
 *
 * 색은 성향 눈금과 같다 — 왼쪽(낮음) 청회색, 오른쪽(높음) 테라코타.
 */

/** 칸 배경에 얹을 글자색. 진한 칸에는 흰 글자를 쓴다. */
function readableInk(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "var(--ink)" : "#ffffff";
}

export function TraitStrip({ traits }: { traits: Record<string, number> | null }) {
  if (!traits)
    return <span className="text-ink-muted text-axis">아직 결과가 없습니다</span>;

  return (
    <div className="flex gap-px" role="img" aria-label={describe(traits)}>
      {TRAIT_SCALES.map((s) => {
        const v = traits[s];
        const has = typeof v === "number";
        const bg = has ? colorAt(v) : "var(--grid)";
        return (
          <div
            key={s}
            title={has ? `${s} ${Math.round(v)}` : s}
            className="tabular flex h-8 flex-1 items-center justify-center text-[0.8125rem] font-medium first:rounded-l-sm last:rounded-r-sm"
            style={{ background: bg, color: has ? readableInk(bg) : "var(--ink-muted)" }}
          >
            {has ? Math.round(v) : "—"}
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
