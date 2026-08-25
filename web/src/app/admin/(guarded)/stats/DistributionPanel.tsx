"use client";

import { useState } from "react";
import { DotStrip } from "@/components/analysis/DotStrip";
import { Note } from "@/components/ui/Note";
import type { Spread } from "@/lib/admin/spread";
import type { ScaleReliability } from "@/lib/admin/analysis";

/**
 * 분포 — **우리 회사 사람들이 각 축에서 어떻게 퍼져 있는가.**
 *
 * ## 이 화면의 자리
 *
 * 이 시스템이 보려는 것은 성향 7축과 직무능력의 **관계**다(그게 「직무능력과
 * 성향」 탭이다). 그런데 관계를 보기 전에 **「우리는 대체 어떤 사람들인가」**가
 * 먼저 궁금한 것이 자연스럽다. 그동안 그 답이 대시보드의 최소~최대 막대
 * 하나뿐이었다.
 *
 * ## 두 가지 순서로 볼 수 있다
 *
 *   묶음 순서   기질 4 → 성격 3 → 직무능력 3. 검사 구조대로 읽을 때
 *   갈리는 순서  퍼진 정도가 큰 축부터. 「무엇이 사람을 가르나」를 볼 때
 *
 * 둘 중 하나만 두면 나머지 물음에 답할 수 없다. 순서를 바꾸는 것뿐이라
 * 주소를 건드리지 않는다 — 화면 안에서 바로 바뀐다.
 *
 * ## 이름을 글로 적지 않는다
 *
 * 「가장 낮은 사람」을 글자로 박아 두지 않는다. 성향은 높고 낮음이 있어도
 * 좋고 나쁨이 없는데(첫 화면에 그렇게 적어 두었다), 이름을 꼴찌 자리에
 * 적어 두면 그 약속이 깨진다. 점에 마우스를 올리면 누구인지 나오고,
 * 직무능력의 순서는 「순위」 탭이 따로 맡는다.
 */

/** 묶어 만든 값의 이름. 요약 문장에서 뺄 때 쓴다 */
const COMPOSITE = "세 능력 묶음";

const GROUP = {
  temperament: { label: "기질", note: "타고나는 쪽 · TCI 4축" },
  character: { label: "성격", note: "살면서 만들어지는 쪽 · TCI 3축" },
  ability: { label: "직무능력", note: "우리가 만든 3축" },
} as const;

