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
  }>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "matrix";
  /*
    「신뢰도 낮은 응답 빼기」(`?clean=1`)는 뺐다 (2026-10-30 사용자 결정) —
    분석은 늘 전원으로 본다.
  */
  const [people, reliability, personQuality] = await Promise.all([
    loadPeople(),
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

  return (
    <>
      <h1 className="text-screen-title mb-5">분석</h1>

      {/*
        숫자 카드(응시 완료·검토 필요·검사 신뢰도·기준 아래 축)는 대시보드에만
        둔다 (2026-10-07 사용자 결정). 같은 것이 두 화면 맨 위에 똑같이 떠
        있었다 — 분석에 들어오면 바로 표가 보여야 한다.
      */}
      {/*
        **진짜 탭처럼 — 지금 탭이 아래 카드와 이어진다** (2026-10-30 사용자 요청).

        전에는 탭 줄 아래에 가는 선이 있고 지금 탭은 옅은 알약이라, 탭과 아래
        표가 따로 놀았다. 선을 걷고, 지금 탭을 **카드와 같은 바탕**으로 칠해
        아래 첫 카드에 붙인다. 탭은 위만 둥글고 아래는 각지게, 첫 카드는
        탭이 붙는 왼쪽 위 모서리를 각지게 둔다(\`.tab-body\`).
      */}
      {/*
        (같은 날 더) 탭 줄 아래에 **옅은 선 하나**를 깔고, 지금 탭이 그 선을
        덮어 아래 카드로 이어지게 한다. 나머지 탭은 옅은 바탕을 줘 탭이라는 것이
        보이게 한다.
      */}
      <nav className="flex flex-wrap items-end gap-1 border-b border-(--border)">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`/admin/stats?tab=${t.key}`}
              aria-current={on ? "page" : undefined}
              className={`text-table relative rounded-t-xl px-5 transition-colors ${
                on ? "z-10 -mb-px pt-3 pb-3.5" : "py-2.5 hover:bg-(--wash)!"
              }`}
              style={{
                background: on
                  ? "var(--card)"
                  : "color-mix(in oklab, var(--wash) 60%, transparent)",
                color: on ? "var(--ink)" : "var(--ink-secondary)",
                fontWeight: on ? 600 : 400,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="tab-body">
        {tab === "matrix" && (
          <MatrixTab people={people} matrix={matrix} />
        )}
        {tab === "spread" && (
          <SpreadTab people={people} reliability={byScale} />
        )}
        {tab === "reliability" && (
          <ReliabilityTab rows={reliability} quality={personQuality} />
        )}
      </div>
    </>
  );
}
