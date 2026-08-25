import { Note } from "@/components/ui/Note";
import { formatRatio } from "@/components/analysis/correlationColor";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import type { loadPersonQuality, loadReliability } from "@/lib/admin/analysis";
import { LowQualityList, QualityRanking } from "./PersonQuality";

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
    하는지(재검사)와 함께 표 아래에 적는다.
  */
  const GROUPS = [
    {
      label: "기질",
      note: "타고나는 쪽 · TCI 4축",
      has: (r: { scale: string; kind: string }) =>
        r.kind === "trait" &&
        (TEMPERAMENT as readonly string[]).includes(r.scale),
    },
    {
      label: "성격",
      note: "살면서 만들어지는 쪽 · TCI 3축",
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

  return (
    <div className="flex flex-col gap-16">
      <section>
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <h2 className="text-section-title mb-1">문항이 맞물리는가</h2>
            <p className="text-axis text-ink-muted mb-6">
              {/*
                「α가 낮으면 그 상관은 볼 필요가 없다」고 적혀 있었다.
                D-92에서 뒤집은 결론인데 이 줄만 남아 있었다 (2026-08-25).
              */}
              한 척도의 문항들이 같은 것을 재고 있는지
            </p>

            <div className="flex flex-col gap-8">
              {GROUPS.map((g) => {
                const part = rows.filter((r) => g.has(r));
                if (part.length === 0) return null;
                return (
                  <div key={g.label} className="overflow-x-auto">
                    <p className="text-table text-ink-secondary mb-2">
                      {g.label}
                      <span className="text-axis text-ink-muted ml-2">
                        {g.note}
                      </span>
                    </p>
                    <table className="text-table w-full min-w-[22rem]">
                      <thead>
                        <tr className="text-axis text-ink-muted border-b border-[--border]">
                          <th className="py-1.5 text-left font-medium">척도</th>
                          <th className="w-16 py-1.5 text-right font-medium">
                            문항
                          </th>
                          <th className="w-16 py-1.5 text-right font-medium">
                            α
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
                            className="border-b border-[--border] last:border-0"
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
                              {r.alpha === null ? "—" : formatRatio(r.alpha)}
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
          </div>
          <LowQualityList rows={quality} />
        </div>
        <Note label="직무능력이 이 표에 없는 이유" className="mt-8">
          <p className="mb-2">
            α는 <strong>「문항들이 한 가지를 재는가」</strong>를 잽니다. TCI
            축은 그 구조라서(하나의 성향이 문항 15개 답을 일으킴) α가 제 몫을
            합니다.
          </p>
          <p className="mb-2">
            <strong>직무능력 3축은 구조가 다릅니다.</strong> 「협력」은 내 몫
            하기 · 미리 알리기 · 남 돕기가 <strong>모여서 이루는</strong>
            것이라 문항끼리 같이 움직이지 않아도 정상입니다. 소득·학력·직업의
            α를 재서 「사회경제적 지위 척도가 못 만들어졌다」고 하지 않는 것과
            같습니다.
          </p>
          <p>
            직무능력의 신뢰도는 <strong>같은 사람을 두 번 재서</strong> 확인해야
            합니다. 아직 두 번째 응시 데이터가 없어{" "}
            <strong>지금은 답할 수 없는 상태</strong>입니다.
          </p>
        </Note>
      </section>

      <section>
        <h2 className="text-section-title mb-1">사람별 응답 신뢰도</h2>
        <p className="text-axis text-ink-muted mb-6">
          서로 반대인 문항에 같은 방향으로 답했는지 — 무작위로 답하면 60 근처가
          나옵니다
        </p>
        <QualityRanking rows={quality} />
        <Note label="이 점수를 어떻게 읽는지" className="mt-8">
          <p>
            <strong>성격에 대한 판정이 아닙니다.</strong> 그 사람의 점수를
            해석에 쓸 수 있는지를 말합니다. 위 α와는 다른 이야기입니다 — α는
            문항이 잘 만들어졌는지를, 이쪽은 그 문항에{" "}
            <strong>답한 방식</strong>이 앞뒤가 맞는지를 봅니다.
          </p>
        </Note>
      </section>
    </div>
  );
}

/**
 * 한 능력에 대해 성향 7축을 **큰 순으로** 모은다.
 *
 * 표를 그리는 데 쓴 `cells`를 그대로 쓴다 — **새로 계산하지 않는다.**
 * 따로 재면 두 화면의 숫자가 어긋날 수 있고, 어긋나면 어느 쪽이 맞는지
 * 알 방법이 없다.
 */