export function DistributionPanel({
  spreads,
  reliability,
}: {
  spreads: Spread[];
  reliability: Record<string, ScaleReliability>;
}) {
  const [bySpread, setBySpread] = useState(false);

  if (spreads.length === 0)
    return (
      <p className="text-ink-secondary">
        아직 그려 볼 값이 없습니다. 응시가 끝난 사람이 두 명은 넘어야 합니다.
      </p>
    );

  const ranked = [...spreads].sort((a, b) => b.sd - a.sd);

  /*
    **묶어 만든 값은 요약 문장에서 뺀다** (2026-08-25 사용자 지적).

    「세 능력 묶음」은 평균이라 **자동으로 좁게 모인다** — 각 축의 흔들림이
    상쇄되기 때문이다. 그것을 「가장 비슷한 축」이라 부르면 발견처럼 읽히는데,
    사실은 만드는 방식이 만들어낸 모양이다 (D-45와 같은 함정).
  */
  const usable = ranked.filter((s) => s.scale !== COMPOSITE);
  const widest = usable[0];
  const tightest = usable[usable.length - 1];

  const groups = bySpread
    ? [{ key: "all" as const, rows: ranked }]
    : (["temperament", "character", "ability"] as const)
        .map((k) => ({ key: k, rows: spreads.filter((s) => s.kind === k) }))
        .filter((g) => g.rows.length > 0);

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h2 className="text-section-title mb-1">어떻게 퍼져 있는가</h2>
          <p className="text-ink-secondary max-w-[52rem]">
            <strong>점 하나가 한 사람</strong>입니다. 겹치면 위로 쌓입니다.
          </p>
        </div>

        <div className="text-axis flex shrink-0 gap-1.5">
          {[
            { on: false, label: "묶음 순서" },
            { on: true, label: "갈리는 순서" },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => setBySpread(b.on)}
              className="rounded-md px-3 py-1.5"
              style={{
                background: bySpread === b.on ? "var(--ink)" : "var(--wash)",
                color: bySpread === b.on ? "var(--page)" : "var(--ink-secondary)",
                fontWeight: bySpread === b.on ? 600 : 400,
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* 한 줄 요약 — 훑기 전에 결론부터 */}
      {widest && tightest && widest !== tightest && (
        <p className="text-ink-secondary mb-10 max-w-[52rem]">
          사람이 가장 많이 갈리는 축은{" "}
          <strong className="text-ink">{widest.scale}</strong> (
          <span className="tabular">
            {Math.round(widest.min)}~{Math.round(widest.max)}
          </span>
          ), 가장 비슷한 축은{" "}
          <strong className="text-ink">{tightest.scale}</strong>입니다.
        </p>
      )}

      <div className="flex flex-col gap-12">
        {groups.map((g) => (
          <div key={g.key}>
            {g.key !== "all" && (
              <p className="text-table text-ink-secondary mb-5 border-b border-[--border] pb-2">
                {GROUP[g.key].label}
                <span className="text-axis text-ink-muted ml-2">
                  {GROUP[g.key].note}
                </span>
              </p>
            )}
            <div className="flex flex-col gap-8">
              {g.rows.map((s) => (
                <Row
                  key={s.scale}
                  s={s}
                  r={reliability[s.scale]}
                  dim={
                    s.kind !== "ability" &&
                    reliability[s.scale]?.verdict === "poor"
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Note label="이 그림을 어떻게 읽는지" className="mt-12">
        <p className="mb-2">
          <strong>상자는 가운데 절반</strong>, 세로선은 중앙값입니다. 상자가
          좁으면 다들 비슷하고 넓으면 많이 다릅니다. 점이 두 덩어리로 갈라져
          있으면 회사가 두 무리로 나뉜다는 뜻입니다.
        </p>
        <p>
          <strong>점수 자체는 높고 낮음을 뜻하지 않습니다.</strong> 눈금이 문항
          가운데를 50으로 잡은 것이라{" "}
          <strong>사내에서 서로 견주는 것만</strong> 말이 됩니다.
        </p>
      </Note>
    </section>
  );
}

function Row({
  s,
  r,
  dim,
}: {
  s: Spread;
  r?: ScaleReliability;
  dim: boolean;
}) {
  return (
    <div className="grid gap-x-6 gap-y-2 xl:grid-cols-[9rem_minmax(0,1fr)] xl:items-end">
      <div className="xl:pb-1">
        <p className="text-table font-medium">{s.scale}</p>
        {/*
          여기는 「어떻게 퍼져 있나」를 보는 자리다. α는 문항 이야기라
          곁다리이고, 직무능력에는 애초에 대지 않는 잣대다 (D-93).
          인원만 적는다.
        */}
        <span className="text-axis text-ink-muted tabular">{s.n}명</span>
      </div>

      <div>
        <DotStrip s={s} dim={dim} />
        <p className="text-axis text-ink-muted mt-1.5 flex flex-wrap gap-x-4">
          <span>
            중앙 <span className="tabular text-ink-secondary">{Math.round(s.median)}</span>
          </span>
          <span>
            가운데 절반{" "}
            <span className="tabular text-ink-secondary">
              {Math.round(s.q1)}–{Math.round(s.q3)}
            </span>
          </span>
          <span>
            전체{" "}
            <span className="tabular text-ink-secondary">
              {Math.round(s.min)}–{Math.round(s.max)}
            </span>
          </span>
          <span title="표준편차 — 클수록 사람마다 많이 다릅니다">
            퍼진 정도{" "}
            <span className="tabular text-ink-secondary">{s.sd.toFixed(1)}</span>
          </span>

        </p>
      </div>
    </div>
  );
}
