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
    **요약 문장에서 α가 기준 아래인 축을 뺀다** (2026-08-25 화면에서 확인).

    「가장 다들 비슷한 축은 협력입니다」라고 나왔는데, 협력은 문항이 안
    맞물려서(α .08) 점수가 거의 가운데로 몰린 것이다. **다들 비슷한 게
    아니라 못 재고 있는 것**인데 문장은 발견처럼 말한다.

    쓸 만한 축이 하나도 없으면 문장 자체를 내린다.
  */
  /*
    직무능력은 α로 판정하지 않으므로(D-93) 「못 재고 있는 것일 수 있다」는
    단서도 **성향 축에만** 붙는다.
  */
  const usable = ranked.filter(
    (s) => reliability[s.scale]?.verdict !== "poor" || s.kind === "ability",
  );
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
            점 하나가 한 사람입니다. 같은 자리에 여러 명이면 위로 쌓입니다 —{" "}
            <strong>쌓인 높이가 곧 인원</strong>입니다. 마우스를 올리면 누구인지
            나옵니다.
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
        <p className="text-ink-secondary mb-10 max-w-[52rem] leading-relaxed">
          가장 크게 갈리는 축은{" "}
          <strong className="text-ink">{widest.scale}</strong>입니다 (
          <span className="tabular">{Math.round(widest.min)}</span>부터{" "}
          <span className="tabular">{Math.round(widest.max)}</span>까지). 가장
          다들 비슷한 축은{" "}
          <strong className="text-ink">{tightest.scale}</strong>이고, 이 축으로는
          사람을 구분하기 어렵습니다.
          {usable.length < ranked.length && (
            <span className="text-ink-muted">
              {" "}
              문항이 아직 안 맞물리는 축은 이 문장에서 뺐습니다 — 좁게 모인
              것이 아니라 못 재고 있는 것일 수 있습니다.
            </span>
          )}
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
          <strong>옅은 상자는 가운데 절반</strong>(4분의 1 ~ 4분의 3), 세로선은
          중앙값입니다. 상자가 좁으면 다들 비슷하고, 넓으면 사람마다 많이
          다릅니다. 점이 두 덩어리로 갈라져 있으면 회사가 그 축에서 두 무리로
          나뉜다는 뜻입니다.
        </p>
        <p>
          <strong>평균을 앞에 두지 않았습니다.</strong> 이 눈금은 문항 가운데를
          50으로 잡은 것이라 비교할 바깥 기준이 없습니다 —{" "}
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
