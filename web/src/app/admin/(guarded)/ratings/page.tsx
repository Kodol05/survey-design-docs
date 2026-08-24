import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { RatingGrid, type RatingRow } from "./RatingGrid";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { RATER, RATING } from "@/lib/admin/abilitySource";
import { ABILITY_AXES, ABILITY_AXIS_FROM_DB } from "@/lib/items/types";

export const metadata = { title: "대표님 평가 — 관리자" };

/**
 * 대표님 평가 입력 (D-34).
 *
 * 세 축을 1~10으로 매긴다. 직원 설문과 **출처가 다른 값**을 하나 더 만드는
 * 것이 목적이다 — 성향도 직무능력도 자기보고면 둘 사이 관련도가 실제보다
 * 부풀어 오른다 (Podsakoff 2003). 대표님 평가는 그 편향이 없다.
 *
 * ⚠️ 결과가 열리면 잠긴다 (D-33). 결과를 보고 매기면 그 인상이 섞인다.
 */
export default async function RatingsPage() {
  await requireAdmin();

  const employees = await prisma.employee.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    // 대표님이 직접 매긴 것만 가져온다. 데모로 심은 값이 여기 뜨면
    // "평가한 적 없는데 기록이 있다"가 된다
    include: { ratings: { where: { ratedBy: RATER.real } } },
  });

  const rows: RatingRow[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    scores: Object.fromEntries(
      e.ratings
        .map((r) => [ABILITY_AXIS_FROM_DB[r.axis], r.score] as const)
        .filter(([axis]) => Boolean(axis)),
    ),
  }));

  const total = rows.length * ABILITY_AXES.length;
  const done = rows.reduce((n, r) => n + Object.keys(r.scores).length, 0);

  // 확인용으로 심어 둔 값이 얼마나 있는지. 대표님 것과 따로 센다
  const demo = await prisma.managerRating.count({ where: { ratedBy: RATER.demo } });

  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-screen-title">대표님 평가</h1>
        <p className="text-axis text-ink-muted tabular">
          {done} / {total}칸
        </p>
      </div>

      <div className="text-ink-secondary mb-8 max-w-[56rem]">
        <p className="mb-3">
          한 사람에 세 항목, <strong>{RATING.min}에서 {RATING.max}까지</strong>{" "}
          매겨 주십시오. 누르면 바로 저장되니 중간에 닫으셔도 됩니다.
        </p>
        <p className="text-axis text-ink-muted">
          이 값은 직원 설문과 <strong>따로</strong> 남습니다. 분석 화면에서 제목을 눌러
          「직원 설문」 · 「대표님 평가」 · 「두 값 평균」으로 바꿔 보실 수 있습니다.
        </p>
      </div>

      {demo > 0 && (
        <p className="text-axis text-ink-muted mb-4 max-w-[56rem] border-l-2 border-[--axis] py-1 pl-4">
          이 목록에는 <strong>대표님이 직접 매기신 것만</strong> 나옵니다. 화면 확인용으로
          심어 둔 값 <span className="tabular">{demo}</span>칸이 따로 있는데, 데모 계정에
          붙어 있고 여기서는 보이지 않습니다.
        </p>
      )}

      <p className="text-axis text-ink-muted mb-8 max-w-[56rem]">
        언제든 고치실 수 있습니다. 다만 <strong>결과 화면을 보시기 전에 매기는 편이
        낫습니다</strong> — 결과를 먼저 보면 그 인상이 섞여서, 두 값을 맞대 보는
        의미가 줄어듭니다.
      </p>

      {rows.length === 0 ? (
        <EmptyState message="아직 가입한 사람이 없습니다." />
      ) : (
        <RatingGrid rows={rows} />
      )}

      <p className="text-table mt-8">
        <Link href="/admin/employees" className="underline">
          구성원 목록으로
        </Link>
      </p>
    </>
  );
}
