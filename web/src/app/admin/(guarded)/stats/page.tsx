import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import {
  loadPeople,
  loadPersonQuality,
  loadReliability,
  traitAbilityMatrix,
} from "@/lib/admin/analysis";
import { MatrixTab } from "./MatrixTab";
import { SpreadTab } from "./SpreadTab";
import { ReliabilityTab } from "./ReliabilityTab";

export const metadata = { title: "분석 — 관리자" };

/*
  탭 순서 — **우리 데이터 안의 관계 → 사람들의 모양 → 문항** (2026-08-25).

    직무능력과 기질·성격   우리 데이터 안의 관계. 이 화면의 뼈대
    분포                  우리 사람들이 어떻게 퍼져 있나
    검사 신뢰도           문항이 제대로 만들어졌나

  「예측 대 실제」(논문 값과 맞대 보기) 탭은 지웠다 (2026-10-07 사용자 결정 —
  쓸 일이 없었다). 그 탭에서만 쓰던 계산과 부품도 같이 지웠다.
*/
const TABS = [
  { key: "matrix", label: "직무능력과 기질·성격" },
  { key: "spread", label: "분포" },
  { key: "reliability", label: "검사 신뢰도" },
] as const;

export default async function StatsPage(props: {
  searchParams: Promise<{
    tab?: string;
    clean?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "matrix";
  /*
    **응답 신뢰도가 낮은 사람을 빼고 다시 본다** (2026-08-25 사용자 요청).

    「이 결과가 대충 찍은 몇 명 때문인가」는 늘 남는 물음인데, 그동안
    `loadPeople(excludePoor)`라는 손잡이가 코드에만 있고 화면에는 없었다.
    켜고 끄면서 숫자가 얼마나 움직이는지 보는 것이 답이다.
  */
  const clean = sp.clean === "1";

  const [people, reliability, personQuality] = await Promise.all([
    loadPeople(clean),
    loadReliability(),
    loadPersonQuality(),
  ]);
  const matrix = traitAbilityMatrix(people);
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

  return (
    <>
      <h1 className="text-screen-title mb-5">분석</h1>

      {/*
        숫자 카드(응시 완료·검토 필요·검사 신뢰도·기준 아래 축)는 대시보드에만
        둔다 (2026-10-07 사용자 결정). 같은 것이 두 화면 맨 위에 똑같이 떠
        있었다 — 분석에 들어오면 바로 표가 보여야 한다.
      */}
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-(--border)">
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
          clean={clean}
          poorN={poorN}
        />
      )}
      {tab === "spread" && (
        <SpreadTab people={people} reliability={byScale} />
      )}
      {tab === "reliability" && (
        <ReliabilityTab rows={reliability} quality={personQuality} />
      )}
    </>
  );
}
