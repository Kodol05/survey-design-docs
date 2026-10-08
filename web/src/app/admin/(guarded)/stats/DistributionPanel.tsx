"use client";

import { useState } from "react";
import {
  DensityRidge,
  type RidgeGroup,
} from "@/components/analysis/DensityRidge";
import { Note } from "@/components/ui/Note";
import { Panel } from "@/components/ui/Panel";
import { COMPOSITE_AXIS } from "@/lib/items/types";
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
 * ## 카드 하나, 언덕 그림 하나 (2026-10-07 사용자 결정)
 *
 * 축마다 점을 쌓던 그림을 **축마다 언덕 한 줄**로 바꾸고, 열 줄을 카드
 * 하나에 포개 가로 눈금 하나를 함께 쓰게 했다. 줄마다 눈금을 따로 달면
 * 같은 50이 줄마다 다른 자리처럼 보인다.
 *
 * 그림 위의 글은 모두 걷었다 — 「가장 많이 갈리는 축은…」 요약 문장, 「점
 * 하나가 한 사람」 안내, 색 열쇠. 언덕 모양이 요약을 대신하고, 읽는 법은
 * 맨 아래 접힌 설명으로 내렸다.
 *
 * ## 두 가지 순서로 볼 수 있다
 *
 *   묶음 순서   기질 4 → 성격 3 → 직무능력 3. 검사 구조대로 읽을 때
 *   갈리는 순서  퍼진 정도(표준편차)가 큰 축부터. 「무엇이 사람을 가르나」를 볼 때
 *
 * 둘 중 하나만 두면 나머지 물음에 답할 수 없다. 순서를 바꾸는 것뿐이라
 * 주소를 건드리지 않는다 — 화면 안에서 바로 바뀐다.
 *
 * ## 이름을 글로 적지 않는다
 *
 * 「가장 낮은 사람」을 글자로 박아 두지 않는다. 성향은 높고 낮음이 있어도
 * 좋고 나쁨이 없는데(첫 화면에 그렇게 적어 두었다), 이름을 꼴찌 자리에
 * 적어 두면 그 약속이 깨진다. 눈금에 마우스를 올리면 누구인지 나오고,
 * 직무능력의 순서는 「순위」 탭이 따로 맡는다.
 */

const TITLE = "성향·직무능력 분포";

/** 묶어 만든 값의 이름 */
const COMPOSITE = COMPOSITE_AXIS;

const GROUP = {
  temperament: "기질",
  character: "성격",
  ability: "직무능력",
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
      <Panel title={TITLE}>
        <p className="text-ink-secondary">
          아직 그려 볼 값이 없습니다. 응시가 끝난 사람이 두 명은 넘어야 합니다.
        </p>
      </Panel>
    );

  const row = (s: Spread) => ({
    s,
    dim: s.kind !== "ability" && reliability[s.scale]?.verdict === "poor",
  });

  /*
    **묶어 만든 값은 갈리는 순서에 끼우지 않고 맨 아래에 둔다** (2026-10-07
    사용자 결정).

    「세 능력 평균」은 평균이라 **자동으로 좁게 모인다** — 각 축의 흔들림이
    상쇄되기 때문이다 (2026-08-25 사용자 지적, D-45와 같은 함정). 퍼진
    정도로 줄 세우면 늘 맨 끝에 가서 「가장 비슷한 축」처럼 읽히는데, 그건
    발견이 아니라 만드는 방식이 만든 모양이다. 두 순서 모두 맨 아래 따로 둔다.
  */
  const composite = spreads.find((s) => s.scale === COMPOSITE);
  const axes = spreads.filter((s) => s.scale !== COMPOSITE);

  const groups: RidgeGroup[] = bySpread
    ? [
        {
          key: "all",
          rows: [...axes].sort((a, b) => b.sd - a.sd).map(row),
        },
        ...(composite
          ? [{ key: "composite", label: "묶은 값", rows: [row(composite)] }]
          : []),
      ]
    : (["temperament", "character", "ability"] as const)
        .map((k) => ({
          key: k,
          label: GROUP[k],
          // 세 능력 평균은 직무능력 묶음의 맨 끝 (spreads가 이미 그 순서다)
          rows: spreads.filter((s) => s.kind === k).map(row),
        }))
        .filter((g) => g.rows.length > 0);

  const toggle = (
    <div className="flex gap-1.5" role="group" aria-label="줄 순서">
      {[
        { on: false, label: "묶음 순서" },
        { on: true, label: "갈리는 순서" },
      ].map((b) => (
        <button
          key={b.label}
          type="button"
          aria-pressed={bySpread === b.on}
          onClick={() => setBySpread(b.on)}
          className="rounded-md px-3 py-1"
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
  );

  return (
    <Panel title={TITLE} aside={toggle}>
      <DensityRidge groups={groups} label={TITLE} />

      <Note label="이 그림을 어떻게 읽는지" className="mt-6">
        <p className="mb-2">
          <strong>봉우리</strong>가 높은 곳에 사람이 많이 몰려 있습니다.
          봉우리가 둘이면 회사가 두 무리로 나뉜다는 뜻입니다.{" "}
          <strong>진한 구간</strong>은 가운데 절반, <strong>세로선</strong>은
          중앙값입니다. 진한 구간이 좁으면 다들 비슷하고 넓으면 많이 다릅니다.
        </p>
        <p className="mb-2">
          바닥의 <strong>눈금 하나가 한 사람</strong>입니다. 마우스를 올리면
          이름과 점수가 나옵니다.
        </p>
        <p className="mb-2">
          줄마다 봉우리 높이를 맞춰 그렸으므로 줄끼리 높이를 견주지 않습니다.
          퍼진 정도는 폭으로 봅니다. 흐린 줄은 문항끼리 잘 맞지 않은 축입니다.
        </p>
        <p>
          <strong>점수 자체는 높고 낮음을 뜻하지 않습니다.</strong> 눈금이 문항
          가운데를 50으로 잡은 것이라 <strong>사내에서 서로 견주는 것만</strong>{" "}
          말이 됩니다.
        </p>
      </Note>
    </Panel>
  );
}
