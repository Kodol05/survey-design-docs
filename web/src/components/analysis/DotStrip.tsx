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
 * ## 상자를 뒤에 깐다
 *
 * 점만 있으면 「가운데가 어디쯤인가」를 눈으로 재야 한다. 가운데 절반(사분위
 * 범위)을 옅은 상자로 깔고 중앙값에 선을 그으면, 훑을 때 **먼저 상자가
 * 들어오고 그다음에 점이** 들어온다.
 *
 * ## 색
 *
 * 성향은 발산 눈금(청회색 낮음 ↔ 테라코타 높음)을, 직무능력은 한 가지 색의
 * 진하기를 쓴다. 화면 다른 곳과 같은 약속이다 — 여기서만 다른 색을 쓰면
 * 눈이 다시 배워야 한다.
 */

/** 점 지름과 세로 간격 (px) */
const DOT = 11;
const GAP = 3;
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

      {/* 가운데 절반 */}
      <span
        className="absolute bottom-0 rounded-sm"
        style={{
          left: pct(s.q1),
          width: `${Math.max(0.6, s.q3 - s.q1)}%`,
          height: "100%",
          background: "var(--wash)",
        }}
      />
      {/* 중앙값 */}
      <span
        className="absolute bottom-0 w-[2px]"
        style={{
          left: pct(s.median),
          height: "100%",
          background: "var(--ink-muted)",
        }}
      />

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
