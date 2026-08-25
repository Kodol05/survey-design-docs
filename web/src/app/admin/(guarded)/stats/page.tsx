import { formatRatio } from "@/components/analysis/correlationColor";
import Link from "next/link";
import { Tile } from "@/components/ui/Tile";
import { requireAdmin } from "@/lib/auth/guard";
import {
  loadPeople,
  loadPersonQuality,
  loadReliability,
  traitAbilityMatrix,
} from "@/lib/admin/analysis";
import { ALPHA } from "@/lib/admin/stats";
import { traitAlpha } from "@/lib/admin/dashboard";
import { parseSource } from "@/lib/admin/abilitySource";
import { countRatedEmployees } from "@/lib/admin/ratings";
import { loadRatingCompare } from "@/lib/admin/ratingCompare";
import { MatrixTab } from "./MatrixTab";
import { SpreadTab } from "./SpreadTab";
import { AgreementTab } from "./AgreementTab";
import { PredictionTab } from "./PredictionTab";
import { ReliabilityTab } from "./ReliabilityTab";

export const metadata = { title: "분석 — 관리자" };

/*
  탭 순서 — **우리 데이터 → 바깥과 맞대기 → 사람** (2026-08-25 사용자 결정).

    직무능력과 기질·성격   우리 데이터 안의 관계. 이 화면의 뼈대
    예측 대 실제          논문 값과 맞대 본다
    분포                  우리 사람들이 어떻게 퍼져 있나
    평가 대조             대표님이 보시는 것과 맞대 본다
    검사 신뢰도           문항이 제대로 만들어졌나

  「예측 대 실제」를 「분포」 앞으로 올렸다 — 앞의 두 탭이 **바깥 기준과
  맞대는 이야기**로 이어지고, 분포부터는 우리 안을 들여다보는 이야기다.
*/
const TABS = [
  { key: "matrix", label: "직무능력과 기질·성격" },
  { key: "prediction", label: "예측 대 실제" },
  { key: "spread", label: "분포" },
  { key: "agreement", label: "평가 대조" },
  { key: "reliability", label: "검사 신뢰도" },
] as const;

export default async function StatsPage(props: {
  searchParams: Promise<{
    tab?: string;
    src?: string;
    clean?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "matrix";
  const source = parseSource(sp.src);
  /*
    **응답 신뢰도가 낮은 사람을 빼고 다시 본다** (2026-08-25 사용자 요청).

    「이 결과가 대충 찍은 몇 명 때문인가」는 늘 남는 물음인데, 그동안
    `loadPeople(excludePoor)`라는 손잡이가 코드에만 있고 화면에는 없었다.
    켜고 끄면서 숫자가 얼마나 움직이는지 보는 것이 답이다.
  */
  const clean = sp.clean === "1";

  const [people, reliability, bossCount, personQuality, agreement] =
    await Promise.all([
      loadPeople(clean, source),
      loadReliability(),
      countRatedEmployees(),
      loadPersonQuality(),
      loadRatingCompare(),
    ]);
  const matrix = traitAbilityMatrix(people);
  // α는 성향 축만 센다 — 대시보드와 같은 함수를 쓴다 (D-93)
  const { mean: meanAlpha, poor } = traitAlpha(reliability);
  const poorCount = poor.length;
  /*
    척도 이름으로 찾아 쓰는 표. 상관 화면과 순위 화면이 **α를 알아야**
    한다 — 문항이 안 맞물리는 축의 상관은 축소 편향되어 있어 그대로 읽으면
    안 된다 (2026-08-25 사용자 결정).
  */
  const byScale = Object.fromEntries(reliability.map((r) => [r.scale, r]));
  /*
    빠지는 인원을 **품질 목록에서 직접 센다.** `people.length`와 빼서 구하면
    거르개가 꺼져 있을 때는 0이 나와 「몇 명이 빠지는지」를 미리 말할 수 없다.
    켜기 전에 알려줘야 누를지 말지 정할 수 있다.
  */
  const poorN = personQuality.filter((q) => q.flag === "poor").length;
  const reviewCount = people.filter((p) => p.quality !== "ok").length;

  return (
    <>
      <h1 className="text-screen-title mb-6">분석</h1>

      {/* 먼저 읽히는 것 — 이 검사가 지금 쓸 만한 상태인가 */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="응시 완료"
          value={people.length}
          href="/admin/employees?status=completed"
          hint="누가 했는지 보기"
        />
        <Tile
          label="검토가 필요한 응답"
          value={reviewCount}
          href="/admin/employees?flag=review"
          hint={reviewCount ? "누구인지 보기" : undefined}
        />
        <Tile
          label="검사 신뢰도"
          value={meanAlpha === null ? "—" : formatRatio(meanAlpha)}
          href="/admin/stats?tab=reliability"
          // 예측 대 실제의 「0.00 → 1.00」과 같은 꼴로 적는다 — 화면이 달라도
          // 0~1 값을 읽는 법은 하나여야 한다 (2026-08-26)
          hint="성향 7축 평균 α · 1.00 에 가까울수록 좋음"
        />
        <Tile
          label="기준 아래 성향 축"
          value={poorCount}
          href="/admin/stats?tab=reliability"
          hint={
            poorCount ? `α ${formatRatio(ALPHA.poor)} 아래` : "전부 기준 안"
          }
        />
      </div>

      <nav className="mb-10 flex flex-wrap gap-1 border-b border-[--border]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/stats?tab=${t.key}`}
            className="text-table -mb-px border-b-2 px-4 py-2.5"
            style={{
              borderColor: t.key === tab ? "var(--ink)" : "transparent",
              color: t.key === tab ? "var(--ink)" : "var(--ink-secondary)",
              fontWeight: t.key === tab ? 600 : 400,
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "matrix" && (
        <MatrixTab
          people={people}
          matrix={matrix}
          source={source}
          bossCount={bossCount}
          clean={clean}
          poorN={poorN}
        />
      )}
      {tab === "spread" && (
        <SpreadTab
          people={people}
          source={source}
          bossCount={bossCount}
          reliability={byScale}
        />
      )}
      {tab === "prediction" && (
        <PredictionTab people={people} matrix={matrix} />
      )}
      {tab === "agreement" && <AgreementTab data={agreement} />}
      {tab === "reliability" && (
        <ReliabilityTab rows={reliability} quality={personQuality} />
      )}
    </>
  );
}
