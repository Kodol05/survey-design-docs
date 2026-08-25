import { CHARACTER } from "../charts/scale";
import { subjectParticle } from "./correlationWords";
import { SplitDumbbell, splitSentence } from "./SplitDumbbell";
import type { Split } from "@/lib/admin/split";

/**
 * 축이 높은 무리와 낮은 무리를 갈라, 대상 값의 평균을 견주는 목록.
 *
 * **차이가 큰 순으로** 줄 세운다 — 이 화면이 답하는 물음이 「무엇이 가장
 * 크게 가르나」이기 때문이다. 순위 숫자를 앞에 달아 두면 위에서 셋만 읽어도
 * 답이 나온다.
 */
export function SplitList({
  splits,
  dim = false,
  showRank = true,
}: {
  splits: Split[];
  dim?: boolean;
  showRank?: boolean;
}) {
  if (splits.length === 0)
    return (
      <p className="text-ink-muted text-axis">아직 갈라 볼 만큼 모이지 않았습니다.</p>
    );

  return (
    <ul className="flex flex-col">
      {splits.map((s, i) => (
        <li
          key={s.scale}
          className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3.5rem] items-center gap-x-5 border-b border-[--border] py-3 last:border-0 xl:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3.5rem_minmax(0,14rem)]"
        >
          <span className="flex items-baseline gap-2">
            {/*
              **확정 안 된 줄의 순위는 흐리게.** 위 문장에서는 확정된 것만
              순위로 부르는데 여기서만 전부 번호를 달면 앞뒤가 어긋난다.
              번호를 지우지는 않는다 — 정렬 순서를 읽는 데 쓰인다.
            */}
            {showRank && (
              <span
                className="text-axis text-ink-muted tabular w-4 text-right"
                style={{ opacity: s.settled ? 1 : 0.45 }}
              >
                {i + 1}
              </span>
            )}
            <span className="text-table truncate">{s.scale}</span>
            <span className="text-axis text-ink-muted shrink-0">
              {(CHARACTER as readonly string[]).includes(s.scale) ? "성격" : "기질"}
            </span>
          </span>

          <SplitDumbbell s={s} dim={dim} />

          <span className="text-table tabular text-right font-medium">
            {/* 0에는 부호를 붙이지 않는다 — 「+0」은 방향이 있다는 뜻으로 읽힌다 */}
            {Math.round(s.diff) === 0 ? "0" : s.diff > 0 ? "+" : "−"}
            {Math.abs(Math.round(s.diff)) || ""}
          </span>

          {/* 넓은 화면에서만 글을 같이 둔다. 좁으면 그림과 숫자로 충분하다 */}
          <span className="text-axis text-ink-secondary hidden xl:block">
            {splitSentence(s)}
            {!s.settled && (
              <span className="text-ink-muted"> · 아직 확정 아님</span>
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
 * 「인내력이 높으면 직무능력 평균이 제일 높았습니다. 연대감이 높으면 두
 * 번째로 높았습니다.」 — 이렇게 옮겨 적을 수 있는 말이 나와야 회의에서
 * 쓸 수 있다. 그림은 그다음이다.
 *
 * ⚠️ **확정된 것만 순위로 말한다.** 구간이 0을 걸치는 축을 「세 번째」라고
 *    부르면 없는 순서를 만드는 셈이다. 확정된 것이 셋이 안 되면 그만큼만
 *    말한다.
 */
export function SplitHeadline({ splits }: { splits: Split[] }) {
  const settled = splits.filter((s) => s.settled).slice(0, 3);
  const ORD = ["가장", "두 번째로", "세 번째로"];

  if (settled.length === 0)
    return (
      <p className="text-item text-ink-secondary max-w-[52rem] leading-relaxed">
        아직 <strong>방향이 확정된 축이 없습니다.</strong> 무리마다 13명
        안팎이라 이 정도 차이는 관계가 없어도 나옵니다. 사람이 더 모이면
        갈립니다.
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
