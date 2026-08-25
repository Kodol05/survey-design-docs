import { abilityColorAt, colorAt } from "../charts/scale";
import type { Spread } from "@/lib/admin/spread";

/**
 * 한 축의 분포 — **점 하나가 한 사람.**
 *
 * ## 왜 막대 히스토그램이 아닌가
 *
 * 막대로 그리면 「이 구간에 다섯 명」까지만 남고 **그 다섯이 누구인지는
 * 사라진다.** 이 회사는 마흔 명이라 사람을 지울 이유가 없다. 점으로 두면
 * 마우스를 올려 이름을 볼 수 있고, 쌓인 높이가 곧 인원이라 히스토그램이
 * 하던 일도 그대로 한다.
 *
 * ## 상자는 **배경**이다
 *
 * 점만 있으면 「가운데가 어디쯤인가」를 눈으로 재야 한다. 가운데 절반(사분위
 * 범위)을 상자로 깔고 중앙값에 선을 그으면 그 물음이 없어진다.
 *
 * ⚠️ 처음에 상자를 `--wash`(따뜻한 베이지)로 칠했더니 **상자가 점보다 먼저
 *    보였다.** 점 색이 같은 계열이라 상자 위의 점이 묻히기까지 했다. 배경이
 *    주인공을 가리면 안 된다 — 지금은 위아래 테두리 두 줄과 아주 옅은
 *    칠로만 둔다. 「여기가 가운데 절반」이라는 말은 그것으로 충분하다.
 *
 * ## 색
 *
 * 성향은 발산 눈금(청회색 낮음 ↔ 테라코타 높음)을, 직무능력은 한 가지 색의
 * 진하기를 쓴다. 화면 다른 곳과 같은 약속이다 — 여기서만 다른 색을 쓰면
 * 눈이 다시 배워야 한다.
 */

/*
  점 지름과 세로 간격 (px).

  열 축이 세로로 쌓이므로 **한 줄이 커지면 화면 전체가 커진다.** 11px에
  간격 3px이면 여섯 개 쌓인 축에서 한 줄이 90px이고, 열 줄이면 900px이
  넘어 스크롤이 길어졌다. 점을 알아볼 수 있는 선에서 줄인다.
*/
const DOT = 9;
const GAP = 2;
/** 점이 하나도 안 쌓여도 이만큼은 자리를 준다 — 줄마다 키가 들쭉날쭉하지 않게 */
const MIN_ROWS = 4;

export function DotStrip({ s, dim = false }: { s: Spread; dim?: boolean }) {
  const rows = Math.max(MIN_ROWS, s.peak);
  const height = rows * (DOT + GAP) + 10;
  const fill = (v: number) =>
    s.kind === "ability" ? abilityColorAt(v) : colorAt(v);

  const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

  return (
    <div
      className="relative w-full"
      style={{ height, opacity: dim ? 0.55 : 1 }}
      role="img"
      aria-label={`${s.scale} 분포. ${s.n}명, 가운데 절반이 ${Math.round(
        s.q1,
      )}부터 ${Math.round(s.q3)}, 중앙값 ${Math.round(s.median)}`}
    >
      {/* 바닥선 — 0에서 100까지가 어디까지인지 */}
      <span
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: "var(--grid)" }}
      />
      {/* 가운데 절반 — 아주 옅은 칠 + 위아래 테두리. 점을 가리지 않는다 */}
      <span
        className="absolute bottom-0"
        style={{
          left: pct(s.q1),
          width: `${Math.max(0.6, s.q3 - s.q1)}%`,
          height: "100%",
          background: "var(--ink)",
          opacity: 0.045,
        }}
      />
      <span
        className="absolute bottom-0"
        style={{
          left: pct(s.q1),
          width: `${Math.max(0.6, s.q3 - s.q1)}%`,
          height: "100%",
          borderTop: "1px solid var(--grid)",
          borderBottom: "1px solid var(--axis)",
        }}
      />
      {/* 중앙값 */}
      <span
        className="absolute w-[2px]"
        style={{
          left: pct(s.median),
          top: -2,
          bottom: -2,
          background: "var(--ink-secondary)",
        }}
      />

      {/* 눈금 25·50·75 — 숫자는 안 적는다. 아래 요약 줄이 대신 말한다 */}
      {[25, 50, 75].map((t) => (
        <span
          key={t}
          className="absolute bottom-0 w-px"
          style={{
            left: `${t}%`,
            height: "100%",
            background: "var(--grid)",
            opacity: t === 50 ? 1 : 0.55,
          }}
        />
      ))}

      {s.dots.map((d) => (
        <span
          key={d.employeeId}
          title={`${d.name} · ${Math.round(d.value)}`}
          className="absolute rounded-full"
          style={{
            left: `${d.x * 100}%`,
            bottom: 3 + d.level * (DOT + GAP),
            width: DOT,
            height: DOT,
            marginLeft: -DOT / 2,
            background: fill(d.value),
            // 겹칠 때 서로 떨어져 보이도록 바탕색 링 (테두리가 아니다)
            boxShadow: "0 0 0 1.5px var(--page)",
          }}
        />
      ))}
    </div>
  );
}
