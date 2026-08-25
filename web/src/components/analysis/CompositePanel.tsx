import { formatR } from "./correlationColor";
import { formatRatio } from "./correlationColor";
import { Note } from "../ui/Note";
import { SplitHeadline, SplitList } from "./SplitPanel";
import type { Point } from "./ScatterPlot";
import type { Split } from "@/lib/admin/split";
import { DivergingBar } from "./DivergingBar";
import type { Composite } from "@/lib/admin/composite";

/**
 * 세 능력을 묶은 값이 **무엇과 가장 연관되는가** (2026-08-25 사용자 요청).
 *
 * ## 이 화면이 답하는 것
 *
 * 위쪽 표는 「협력은 무엇과」, 「조직생활은 무엇과」를 따로 말한다. 그런데
 * 실제로 궁금한 것은 그다음이다 — **「전반적으로 일이 되는 사람은 어떤
 * 사람인가」.** 축 하나하나로는 그 답이 안 나온다.
 *
 * ## 묶어도 된다는 근거를 먼저 보여준다
 *
 * 서로 다른 것을 재는 축을 더하면 총합은 아무 뜻도 없어진다. 그래서 축끼리의
 * 상관과 묶었을 때의 α를 **결과보다 먼저** 둔다. 근거가 약하면 아래 그래프를
 * 읽지 말라는 뜻이고, 근거가 있으면 마음 놓고 읽으라는 뜻이다.
 *
 * 우리 데이터에서는 셋이 `+.33 ~ +.36`으로 묶여 α가 `.60`이 나온다 —
 * **개별 축보다 총합이 더 안정적이다.** 협력 하나는 `.08`이라 못 쓰는데,
 * 평균을 내면 각 축의 잡음이 상쇄되고 셋이 공유하는 부분만 남는다.
 */
export function CompositePanel({
  c,
  splits,
  scatter,
  trends,
}: {
  c: Composite;
  splits: Split[];
  /** `축이름` → 점(가로 성향, 세로 세 능력 평균). 줄을 눌렀을 때 그린다 */
  scatter?: Record<string, Point[]>;
  trends?: Record<string, { x: number; y: number }[] | null>;
}) {
  const shaky = c.verdict === "poor";

  return (
    <div>
      {/* ── 결론부터 ── */}
      <SplitHeadline splits={splits} />

      {/* ── 일곱 축 전부 — 위 절과 같은 줄 모양 ── */}
      <div className="mt-8">
        <p className="text-axis text-ink-muted mb-3">
          일곱 축 전부 — 차이가 큰 순 · 무리마다{" "}
          <span className="tabular">{splits[0]?.groupN ?? 0}</span>명
        </p>
        <SplitList splits={splits} scatter={scatter} trends={trends} />
      </div>

      {/*
        **해설은 접어 둔다** (2026-08-25 사용자 요청).

        어떻게 잰 것인지·왜 물음표가 붙는지·묶어도 되는지 — 셋 다 필요한
        말인데 **늘 펴 두면 표보다 설명이 길어진다.** 처음 한 번 읽으면
        되는 것들이라 접고, 궁금할 때 누른다.

        접힌 줄에 무엇에 대한 설명인지는 남는다 — 「설명 보기」처럼 내용
        없는 말은 쓰지 않는다.
      */}
      <div className="mt-6 flex flex-col gap-2">
        <Note label="어떻게 잰 것인지">
          <p className="mb-2">
            협력·조직생활·자율적 실행 <strong>세 값의 평균</strong>을 낸 다음,
            성향 축마다 <strong>높은 3분의 1</strong>과{" "}
            <strong>낮은 3분의 1</strong>로 갈라 그 평균을 견줍니다. 절반으로
            자르면 가운데 애매한 사람들이 섞여 차이가 흐려집니다.
          </p>
          <p>
            <strong>「높을수록 ?」는 아직 확정이 아니라는 뜻</strong>입니다.
            무리마다 <span className="tabular">{splits[0]?.groupN ?? 0}</span>
            명뿐이라 관계가 없어도 몇 점 차이는 그냥 납니다.
          </p>
        </Note>

        <Note label="평균을 낼 만한가">
          <ul className="mb-3 flex flex-col gap-1.5">
            {c.pairs.map((p) => (
              <li key={`${p.a}${p.b}`} className="flex items-center gap-3">
                <span className="w-[11rem] shrink-0">
                  {p.a} <span className="text-ink-muted">×</span> {p.b}
                </span>
                <span className="block w-full max-w-[7rem] shrink">
                  <DivergingBar r={p.r} height={11} />
                </span>
                <span className="tabular w-11 shrink-0 text-right">
                  {formatR(p.r)}
                </span>
              </li>
            ))}
          </ul>
          <p>
            세 능력이 서로 같이 움직여야 평균이 뜻을 갖습니다. 묶으면{" "}
            {c.alpha !== null && (
              <strong
                className="tabular"
                style={{ color: shaky ? "var(--status-critical)" : undefined }}
              >
                α {formatRatio(c.alpha)}
              </strong>
            )}
            {shaky ? (
              <>
                {" "}
                — <strong>아직 묶을 만하지 않습니다.</strong>
              </>
            ) : (
              <>
                {" "}
                입니다. 뜻밖에도 <strong>개별 축보다 안정적입니다</strong> —
                평균을 내면 각 축의 잡음이 서로 상쇄되기 때문입니다.
              </>
            )}{" "}
            <span className="text-ink-muted">
              세 축이 다 있는 <span className="tabular">{c.values.length}</span>
              명만 셉니다.
            </span>
          </p>
        </Note>
      </div>
    </div>
  );
}
