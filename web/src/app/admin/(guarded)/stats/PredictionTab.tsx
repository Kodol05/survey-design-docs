import { WarningBadge } from "@/components/ui/WarningBadge";
import { Note } from "@/components/ui/Note";
import { MIN_N } from "@/components/ui/NBadge";
import { ResearchCompare } from "@/components/analysis/ResearchCompare";
import { compareToResearch } from "@/lib/admin/researchCompare";
import { ABILITY_AXES } from "@/lib/items/types";
import type { loadPeople, traitAbilityMatrix } from "@/lib/admin/analysis";
import {
  predictComposite,
  predictFromResearch,
} from "@/lib/admin/researchPrediction";
import { PredictionPanel } from "./PredictionPanel";

type People = Awaited<ReturnType<typeof loadPeople>>;

// ── 계산식 ──────────────────────────────────────────────────────────

/**
 * **논문이 본 것과 우리가 잰 것** — 두 절 (2026-08-25 사용자 결정).
 *
 *   1. 사람별 예측 대 실제 — 논문 가중치로 계산한 값과 실제 값
 *   2. 논문 값과 우리 값 — 상관 하나하나를 막대 두 개로 맞댐
 *
 * 2절은 「직무능력과 기질·성격」 탭 아래쪽에 있던 것을 옮겨 왔다. 그 탭은
 * **우리 데이터 안의 이야기**를 하는 자리인데, 연구값 대조는 **바깥과
 * 맞대는 이야기**라 여기가 제자리다. 같은 물음의 답이 두 탭으로 흩어져
 * 있었다.
 */
export function PredictionTab({
  people,
  matrix,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
}) {
  /*
    맨 끝에 **세 능력을 묶은 값**도 둔다 (2026-08-26 사용자 요청).

    축 하나하나는 잡음이 커서 예측이 잘 안 맞을 수 있는데, 셋을 묶으면 그
    잡음이 상쇄되어 대개 더 잘 맞는다. 「전반적으로 일이 되는 사람」을 성격으로
    얼마나 짚을 수 있는지는 **축 하나로는 답할 수 없는 물음**이다.

    순서는 맨 뒤다 — 실제 축 셋을 먼저 보고 나서 묶은 것을 보는 것이 맞다.
  */
  const items = [
    ...ABILITY_AXES.map((axis) => predictFromResearch(people, axis)),
    predictComposite(people),
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  const missing = ABILITY_AXES.filter((a) => !items.some((i) => i.axis === a));

  return (
    <section>
      {/*
        **제목만 위에 둔다** (2026-08-25 사용자 요청). 설명 세 줄을 지나야
        숫자가 나오면 화면을 열 때마다 같은 문장을 다시 읽게 된다. 요약 타일과
        그림이 먼저 오고, 「이게 뭐였지」는 아래에서 답한다.
      */}
      <h2 className="text-section-title mb-6">논문이 본 것과 우리가 잰 것</h2>

      {items.length === 0 ? (
        <>
          <WarningBadge kind="smallSample" />
          <p className="text-ink-secondary mt-4">
            아직 맞대 볼 만큼 모이지 않았거나, 쓸 수 있는 논문 값이 없습니다.
          </p>
        </>
      ) : (
        <PredictionPanel items={items} missing={missing} />
      )}

      <Note label="이 화면이 무엇을 보여주는지" className="mt-8">
        <p>
          논문 상관을 가중치로 삼아{" "}
          <strong>이 사람의 직무능력이 얼마쯤일지 계산</strong>하고 실제 값과
          나란히 놓았습니다. 어긋난다면{" "}
          <strong>우리 회사가 논문과 다르거나, 그 사람이 남다르거나</strong>
          입니다.
        </p>
      </Note>

      <Note label="이 예측을 어디까지 믿을 수 있는지" className="mt-3 mb-16">
        <p className="mb-2">
          <strong>서로 다른 논문에서 온 값을 한 식에 넣습니다.</strong> 표본도
          지표도 나라도 달라서 대략의 눈금이지 정밀한 값이 아닙니다. 그리고
          논문이 주는 것은 <strong>모양이지 눈금이 아니라서</strong>, 점수로
          되돌릴 때 우리 데이터의 퍼진 정도를 빌립니다.
        </p>
        <p>
          그래도 <strong>바깥에서 온 값</strong>이라는 것이 요점입니다. 우리
          데이터로 만든 식으로 우리 데이터를 맞추면 답이 거의 늘 「맞는다」가
          됩니다.
        </p>
      </Note>

      {/* ── 2절 · 상관 하나하나를 맞대 본다 ── */}
      <div className="border-t border-[--border] pt-14">
        <h2 className="text-section-title mb-3">논문 값과 우리 값</h2>
        <p className="text-ink-secondary mb-6 max-w-[52rem]">
          막대 두 개가 한 쌍이고 위가 논문, 아래가 우리 회사입니다.{" "}
          <strong>끝이 비슷하면 맞은 것</strong>입니다.
        </p>

        {matrix.enough ? (
          <ResearchCompare data={compareToResearch(matrix)} />
        ) : (
          <>
            <WarningBadge kind="smallSample" />
            <p className="text-ink-secondary mt-4">
              우리 회사 값이 아직 없어 맞대 볼 수 없습니다. {MIN_N}명이 넘으면
              나옵니다.
            </p>
          </>
        )}

        <Note label="논문 값을 어떻게 읽는지" className="mt-10">
          <p className="mb-2">
            판정 기준은{" "}
            <strong>논문 값이 우리 95% 신뢰구간 안에 들어오는가</strong>입니다.
            두 숫자를 빼서 크면 다르다고 하지 않습니다 — 우리 값은 40명 남짓에서
            나온 것이라 원래 흔들립니다. 사람이 늘어 구간이 좁아질수록 판정이
            날카로워집니다.
          </p>
          <p>
            <strong>서로 다른 연구에서 온 값</strong>이라 칸끼리 견줄 수는
            없습니다. 각 칸을 우리 값과만 맞대 보십시오. 논문 값은 사람이 늘어도
            바뀌지 않고 점수 계산에도 쓰지 않습니다.
          </p>
        </Note>
      </div>
    </section>
  );
}
