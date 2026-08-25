import { CHARACTER } from "../charts/scale";
import { subjectParticle } from "./correlationWords";
import { DivergingBar } from "./DivergingBar";
import type { Split } from "@/lib/admin/split";

/**
 * 축이 높은 무리와 낮은 무리를 갈라, **직무능력 평균이 몇 점 차이인지**.
 *
 * ## 위 절과 같은 모양으로 (2026-08-25 사용자 정정)
 *
 * 한때 여기에 점 두 개를 선으로 잇는 덤벨 그림을 썼다. 점수 눈금 위에 두
 * 무리를 찍는 방식이라 그 자체로는 정확했는데, **바로 위 「능력마다」 절과
 * 모양이 달라서** 두 화면이 머릿속에서 이어지지 않았다.
 *
 * 지금은 위 절과 **같은 줄 모양**을 쓴다 — 순위 · 축 이름 · 0을 가운데 둔
 * 막대 · 숫자 · 방향. 다른 것은 **눈금뿐이다**: 위는 상관계수, 여기는
 * 점수 차이. 그 차이는 숫자에 「점」을 붙여 말한다.
 *
 * ## 막대 길이는 이 목록 안에서만 견준다
 *
 * 점수 차이에는 상관의 `.7` 같은 자연스러운 상한이 없다. 그래서 이 목록의
 * **가장 큰 값**에 맞춰 눈금을 잡는다 — 목록 안에서 서로 견주는 데는
 * 충분하고, 밖의 숫자와 견줄 일은 없다. 차이가 다 작을 때 막대가 과장되지
 * 않도록 최소 눈금을 둔다.
 */

/** 눈금 최소 폭(점) */
const MIN_FULL = 10;

export function SplitList({
  splits,
  dim = false,
}: {
  splits: Split[];
  dim?: boolean;
}) {
  if (splits.length === 0)
    return (
      <p className="text-ink-muted text-axis">
        아직 갈라 볼 만큼 모이지 않았습니다.
      </p>
    );

  const full = Math.max(MIN_FULL, ...splits.map((s) => Math.abs(s.diff)));

  return (
    <ul className="flex flex-col" style={{ opacity: dim ? 0.55 : 1 }}>
      {splits.map((s, i) => (
          <li
            key={s.scale}
            className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_4rem_7rem] items-center gap-x-5 border-b border-[--border] py-2.5 last:border-0"
          >
            <span className="flex items-baseline gap-2">
              <span
                className="text-axis text-ink-muted tabular w-4 text-right"
                style={{ opacity: s.settled ? 1 : 0.45 }}
              >
                {i + 1}
              </span>
              <span className="text-table truncate">{s.scale}</span>
              <span className="text-axis text-ink-muted shrink-0">
                {(CHARACTER as readonly string[]).includes(s.scale)
                  ? "성격"
                  : "기질"}
              </span>
            </span>

            {/*
              **위 절과 똑같은 막대를 쓴다.** 눈금만 다르다 — 저기는 상관,
              여기는 점수 차이. 레일까지 같이 오므로 0이 어디인지가 보인다.
            */}
            <DivergingBar
              r={s.diff}
              full={full}
              faded={!s.settled}
              height={16}
              title={`높은 무리 ${Math.round(s.upperMean)}점 · 낮은 무리 ${Math.round(s.lowerMean)}점`}
            />

            <span className="text-table tabular text-right font-medium">
              {Math.round(s.diff) === 0 ? "" : s.diff > 0 ? "+" : "−"}
              {Math.abs(Math.round(s.diff))}점
            </span>

            <span
              className="text-axis text-ink-secondary"
              style={{ opacity: s.settled ? 1 : 0.6 }}
            >
              {/* 0이면 방향이 없다. 「높을수록」이라 적으면 없는 방향을 만든다 */}
              {Math.round(s.diff) === 0 ? (
                "—"
              ) : (
                <>
                  {s.diff > 0 ? "높을수록" : "낮을수록"}
                  {!s.settled && <span aria-hidden> ?</span>}
                </>
              )}
            </span>
          </li>
        ))}
    </ul>
  );
}

/**
 * 위에서 셋을 **문장으로** 말한다 (2026-08-25 사용자 요청).
 *
 * 「연대감이 높으면 직무능력 평균이 가장 높았습니다 — 56점 대 47점, 9점
 * 차이.」 이렇게 옮겨 적을 수 있는 말이 나와야 회의에서 쓸 수 있다.
 *
 * ⚠️ **확정된 것만 순위로 말한다.** 구간이 0을 걸치는 축을 「세 번째」라고
 *    부르면 없는 순서를 만드는 셈이다.
 */
export function SplitHeadline({ splits }: { splits: Split[] }) {
  const settled = splits.filter((s) => s.settled).slice(0, 3);
  const ORD = ["가장", "두 번째로", "세 번째로"];

  if (settled.length === 0)
    return (
      <p className="text-item text-ink-secondary max-w-[52rem] leading-relaxed">
        아직 <strong>방향이 확정된 축이 없습니다.</strong> 무리마다{" "}
        <span className="tabular">{splits[0]?.groupN ?? 0}</span>명 안팎이라 이
        정도 차이는 관계가 없어도 나옵니다.
      </p>
    );

  return (
    <ol className="text-item flex max-w-[52rem] flex-col gap-2">
      {settled.map((s, i) => (
        <li key={s.scale} className="text-ink-secondary leading-relaxed">
          {/* 받침 없는 이름에서 「위험회피이」가 되지 않게 (D-76) */}
          <strong className="text-ink">
            {s.scale}
            {subjectParticle(s.scale)} {s.diff >= 0 ? "높으면" : "낮으면"}
          </strong>{" "}
          직무능력 평균이 <strong>{ORD[i]} 높았습니다</strong> —{" "}
          <span className="tabular">
            {Math.round(s.diff >= 0 ? s.upperMean : s.lowerMean)}점
          </span>{" "}
          대{" "}
          <span className="tabular">
            {Math.round(s.diff >= 0 ? s.lowerMean : s.upperMean)}점
          </span>
          , <strong className="tabular">{Math.abs(Math.round(s.diff))}점</strong>{" "}
          차이.
        </li>
      ))}
      {settled.length < 3 && (
        <li className="text-axis text-ink-muted">
          나머지 축은 아직 방향이 확정되지 않아 순위를 매기지 않았습니다.
        </li>
      )}
    </ol>
  );
}
