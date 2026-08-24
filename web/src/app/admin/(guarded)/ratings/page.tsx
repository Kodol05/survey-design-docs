import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { RatingGrid, type RatingRow } from "./RatingGrid";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { isResultsOpen } from "@/lib/admin/phase";
import { RATING } from "@/lib/admin/abilitySource";
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
  const open = await isResultsOpen();

  const employees = await prisma.employee.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    include: { ratings: true },
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

      {open ? (
        <p className="text-ink-secondary mb-8 border-l-2 border-[--axis] py-2 pl-4">
          <strong>결과가 이미 열려서 평가를 바꿀 수 없습니다.</strong> 결과를 보고 나서
          매기면 그 인상이 섞여, 두 값을 맞대 보는 의미가 없어지기 때문입니다. 지금까지
          매기신 값은 그대로 남아 있습니다.
        </p>
      ) : (
        <p className="text-axis text-ink-muted mb-8 max-w-[56rem]">
          결과를 여시면 이 화면은 잠깁니다. 먼저 매기고 그다음에 여는 순서입니다.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState message="아직 가입한 사람이 없습니다." />
      ) : (
        <RatingGrid rows={rows} locked={open} />
      )}

      <p className="text-table mt-8">
        <Link href="/admin/employees" className="underline">
          구성원 목록으로
        </Link>
      </p>
    </>
  );
}
