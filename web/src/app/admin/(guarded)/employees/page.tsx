import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { isResultsOpen } from "@/lib/admin/phase";
import { formatPhone } from "@/lib/auth/phone";
import { TRAIT_SCALES } from "@/lib/items/types";
import type { StoredTraits } from "@/lib/survey/result";

export const metadata = { title: "구성원 — 관리자" };

const SHORT: Record<string, string> = {
  자극추구: "자극", 위험회피: "위험", 사회적민감성: "민감", 인내력: "인내",
  자율성: "자율", 연대감: "연대", 자기초월: "초월",
};

const FLAG_LABEL: Record<string, string> = { ok: "", review: "검토", poor: "미달" };
const FLAG_COLOR: Record<string, string> = {
  review: "var(--status-warn)",
  poor: "var(--status-critical)",
};

export default async function EmployeesPage() {
  await requireAdmin();
  const open = await isResultsOpen();

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

  if (!employees.length)
    return (
      <>
        <h1 className="text-screen-title mb-6">구성원</h1>
        <Card>
          <EmptyState message="아직 가입한 사람이 없습니다." />
        </Card>
      </>
    );

  return (
    <>
      <h1 className="text-screen-title mb-2">구성원</h1>
      <p className="text-axis text-ink-muted mb-6">{employees.length}명</p>

      {/* 관리자 표는 조밀하게 — 50명을 훑는 것이 목적이다 (11 §1.4) */}
      <div className="overflow-x-auto">
        <table className="w-full text-table">
          <thead>
            <tr className="border-b border-[--border] text-ink-secondary">
              <th className="py-2 pr-4 text-left font-medium">이름</th>
              <th className="px-4 py-2 text-left font-medium">번호</th>
              <th className="px-4 py-2 text-left font-medium">상태</th>
              {open &&
                TRAIT_SCALES.map((s) => (
                  <th key={s} className="px-2 py-2 text-right font-medium" title={s}>
                    {SHORT[s]}
                  </th>
                ))}
              <th className="px-4 py-2 text-left font-medium">품질</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const s = e.testSessions[0];
              const traits = (s?.result?.scoresJson ?? null) as StoredTraits | null;
              const flag = s?.qualityFlag?.flag ?? "";
              return (
                <tr key={e.id} className="border-b border-[--border] last:border-0">
                  <td className="px-4" style={{ height: "var(--row-admin)" }}>
                    <Link href={`/admin/employees/${e.id}`} className="underline">
                      {e.name}
                    </Link>
                  </td>
                  <td className="tabular px-4 text-ink-secondary">
                    {e.phone ? formatPhone(e.phone) : "—"}
                  </td>
                  <td className="px-4 text-ink-secondary">
                    {s?.status === "COMPLETED" ? "완료" : s ? "진행 중" : "미응시"}
                  </td>
                  {open &&
                    TRAIT_SCALES.map((sc) => (
                      <td key={sc} className="tabular px-2 text-right">
                        {traits?.[sc] ? Math.round(traits[sc].percent) : "—"}
                      </td>
                    ))}
                  <td className="px-4" style={{ color: FLAG_COLOR[flag] }}>
                    {FLAG_LABEL[flag] ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!open && (
        <p className="text-axis text-ink-muted mt-4">
          점수는 결과 공개로 전환한 뒤에 보입니다.
        </p>
      )}
    </>
  );
}
