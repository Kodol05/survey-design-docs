import { formatR } from "./correlationColor";
import { SplitHeadline, SplitList } from "./SplitPanel";
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
}: {
  c: Composite;
  splits: Split[];
}) {
  const shaky = c.verdict === "poor";

  return (
    <div>
      {/* ── 결론부터 ── */}
      <SplitHeadline splits={splits} />

      {/* ── 일곱 축 전부 ── */}
      <div className="mt-10">
        <div className="text-axis text-ink-muted mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span>일곱 축 전부 — 차이가 큰 순</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="block size-2.5 rounded-full"
                style={{ background: "var(--ink-muted)" }}
              />
              높은 무리
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="block size-2.5 rounded-full"
                style={{ outline: "2px solid var(--ink-muted)", outlineOffset: -2 }}
              />
              낮은 무리
            </span>
            <span>
              무리마다 <span className="tabular">{splits[0]?.groupN ?? 0}</span>명
            </span>
            <span>눈금 40·60·80점</span>
          </span>
        </div>
        <SplitList splits={splits} dim={shaky} />
      </div>

      {/* ── 묶어도 되는가 ── */}
      <div className="mt-10 grid gap-x-14 gap-y-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start">
        <ul className="flex flex-col gap-1.5">
          {c.pairs.map((p) => (
            <li key={`${p.a}${p.b}`} className="text-axis flex items-center gap-3">
              <span className="text-ink-secondary w-[11rem] shrink-0">
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

        <p className="text-axis text-ink-secondary max-w-[44rem] leading-relaxed">
          <strong>평균을 낼 만한가</strong> — 세 능력이 서로 같이 움직여야
          평균이 뜻을 갖습니다. 셋을 묶으면{" "}
          {c.alpha !== null && (
            <strong
              className="tabular"
              style={{ color: shaky ? "var(--status-critical)" : undefined }}
            >
              α {c.alpha.toFixed(2).replace(/^0/, "")}
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
              입니다. 뜻밖에도 <strong>개별 축보다 안정적입니다</strong> — 평균을
              내면 각 축의 잡음이 서로 상쇄되기 때문입니다.
            </>
          )}{" "}
          <span className="text-ink-muted">
            세 축이 다 있는 <span className="tabular">{c.values.length}</span>
            명의 평균이고, 눈금은 그대로 0~100입니다.
          </span>
        </p>
      </div>
    </div>
  );
}
