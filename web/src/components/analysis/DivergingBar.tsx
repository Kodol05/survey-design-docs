import { CORR_FULL } from "./correlationColor";

/**
 * 0을 가운데 둔 **넓은 줄용** 막대.
 *
 * 「더 들여다보기」의 두 줄과 논문 값 대조의 두 줄이 이것을 쓴다. 따로
 * 적어 두었더니 실제로 조금씩 어긋났다 — 같은 값이 화면마다 다른 모양으로
 * 나오면 눈이 다시 배워야 한다.
 *
 * ⚠️ **상관 표 안의 칸막대는 이것을 쓰지 않는다** (`CorrelationTable`의
 *    `CellBar`). 거기는 칸이 100px이고 격자선이 이미 테두리 노릇을 해서
 *    레일을 깔면 칸이 답답해진다. 규칙(0이 가운데, 최소 폭을 양쪽에 같이
 *    적용, `FULL = .7`)은 같게 맞춰 두었다.
 *
 * ## 눈금을 깔아서 0을 보이게 한다 (2026-08-25 화면에서 두 번 고침)
 *
 * 표 안에서는 칸이 좁아 0선이 거의 안 보여도 괜찮았다 — 막대가 칸 가운데서
 * 시작한다는 것을 칸 모양이 말해 줬다. **폭이 넓어지면 그게 무너진다.**
 * 400px짜리 줄에서 막대만 떠 있으면 논문 막대와 우리 막대가 **서로 다른
 * 자리에서 시작하는 것처럼** 보인다. 실제로 그렇게 보였다.
 *
 * 처음에는 0선만 진하게 해 봤다. **여전히 안 보였다** — 1px 선 하나는
 * 넓은 줄에서 그냥 사라진다.
 *
 * 그래서 **눈금 전체를 깐다.** 옅은 레일이 왼쪽 끝부터 오른쪽 끝까지
 * 이어지면 「여기까지가 그릴 수 있는 범위」가 보이고, 그 가운데가 0이라는
 * 것도 따라온다. 0에는 레일보다 조금 크게 튀어나온 눈금을 세운다.
 *
 * ## 폭에 상한을 둔다
 *
 * 0이 가운데라 **폭의 절반은 늘 빈다.** 값이 다 양수인 줄에서는 왼쪽이
 * 통째로 빈 채로 화면 폭만큼 늘어난다. 상한을 두면 남는 자리는 여백이
 * 되고, 막대끼리는 여전히 견줄 수 있다.
 */

/** 눈금 끝. 한 곳에서 정한다 — `correlationColor.ts` 머리말 참고 */
export const FULL = CORR_FULL;

/** 0에서 한쪽 끝까지의 폭(%). 반대쪽 절반과 합쳐 100 */
const HALF = 50;

/** 0이어도 이만큼은 그린다 — 아예 없으면 「값이 없음」과 구분이 안 된다 */
const MIN = 1.6;

export function widthFor(r: number, full = FULL): number {
  return Math.max(MIN, Math.min(HALF, (Math.abs(r) / full) * HALF));
}

export function DivergingBar({
  r,
  full = FULL,
  faded = false,
  hollow = false,
  ci,
  height = 14,
  title,
}: {
  r: number;
  /** 막대가 끝까지 차는 값 */
  full?: number;
  /** 옅게 — 아직 방향이 확정되지 않았거나, 척도가 안 맞물릴 때 */
  faded?: boolean;
  /** 테두리만 — 우리 값이 아니라 바깥에서 온 값일 때 */
  hollow?: boolean;
  /** 있으면 막대 **아래**에 가는 선으로 깐다 */
  ci?: [number, number];
  height?: number;
  title?: string;
}) {
  /*
    ⚠️ **시작점과 폭에 같은 값을 쓴다.** 따로 계산하면 아주 작은 음수에서
       막대가 가운데를 넘어가 반대쪽 색 조각처럼 보인다 (D-49).
  */
  const w = widthFor(r, full);
  const color = r < 0 ? "var(--diverge-neg)" : "var(--diverge-pos)";

  // 눈금 밖으로 나간 구간은 잘라 둔다. 자르지 않으면 폭이 음수가 된다
  const lo = ci ? Math.max(-full, Math.min(full, ci[0])) : 0;
  const hi = ci ? Math.max(-full, Math.min(full, ci[1])) : 0;
  const ciLeft = HALF + (lo / full) * HALF;
  const ciWidth = Math.max(0, ((hi - lo) / full) * HALF);

  const barBottom = ci ? 5 : 0;

  return (
    <span className="relative block" style={{ height }} title={title}>
      {/* 눈금 레일 — 그릴 수 있는 범위 전체 */}
      <span
        className="absolute inset-x-0 rounded-full"
        style={{
          top: 0,
          bottom: barBottom,
          background: "var(--grid)",
          opacity: 0.55,
        }}
      />
      {/* 0 — 레일보다 위아래로 튀어나오게 해서 막대에 묻히지 않게 한다 */}
      <span
        className="absolute left-1/2 w-[2px] -translate-x-1/2"
        style={{
          top: -3,
          bottom: barBottom - 3,
          // `--axis`는 레일과 거의 같은 밝기라 안 보였다. 한 단계 진한 잉크로
          background: "var(--ink-muted)",
        }}
      />

      {ci && ciWidth > 0 && (
        <span
          className="absolute h-px"
          style={{
            left: `${ciLeft}%`,
            width: `${ciWidth}%`,
            bottom: 0,
            background: "var(--ink-muted)",
            opacity: 0.7,
          }}
        />
      )}

      <span
        className="absolute rounded-sm"
        style={{
          left: r < 0 ? `${HALF - w}%` : `${HALF}%`,
          width: `${w}%`,
          top: 0,
          bottom: barBottom,
          background: hollow ? "transparent" : color,
          outline: hollow ? `1.5px solid ${color}` : undefined,
          outlineOffset: -1.5,
          opacity: faded ? 0.45 : 1,
        }}
      />
    </span>
  );
}
