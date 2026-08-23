/**
 * 성향 프로필 — TCI 결과지 형식
 *
 * 축 이름을 위 가운데 두고, 아래에 낮음↔높음 눈금을 깔고, 값이 있는 자리에
 * 점과 숫자를 찍는다. 상자를 두르지 않는다.
 *
 * 기질과 성격을 나눠 보여준다. 08의 첫 문장이 "타고난 기질과 살면서 형성된
 * 성격을 나눠 재고"이므로 화면에서도 갈라져 있어야 한다.
 *
 * 눈금은 **범위 대비 %**다. 전 문항 최저가 0, 중립이 50, 최고가 100이다.
 * 백분위가 아니다 — 사내 상대위치는 개인 화면에 표시하지 않는다 (00 D-09).
 */

import { POLES } from "@/lib/interpretation/poles";

export type ProfileRow = {
  scale: string;
  percent: number;
  band: "lower" | "middle" | "upper";
};

/** 기질(타고난 것) 4축 · 성격(형성된 것) 3축 — 00 §2.9 */
export const TEMPERAMENT = ["자극추구", "위험회피", "사회적민감성", "인내력"];
export const CHARACTER = ["자율성", "연대감", "자기초월"];

const BAND_LABEL = { lower: "낮은 편", middle: "보통", upper: "높은 편" } as const;

/**
 * 왼쪽으로 갈수록 보라가 진해지고 오른쪽으로 갈수록 주황이 진해진다.
 * 가운데는 바탕에 가까워서 "어느 쪽도 아님"으로 읽힌다.
 *
 * 빨강↔초록을 쓰지 않는다. 낮음이 틀린 것도 높음이 맞는 것도 아닌데
 * 빨강·초록은 오답·정답으로 읽힌다.
 */
const STOPS: [number, string][] = [
  [0, "#8b7ad6"],
  [20, "#b6abe3"],
  [38, "#ded9ec"],
  [50, "#eceae4"],
  [62, "#f3decb"],
  [80, "#eec091"],
  [100, "#e5904e"],
];

const GRADIENT = `linear-gradient(90deg, ${STOPS.map(([p, c]) => `${c} ${p}%`).join(", ")})`;

/**
 * 라벨용 색은 바 색보다 진하다.
 * 바에 쓰는 옅은 색을 작은 글자에 그대로 쓰면 대비가 모자라 안 읽힌다.
 */
const LOW_INK = "#5f4fb8";
const HIGH_INK = "#99551a";

/** 눈금 위 그 자리의 색. 점 안쪽을 이 색으로 채워 위치를 색으로도 알 수 있게 한다. */
function colorAt(pct: number): string {
  const x = Math.max(0, Math.min(100, pct));
  let i = 0;
  while (i < STOPS.length - 2 && x > STOPS[i + 1][0]) i++;
  const [p0, c0] = STOPS[i];
  const [p1, c1] = STOPS[i + 1];
  const t = p1 === p0 ? 0 : (x - p0) / (p1 - p0);
  const mix = (a: string, b: string, k: number) =>
    Math.round(parseInt(a, 16) + (parseInt(b, 16) - parseInt(a, 16)) * k)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(c0.slice(1, 3), c1.slice(1, 3), t)}${mix(c0.slice(3, 5), c1.slice(3, 5), t)}${mix(c0.slice(5, 7), c1.slice(5, 7), t)}`;
}

function Row({ row }: { row: ProfileRow }) {
  const x = Math.max(0, Math.min(100, row.percent));
  const poles = POLES[row.scale];
  return (
    <div className="py-8">
      <p className="mb-3 text-center">
        <span className="text-2xl font-medium">{row.scale}</span>
        <span className="text-ink-muted text-table ml-2">{BAND_LABEL[row.band]}</span>
      </p>

      <div className="flex items-start gap-6">
        <span className="w-14 shrink-0 pt-1 text-right font-medium" style={{ color: LOW_INK }}>
          낮음
        </span>

        <div className="relative flex-1 pb-7">
          <div className="h-4 w-full rounded-full" style={{ background: GRADIENT }} />

          {/* 값이 있는 자리에 점, 그 바로 아래에 숫자 */}
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${x}%` }}
          >
            <span
              className="flex size-7 items-center justify-center rounded-full ring-4"
              style={{
                background: "var(--ink)",
                ["--tw-ring-color" as string]: "var(--page)",
                marginTop: -6,
              }}
            >
              <span
                className="block size-3.5 rounded-full"
                style={{ background: colorAt(row.percent) }}
              />
            </span>
            <span className="tabular mt-1.5 font-semibold">
              {Math.round(row.percent)}
            </span>
          </div>
        </div>

        <span className="w-14 shrink-0 pt-1 font-medium" style={{ color: HIGH_INK }}>
          높음
        </span>
      </div>

      {/* 낮을 때·높을 때가 어떤 모습인지. 해당하는 쪽을 진하게 둔다. */}
      {poles && (
        <div className="text-table mt-3 flex gap-10">
          <p
            className={`flex-1 ${row.band === "lower" ? "text-ink" : "text-ink-muted"}`}
          >
            {poles.low}
          </p>
          <p
            className={`flex-1 text-right ${row.band === "upper" ? "text-ink" : "text-ink-muted"}`}
          >
            {poles.high}
          </p>
        </div>
      )}
    </div>
  );
}

export function TraitProfile({ rows }: { rows: ProfileRow[] }) {
  const byScale = new Map(rows.map((r) => [r.scale, r]));
  const group = (names: string[]) =>
    names.map((n) => byScale.get(n)).filter((r): r is ProfileRow => Boolean(r));

  return (
    <div>
      <section>
        <h3 className="text-section-title text-ink-secondary mb-4 border-b border-[--border] pb-3">
          기질 <span className="text-ink-muted text-table font-normal">— 타고난 부분</span>
        </h3>
        {group(TEMPERAMENT).map((r) => (
          <Row key={r.scale} row={r} />
        ))}
      </section>

      <section className="mt-14">
        <h3 className="text-section-title text-ink-secondary mb-4 border-b border-[--border] pb-3">
          성격{" "}
          <span className="text-ink-muted text-table font-normal">— 살면서 형성된 부분</span>
        </h3>
        {group(CHARACTER).map((r) => (
          <Row key={r.scale} row={r} />
        ))}
      </section>
    </div>
  );
}
