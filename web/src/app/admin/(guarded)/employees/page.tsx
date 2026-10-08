import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { Note } from "@/components/ui/Note";
import { StickyToolbar } from "@/components/ui/StickyToolbar";
import { Chip, ChipGroup, ChipGroups, ToolbarSearch } from "@/components/ui/ToolbarChips";
import { EmployeeList, EmployeeListHeader } from "./EmployeeList";
import { ExportLink } from "./ExportLink";
import { requireAdmin } from "@/lib/auth/guard";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { BANDS, MEAN_KEY, NAME_KEY, loadRoster } from "@/lib/admin/roster";

export const metadata = { title: "구성원 — 관리자" };

export default async function EmployeesPage(props: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    q?: string;
    flag?: string;
    status?: string;
    pos?: string;
  }>;
}) {
  await requireAdmin();
  const qs = await props.searchParams;

  /*
    읽고·거르고·줄 세우는 일은 `lib/admin/roster.ts`가 한다 (2026-08-25 분리).
    여기는 **받은 것을 그리기만** 한다 — 전에는 이 함수 하나가 400줄이었다.
  */
  const {
    rows,
    keyword,
    sortKey,
    nameSort,
    sortDir,
    fallbackDir,
    onlyReview,
    pickStatus,
    band,
    cut,
  } = await loadRoster(qs);
  /** 링크·검색 폼이 들고 다닐 정렬값 — 이름순은 sortKey 가 아니라 따로 표시된다 */
  const activeSort = nameSort ? NAME_KEY : sortKey;
  const recentSort = !sortKey && !nameSort;

  const link = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.sort) sp.set("sort", params.sort);
    if (params.dir) sp.set("dir", params.dir);
    if (params.q) sp.set("q", params.q);
    if (params.pos) sp.set("pos", params.pos);
    // 거르개는 정렬·검색을 바꿔도 따라간다
    if (!params.clear) {
      if (onlyReview) sp.set("flag", "review");
      if (pickStatus) sp.set("status", pickStatus.key);
    }
    const s = sp.toString();
    return `/admin/employees${s ? `?${s}` : ""}`;
  };

  /** 축 칩 하나 — 켜져 있으면 누를 때 방향을 뒤집고, 다른 데서 넘어오면 기본 방향 */
  const axisChip = (x: string) => (
    <Chip
      key={x}
      href={link({
        sort: x,
        q: keyword,
        dir: sortKey === x && sortDir === "desc" ? "asc" : undefined,
      })}
      on={sortKey === x}
      dir={sortKey === x ? sortDir : undefined}
      title={sortKey === x ? "다시 누르면 반대 순서로 바뀝니다" : undefined}
    >
      {x}
    </Chip>
  );

  /*
    접혔을 때 남는 한 줄 — **지금 무엇으로 줄 세워 봤는가**만 말한다.
    칩이 접혀도 이것만 보이면 목록을 잘못 읽을 일이 없다.
  */
  const sortLabel = recentSort ? "최근 응시순" : nameSort ? "이름순" : sortKey!;
  const bandLabel = band ? BANDS.find((b) => b.key === band)?.label : undefined;
  const summary = (
    <>
      정렬: <span className="text-ink font-medium">{sortLabel}</span>{" "}
      <span aria-hidden style={{ fontSize: "0.75em" }}>
        {sortDir === "desc" ? "▼" : "▲"}
      </span>
      {bandLabel && <> · {bandLabel}</>}
    </>
  );

  return (
    <>
      {/* 제목 줄 — 이름과 사람 수, 오른쪽에 내보내기. 설명 문장은 두지 않는다 (2026-10-07 사용자 결정) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="flex items-baseline gap-3">
          <span className="text-screen-title">구성원</span>
          <span className="text-axis text-ink-muted tabular">
            {rows.length}명{keyword && ` · "${keyword}"`}
          </span>
        </h1>
        <ExportLink
          href={`/admin/employees/export?${new URLSearchParams(
            Object.entries(qs).filter((e): e is [string, string] => typeof e[1] === "string"),
          )}`}
          count={rows.length}
        />
      </div>

      {/* 분석 화면에서 넘어온 거르개는 한 줄로 목록 위에 둔다 */}
      {(onlyReview || pickStatus) && (
        <p className="text-axis text-ink-secondary mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-md px-3 py-1" style={{ background: "var(--wash)" }}>
            {onlyReview ? "검토가 필요한 응답만" : pickStatus!.label}
          </span>
          <Link
            href={link({ sort: activeSort ?? undefined, q: keyword, clear: "1" })}
            className="underline"
          >
            전체 보기
          </Link>
        </p>
      )}

      {/*
        검색 · 정렬 칩 · 열 머리글을 **카드 하나로** 묶어 위에 붙여 둔다
        (2026-10-07 사용자 결정). 내려가면 칩은 접히고 「정렬: …」 한 줄만
        남는다 — 자세한 동작은 `StickyToolbar`.

        칩은 갈래(정렬 | 성향 | 직무능력)를 한 흐름에 세로선으로 나눠 늘어놓는다.
        줄마다 쌓던 때보다 카드가 낮아서 붙어 다니기에 가볍다.
      */}
      <StickyToolbar
        label="구성원 목록 도구"
        search={
          <ToolbarSearch
            defaultValue={keyword}
            placeholder="이름"
            hidden={{
              sort: activeSort ?? undefined,
              dir: sortDir !== fallbackDir ? sortDir : undefined,
              // 상위·하위 구간을 고른 채 이름을 찾아도 구간이 풀리지 않게 (2026-10-07 점검)
              pos: activeSort && band ? band : undefined,
            }}
          />
        }
        summary={summary}
        header={<EmployeeListHeader />}
      >
        <ChipGroups>
          <ChipGroup label="정렬">
            <Chip
              href={link({
                q: keyword,
                // 켜져 있을 때만 방향을 뒤집고, 다른 정렬에서 넘어오면 기본(최근순)으로
                dir: recentSort ? (sortDir === "asc" ? "desc" : "asc") : undefined,
              })}
              on={recentSort}
              dir={recentSort ? sortDir : undefined}
            >
              최근 응시순
            </Chip>
            <Chip
              href={link({
                sort: NAME_KEY,
                q: keyword,
                dir: nameSort && sortDir === "asc" ? "desc" : undefined,
              })}
              on={nameSort}
              dir={nameSort ? sortDir : undefined}
            >
              이름순
            </Chip>
          </ChipGroup>

          <ChipGroup label="성향">{TRAIT_SCALES.map(axisChip)}</ChipGroup>

          <ChipGroup label="직무능력">{[...ABILITY_AXES, MEAN_KEY].map(axisChip)}</ChipGroup>

          {/*
            **정렬 축을 고른 뒤에만 나온다.** 최근순(기본)일 때 「상위 4분의 1」은
            말이 안 된다 — 무엇의 상위인지가 없다. 자리를 미리 비워 두면
            누를 수 없는 칩이 늘 떠 있게 되므로 아예 나오지 않게 한다.
          */}
          {sortKey && cut && (
            <ChipGroup label="구간">
              {BANDS.map((b) => (
                <Chip
                  key={b.key}
                  href={link({
                    sort: sortKey,
                    q: keyword,
                    dir: sortDir !== fallbackDir ? sortDir : undefined,
                    pos: band === b.key ? undefined : b.key,
                  })}
                  on={band === b.key}
                >
                  {b.label}
                </Chip>
              ))}
              <span className="text-ink-muted ml-1 whitespace-nowrap">
                경계{" "}
                <span className="tabular">
                  {Math.round(cut.low)} / {Math.round(cut.high)}
                </span>
              </span>
            </ChipGroup>
          )}
        </ChipGroups>
      </StickyToolbar>

      {rows.length === 0 ? (
        <EmptyState
          message={keyword ? "찾는 사람이 없습니다." : "아직 가입한 사람이 없습니다."}
        />
      ) : (
        <EmployeeList rows={rows} />
      )}

      {/*
        칸 뜻풀이는 **맨 아래에 접어 둔다** (2026-10-07 사용자 결정).
        늘 보여야 하는 색 방향은 머리글의 「성향」 옆 범례로 옮겼다.
      */}
      <Note label="칸마다 무슨 뜻인지" className="mt-8">
        <p>
          <strong>성향</strong>은 축을 왼쪽부터 늘어놓은 것입니다. 어느 쪽도
          좋고 나쁜 것이 아니라 색으로 모양을 먼저 보고 숫자로 값을 확인하는
          칸입니다. <strong>직무능력</strong> 세 칸은 직원 설문 값이고, 높을수록
          좋은 값이라 갈라지는 색을 쓰지 않고 한 가지 색의 길이로만 표시합니다.
          줄을 누르면 그래프가 펼쳐집니다.
        </p>
        <p className="mt-2">
          <strong>신뢰도</strong> 숫자는 서로 반대인 문항에 같은 방향으로
          답했는지를 100점으로 잰 값입니다. 아무렇게나 답하면 60 근처가
          나옵니다. 성격에 대한 판정이 아니라 이 응답을 믿을 수 있는지에 대한
          값입니다. <span style={{ color: "var(--status-warn)" }}>검토</span>
          {" · "}
          <span style={{ color: "var(--status-critical)" }}>낮음</span>은 값이
          낮은 경우, <span style={{ color: "var(--status-warn)" }}>속도</span>
          는 일치도는 괜찮지만 문항을 너무 빨리 넘긴 경우입니다.
        </p>
        <p className="mt-2">
          정렬을 무엇으로 바꾸든 완료한 사람이 먼저 나오고, 진행 중·미응시는
          아래에 모입니다. 고른 칩을 다시 누르면 순서가 뒤집힙니다.
          {cut && sortKey && (
            <>
              {" "}
              구간 경계는 {sortKey} 기준 사분위입니다.
            </>
          )}
        </p>
        <p className="mt-2">
          CSV에는 지금 목록의 <span className="tabular">{rows.length}</span>명의
          이름·번호·성향 7축·직무능력이 들어갑니다.
        </p>
      </Note>
    </>
  );
}
