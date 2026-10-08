import { Note } from "@/components/ui/Note";
import { Panel } from "@/components/ui/Panel";
import { formatReliability } from "@/components/analysis/reliability";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import type { loadPersonQuality, loadReliability } from "@/lib/admin/analysis";
import { LowQualityList, QualityRanking } from "./PersonQuality";

/**
 * 검사 신뢰도 탭.
 *
 * ## 카드 셋으로 (2026-10-07 사용자 결정)
 *
 *   문항 일관성(α 표)  ·  신뢰도 위험(이름)
 *   사람별 응답 신뢰도(순위)
 *
 * 제목을 물음(「문항이 맞물리는가」)에서 짧은 이름으로 바꿨다. 제목 밑에
 * 붙어 있던 설명 줄은 지우거나 카드 맨 아래 접힌 설명으로 내렸다 — 표가
 * 먼저 보여야 한다. 숫자와 판정은 그대로다.
 */
export function ReliabilityTab({
  rows,
  quality,
}: {
  rows: Awaited<ReturnType<typeof loadReliability>>;
  quality: Awaited<ReturnType<typeof loadPersonQuality>>;
}) {
  const COLOR = {
    good: "var(--status-good)",
    fair: "var(--status-warn)",
    poor: "var(--status-critical)",
    unknown: "var(--ink-muted)",
  } as const;
  /*
    **직무능력은 이 표에 없다** (2026-08-25 사용자 결정).

    α는 「문항들이 **한 가지**를 재는가」를 잰다. TCI 축은 그 구조가 맞아서
    (잠재 특성이 15개 문항 응답을 일으킨다) α가 제 몫을 한다.

    직무능력 3축은 다르다. 「협력」은 내 몫 하기 + 미리 알리기 + 남 돕기가
    **모여서 이루는** 것이라 문항끼리 상관이 없어도 정상이다. 거기에 α를
    대고 「기준 아래」라 적으면 **잣대가 안 맞는 자로 재고 불합격을 주는**
    셈이다 (D-92에서 데이터로 확인).

    값을 감추는 것이 아니라 **판정을 하지 않는 것**이다 — 무엇으로 재야
    하는지(재검사)와 함께 카드 아래 접힌 설명에 적는다.
  */
  const GROUPS = [
    {
      label: "기질",
      note: "TCI 4축",
      has: (r: { scale: string; kind: string }) =>
        r.kind === "trait" &&
        (TEMPERAMENT as readonly string[]).includes(r.scale),
    },
    {
      label: "성격",
      note: "TCI 3축",
      has: (r: { scale: string; kind: string }) =>
        r.kind === "trait" &&
        (CHARACTER as readonly string[]).includes(r.scale),
    },
  ];

  const LABEL = {
    good: "괜찮음",
    fair: "보통",
    poor: "기준 아래",
    unknown: "계산 불가",
  } as const;

  const flagged = quality.filter((q) => q.flag !== "ok").length;
  /*
    순위 카드 머리줄의 평균. 전에는 순위 목록 안에서 문장으로 셌다
    (「평균 82점. 위가 앞뒤가 맞게 답한 쪽입니다.」) — 숫자만 머리줄로 올린다.
  */
  const scored = quality.filter((q) => q.agreement !== null);
  const meanAgreement = scored.length
    ? scored.reduce((n, q) => n + (q.agreement ?? 0), 0) / scored.length
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel title="문항 일관성" aside="척도별 신뢰도">
          <div className="flex flex-col gap-6">
            {GROUPS.map((g) => {
              const part = rows.filter((r) => g.has(r));
              if (part.length === 0) return null;
              return (
                <div key={g.label} className="overflow-x-auto">
                  <p className="text-table text-ink-secondary mb-1.5">
                    {g.label}
                    <span className="text-axis text-ink-muted ml-2">
                      {g.note}
                    </span>
                  </p>
                  <table className="text-table w-full min-w-[22rem]">
                    <thead>
                      <tr className="text-axis text-ink-muted border-b border-(--border)">
                        <th className="py-1.5 text-left font-medium">척도</th>
                        <th className="w-16 py-1.5 text-right font-medium">
                          문항
                        </th>
                        <th className="w-20 py-1.5 text-right font-medium">
                          신뢰도
                        </th>
                        <th className="w-28 py-1.5 pl-6 text-left font-medium">
                          판정
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {part.map((r) => (
                        <tr
                          key={r.scale}
                          className="border-b border-(--border) last:border-0"
                        >
                          <th
                            scope="row"
                            className="py-2 text-left font-normal"
                          >
                            {r.scale}
                          </th>
                          <td className="tabular py-2 text-right">
                            {r.itemCount}
                          </td>
                          <td className="tabular py-2 text-right font-medium">
                            {r.alpha === null ? "—" : formatReliability(r.alpha)}
                          </td>
                          <td
                            className="text-axis py-2 pl-6"
                            style={{ color: COLOR[r.verdict] }}
                          >
                            {LABEL[r.verdict]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {/*
              「α가 낮으면 그 상관은 볼 필요가 없다」고 적혀 있었다.
              D-92에서 뒤집은 결론인데 이 줄만 남아 있었다 (2026-08-25).
              제목 밑 설명 줄이던 것을 접힌 설명으로 내렸다 (2026-10-07).
            */}
            <Note label="신뢰도가 재는 것">
              <p className="mb-2">
                한 척도의 문항들이 같은 것을 재고 있는지를 봅니다(Cronbach&apos;s α).
              </p>
              <p>
                <strong>93%는 「결과가 93% 맞는다」는 뜻이 아닙니다.</strong> 사람들
                점수 차이 가운데 93%가 실제 성향 차이에서 나오고 7%가 측정
                오차라는 뜻입니다. α는 이 몫을 낮게 잡는 쪽이라 실제는 같거나
                더 높습니다. 60% 아래면 그 척도는 해석에 쓰지 않습니다.
              </p>
            </Note>
            <Note label="직무능력이 이 표에 없는 이유">
              <p className="mb-2">
                α는 <strong>「문항들이 한 가지를 재는가」</strong>를 잽니다.
                TCI 축은 그 구조라서(하나의 성향이 문항 15개 답을 일으킴) α가
                제 몫을 합니다.
              </p>
              <p className="mb-2">
                <strong>직무능력 3축은 구조가 다릅니다.</strong> 「협력」은 내
                몫 하기 · 미리 알리기 · 남 돕기가 <strong>모여서 이루는</strong>
                것이라 문항끼리 같이 움직이지 않아도 정상입니다. 소득·학력·직업의
                α를 재서 「사회경제적 지위 척도가 못 만들어졌다」고 하지 않는
                것과 같습니다.
              </p>
              <p>
                직무능력의 신뢰도는 <strong>같은 사람을 두 번 재서</strong>{" "}
                확인해야 합니다. 아직 두 번째 응시 데이터가 없어{" "}
                <strong>지금은 답할 수 없는 상태</strong>입니다.
              </p>
            </Note>
          </div>
        </Panel>

        <Panel
          title="신뢰도 위험"
          aside={flagged ? <span className="tabular">{flagged}명</span> : undefined}
          bodyClassName="py-2!"
        >
          <LowQualityList rows={quality} />
        </Panel>
      </div>

      <Panel
        title="사람별 응답 신뢰도"
        aside={
          meanAgreement !== null && (
            <span>
              평균{" "}
              <strong className="tabular text-ink">
                {Math.round(meanAgreement * 100)}
              </strong>
              점 · 높은 순
            </span>
          )
        }
      >
        <QualityRanking rows={quality} />
        <Note label="이 점수를 어떻게 읽는지" className="mt-6">
          <p className="mb-2">
            서로 반대인 문항에 같은 방향으로 답했는지를 잽니다. 무작위로 답하면
            60 근처가 나옵니다. 위가 앞뒤가 맞게 답한 쪽입니다.
          </p>
          <p>
            <strong>성격에 대한 판정이 아닙니다.</strong> 그 사람의 점수를
            해석에 쓸 수 있는지를 말합니다. 위 α와는 다른 이야기입니다 — α는
            문항이 잘 만들어졌는지를, 이쪽은 그 문항에{" "}
            <strong>답한 방식</strong>이 앞뒤가 맞는지를 봅니다.
          </p>
        </Note>
      </Panel>
    </div>
  );
}
