import type { Split } from "@/lib/admin/split";

/**
 * **낮은 무리와 높은 무리를 두 점으로 찍고 선으로 잇는다** (2026-08-25 사용자 요청).
 *
 * ## 상관 막대와 다른 언어를 쓴다
 *
 * 화면에 이미 0을 가운데 둔 발산 막대가 있다 — 상관계수를 그리는 것이다.
 * 여기에 또 같은 막대를 쓰면 **같은 것을 두 번 보는 것처럼** 읽힌다.
 * 실제로 「파란 막대로만 비교하게 된다」는 지적을 받았다.
 *
 * 여기는 **점수 눈금(0~100)**을 그대로 쓴다. 상관은 「−1과 1 사이 어디」를
 * 말하지만 이 그림은 「58점과 45점」을 말한다. 눈금이 다르니 그림도 달라야
 * 하고, 무엇보다 **점수 쪽이 회의에서 쓸 수 있는 말**이다.
 *
 * ## 선의 길이가 답이다
 *
 * 점 두 개 사이가 멀수록 그 축이 사람을 크게 가른다. 어느 점이 오른쪽에
 * 있는지가 방향이다 — 높은 무리가 오른쪽이면 「높을수록 좋다」, 왼쪽이면
 * 「낮을수록 좋다」.
 *
 * ## 확정되지 않은 것은 선을 점선으로
 *
 * 13명씩이면 관계가 없어도 10점 안팎은 그냥 나온다. 구간이 0을 걸치면
 * **선을 점선으로 바꿔** 「이 길이를 그대로 믿지 말라」고 말한다.
 */

/** 눈금 양끝. 직무능력 값이 30~80에 몰려 있어 0~100을 다 그리면 선이 짧아 보인다 */
const LO = 20;
const HI = 85;

const at = (v: number) =>
  `${((Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * 100}%`;

/** 눈금선을 세우는 자리. 숫자는 목록 위 범례에서 한 번만 말한다 */
export const TICKS = [40, 60, 80];

export function SplitDumbbell({ s, dim = false }: { s: Split; dim?: boolean }) {
  const up = s.diff >= 0; // 높은 무리가 오른쪽인가
  const color = up ? "var(--diverge-pos)" : "var(--diverge-neg)";

  return (
    <span
      className="relative block h-5"
      style={{ opacity: dim ? 0.5 : 1 }}
      role="img"
      aria-label={`${s.scale} 높은 무리 ${Math.round(s.upperMean)}점, 낮은 무리 ${Math.round(s.lowerMean)}점`}
    >
      {/* 눈금 — 어디까지가 그릴 수 있는 범위인지 */}
      <span
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
        style={{ background: "var(--grid)" }}
      />
      {TICKS.map((t) => (
        <span
          key={t}
          className="absolute top-1/2 h-2 w-px -translate-y-1/2"
          style={{ left: at(t), background: "var(--grid)" }}
        />
      ))}

      {/* 두 무리를 잇는 선 — 길이가 곧 차이다 */}
      <span
        className="absolute top-1/2 -translate-y-1/2"
        style={{
          left: at(Math.min(s.lowerMean, s.upperMean)),
          width: `${(Math.abs(s.diff) / (HI - LO)) * 100}%`,
          height: s.settled ? 4 : 2,
          background: s.settled
            ? color
            : `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`,
          borderRadius: 2,
        }}
      />

      {/* 낮은 무리 — 속이 빈 점 */}
      <Dot x={s.lowerMean} color={color} hollow />
      {/* 높은 무리 — 꽉 찬 점 */}
      <Dot x={s.upperMean} color={color} />
    </span>
  );
}

function Dot({
  x,
  color,
  hollow = false,
}: {
  x: number;
  color: string;
  hollow?: boolean;
}) {
  return (
    <span
      className="absolute top-1/2 block rounded-full"
      style={{
        left: at(x),
        width: 11,
        height: 11,
        marginLeft: -5.5,
        marginTop: -5.5,
        background: hollow ? "var(--page)" : color,
        outline: `2px solid ${color}`,
        outlineOffset: -2,
      }}
    />
  );
}

/**
 * 한 축을 **글로** 말한다.
 *
 * 그림이 「얼마나」를 보여주면 글은 「무엇이 어느 쪽으로」를 말한다. 둘 다
 * 있어야 한다 — 그림만 있으면 회의에서 옮겨 적을 말이 없고, 글만 있으면
 * 일곱 줄이 다 비슷해 보인다.
 */
export function splitSentence(s: Split): string {
  /*
    **짧게 적는다.** 「연대감이 높은 쪽이 56점, 반대쪽이 47점 — 9점 차이」로
    적었더니 옆 칸에서 세 줄로 접혔다. 축 이름은 왼쪽에 이미 있고 차이는
    오른쪽에 이미 있으니 여기서는 **두 무리의 점수**만 말하면 된다.
  */
  const dir = s.diff >= 0 ? "높을수록" : "낮을수록";
  // 축 이름은 왼쪽 칸에 이미 있다. 여기서 되풀이하면 줄이 접힌다
  return `${dir} ${Math.round(
    s.diff >= 0 ? s.upperMean : s.lowerMean,
  )}점, 반대는 ${Math.round(s.diff >= 0 ? s.lowerMean : s.upperMean)}점`;
}
