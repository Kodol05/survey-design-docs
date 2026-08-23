import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { getAppState } from "@/lib/admin/phase";
import { loadSummary } from "@/lib/admin/summary";
import { loadDistribution } from "@/lib/admin/distribution";
import { OpenResultsButton } from "./OpenResultsButton";

export const metadata = { title: "대시보드 — 관리자" };

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[--border] bg-surface p-6">
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {hint && <p className="text-axis text-ink-muted mt-1">{hint}</p>}
    </div>
  );
}

export default async function AdminHome() {
  const [state, s, dist] = await Promise.all([
    getAppState(),
    loadSummary(),
    loadDistribution(),
  ]);
  const open = state.ratingPhase === "OPEN";

  return (
    <>
      <h1 className="text-screen-title mb-6">대시보드</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="응시 완료" value={s.completed} />
        <Stat label="진행 중" value={s.inProgress} />
        <Stat label="가입한 사람" value={s.signedUp} hint="가입이 자유라 전체 인원은 알 수 없습니다" />
        <Stat
          label="검토가 필요한 응답"
          value={s.quality.review + s.quality.poor}
          hint={s.quality.poor ? `그중 ${s.quality.poor}건은 미달` : undefined}
        />
      </div>

      <Card title="평가·결과 국면" className="mb-6">
        {open ? (
          <p className="text-ink-secondary">
            결과가 공개되어 있습니다.{" "}
            {state.openedAt && (
              <span className="text-ink-muted">
                {state.openedAt.toLocaleString("ko-KR")}에 열렸습니다.
              </span>
            )}
          </p>
        ) : (
          <>
            <p className="text-ink-secondary mb-4">
              지금은 <strong>평가 수집 중</strong>입니다. 대표님 평가가 끝나기 전에는 결과를 볼 수 없습니다.
              결과를 먼저 보면 그 인상이 섞여서 대조하는 의미가 없어지기 때문입니다.
            </p>
            <p className="text-axis text-ink-muted mb-4">
              응시 현황과 응답 품질, 문항 목록은 지금도 보실 수 있습니다.
            </p>
            <OpenResultsButton completed={s.completed} />
          </>
        )}
      </Card>

      {open && !dist.enough && (
        <div className="mb-6">
          <WarningBadge kind="smallSample" />
          <p className="text-axis text-ink-muted mt-2">
            응시 완료 {dist.n}명입니다. 30명이 넘어야 사내 위치와 분포를 보여드립니다.
          </p>
        </div>
      )}

      <p className="text-table">
        <Link href="/admin/employees" className="underline">구성원 목록 보기</Link>
      </p>
    </>
  );
}
