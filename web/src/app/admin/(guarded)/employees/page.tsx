import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { TraitStrip, TraitStripHeader } from "@/components/analysis/TraitStrip";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { isResultsOpen } from "@/lib/admin/phase";
import { formatPhone } from "@/lib/auth/phone";
import { TRAIT_SCALES } from "@/lib/items/types";
import type { StoredTraits } from "@/lib/survey/result";

export const metadata = { title: "구성원 — 관리자" };

const FLAG = {
  review: { label: "검토", color: "var(--status-warn)" },
  poor: { label: "미달", color: "var(--status-critical)" },
} as const;

const STATUS = {
  COMPLETED: "완료",
  IN_PROGRESS: "진행 중",
} as const;

export default async function EmployeesPage(props: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  await requireAdmin();
  const open = await isResultsOpen();
  const { sort, q } = await props.searchParams;

  const employees = await prisma.employee.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    include: {
      testSessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { result: true, qualityFlag: true },
      },
    },
  });

  type Row = {
    id: string;
    name: string;
    phone: string | null;
    status: string | null;
    flag: string;
    traits: Record<string, number> | null;
  };

  let rows: Row[] = employees.map((e) => {
    const s = e.testSessions[0];
    const stored = (s?.result?.scoresJson ?? null) as StoredTraits | null;
    return {
      id: e.id,
      name: e.name,
      phone: e.phone,
      status: s?.status ?? null,
      flag: s?.qualityFlag?.flag ?? "ok",
      traits: stored
        ? Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, v.percent]))
        : null,
    };
  });

  const keyword = (q ?? "").trim();
  if (keyword) rows = rows.filter((r) => r.name.includes(keyword));

  // 축 이름으로 정렬하면 그 성향이 두드러진 사람이 위로 온다 (01 §4.0 Q3)
  const sortAxis = TRAIT_SCALES.includes(sort as never) ? sort! : null;
  if (sortAxis)
    rows = [...rows].sort((a, b) => (b.traits?.[sortAxis] ?? -1) - (a.traits?.[sortAxis] ?? -1));

  const link = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.sort) sp.set("sort", params.sort);
    if (params.q) sp.set("q", params.q);
    const s = sp.toString();
    return `/admin/employees${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-screen-title">구성원</h1>
        <p className="text-axis text-ink-muted">
          {rows.length}명{keyword && ` · "${keyword}" 검색 결과`}
        </p>
      </div>

      {/* 필터는 한 줄로 목록 위에 둔다 (차트·표 안에 넣지 않는다) */}
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <form className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={keyword}
            placeholder="이름"
            className="text-table h-9 w-40 rounded-lg border border-[--border] bg-surface px-3"
          />
          {sortAxis && <input type="hidden" name="sort" value={sortAxis} />}
          <button className="text-table text-ink-secondary underline">찾기</button>
        </form>

        <div className="text-axis flex flex-wrap items-center gap-1.5">
          <span className="text-ink-muted mr-1">정렬</span>
          <Link
            href={link({ q: keyword })}
            className="rounded-md px-2.5 py-1"
            style={sortStyle(!sortAxis)}
          >
            이름
          </Link>
          {open &&
            TRAIT_SCALES.map((s) => (
              <Link
                key={s}
                href={link({ sort: s, q: keyword })}
                className="rounded-md px-2.5 py-1"
                style={sortStyle(sortAxis === s)}
              >
                {s}
              </Link>
            ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={keyword ? "찾는 사람이 없습니다." : "아직 가입한 사람이 없습니다."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-axis text-ink-muted border-b border-[--border]">
                <th className="w-40 pb-2 text-left font-medium">이름</th>
                <th className="w-28 pb-2 text-left font-medium">번호</th>
                <th className="w-20 pb-2 text-left font-medium">상태</th>
                <th className="min-w-[18rem] pb-2 text-left font-medium">
                  {open ? <TraitStripHeader /> : "성향"}
                </th>
                <th className="w-16 pb-2 text-left font-medium">품질</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const flag = FLAG[r.flag as keyof typeof FLAG];
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[--border] last:border-0 hover:bg-[--wash]"
                  >
                    <td className="py-3">
                      <Link href={`/admin/employees/${r.id}`} className="font-medium">
                        {r.name}
                      </Link>
                    </td>
                    <td className="text-axis tabular text-ink-secondary py-3">
                      {r.phone ? formatPhone(r.phone) : "—"}
                    </td>
                    <td className="text-axis text-ink-secondary py-3">
                      {r.status ? STATUS[r.status as keyof typeof STATUS] : "미응시"}
                    </td>
                    <td className="py-3 pr-6">
                      {open ? (
                        <TraitStrip traits={r.traits} />
                      ) : (
                        <span className="text-axis text-ink-muted">공개 전</span>
                      )}
                    </td>
                    <td className="text-axis py-3" style={{ color: flag?.color }}>
                      {flag?.label ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-axis text-ink-muted mt-6 max-w-[44rem]">
        색 띠는 일곱 축을 왼쪽부터 늘어놓은 것입니다.{" "}
        <span style={{ color: "#44618d" }}>■</span> 낮음{" "}
        <span style={{ color: "#b3623f" }}>■</span> 높음. 칸에 마우스를 올리면 정확한
        값이 나옵니다. 숫자 일곱 개를 늘어놓으면 훑어볼 수가 없어서 색으로 둡니다.
      </p>
    </>
  );
}

const sortStyle = (on: boolean) => ({
  background: on ? "var(--ink)" : "var(--wash)",
  color: on ? "var(--page)" : "var(--ink-secondary)",
  fontWeight: on ? 600 : 400,
});
