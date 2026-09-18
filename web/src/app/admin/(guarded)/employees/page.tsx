import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { Note } from "@/components/ui/Note";
import { EmployeeList } from "./EmployeeList";
import { ExportLink } from "./ExportLink";
import { requireAdmin } from "@/lib/auth/guard";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { BANDS, MEAN_KEY, loadRoster, type SortDir } from "@/lib/admin/roster";

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
    sortDir,
    fallbackDir,
    onlyReview,
    pickStatus,
    band,
    cut,
  } = await loadRoster(qs);

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

  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-screen-title">구성원</h1>
        <p className="text-axis text-ink-muted">
          {rows.length}명{keyword && ` · "${keyword}" 검색 결과`}
        </p>
      </div>

      {/* 필터는 한 줄로 목록 위에 둔다 (차트·표 안에 넣지 않는다) */}
      {(onlyReview || pickStatus) && (
        <p className="text-axis text-ink-secondary mb-6 flex flex-wrap items-center gap-3">
          <span
            className="rounded-md px-3 py-1"
            style={{ background: "var(--wash)" }}
          >
            {onlyReview ? "검토가 필요한 응답만" : pickStatus!.label}
          </span>
          <Link
            href={link({ sort: sortKey ?? undefined, q: keyword, clear: "1" })}
            className="underline"
          >
            전체 보기
          </Link>
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <form className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={keyword}
            placeholder="이름"
            className="text-table h-12 w-48 rounded-lg border border-[--border] bg-surface px-3"
          />
          {sortKey && <input type="hidden" name="sort" value={sortKey} />}
          {sortDir !== fallbackDir && (
            <input type="hidden" name="dir" value={sortDir} />
          )}
          <button className="text-table text-ink-secondary underline">
            찾기
          </button>
        </form>
      </div>

      {/*
        정렬 줄을 **갈래마다 나눈다.** 열한 개를 한 줄에 늘어놓으면 어디까지가
        성향이고 어디부터가 직무능력인지 안 보인다. 줄을 나누고 앞에 이름을 단다.
      */}
      <div className="text-axis mb-8 flex flex-col gap-2">
        <SortRow label="정렬">
          <SortChip
            href={link({ q: keyword, dir: sortDir === "asc" ? "desc" : "asc" })}
            on={!sortKey}
            dir={!sortKey ? sortDir : undefined}
          >
            이름
          </SortChip>
        </SortRow>

        <SortRow label="성향">
          {TRAIT_SCALES.map((x) => (
            <SortChip
              key={x}
              href={link({
                sort: x,
                q: keyword,
                dir: sortKey === x && sortDir === "desc" ? "asc" : undefined,
              })}
              on={sortKey === x}
              dir={sortKey === x ? sortDir : undefined}
            >
              {x}
            </SortChip>
          ))}
        </SortRow>

        <SortRow label="직무능력">
          {[...ABILITY_AXES, MEAN_KEY].map((x) => (
            <SortChip
              key={x}
              href={link({
                sort: x,
                q: keyword,
                dir: sortKey === x && sortDir === "desc" ? "asc" : undefined,
              })}
              on={sortKey === x}
              dir={sortKey === x ? sortDir : undefined}
            >
              {x}
            </SortChip>
          ))}
        </SortRow>

        {/*
          **정렬 축을 고른 뒤에만 나온다.** 이름순일 때 「상위 4분의 1」은
          말이 안 된다 — 무엇의 상위인지가 없다. 자리를 미리 비워 두면
          누를 수 없는 칩이 늘 떠 있게 되므로 아예 나오지 않게 한다.
        */}
        {sortKey && cut && (
          <SortRow label="구간">
            {BANDS.map((b) => (
              <SortChip
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
              </SortChip>
            ))}
            <span className="text-ink-muted ml-1 self-center">
              {sortKey} 기준 · 경계{" "}
              <span className="tabular">
                {Math.round(cut.low)} / {Math.round(cut.high)}
              </span>
            </span>
          </SortRow>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          message={
            keyword ? "찾는 사람이 없습니다." : "아직 가입한 사람이 없습니다."
          }
        />
      ) : (
        <EmployeeList rows={rows} />
      )}

      <div className="mt-8 flex justify-end">
        <ExportLink href="/admin/employees/export" count={rows.length} />
      </div>

      {/*
        칸 뜻풀이 — **한 줄만 펴 두고 나머지는 접는다.**

        전에는 문단 넷이 늘 펼쳐져 있었다. 표 아래 그 정도 분량이 깔리면
        읽는 사람은 아무것도 안 읽는다. 늘 보여야 하는 건 **색이 어느 쪽인가**
        하나뿐이다 — 그건 표를 훑는 동안 계속 필요하다. 나머지는 처음 한 번만
        궁금한 것이라 접어 둔다.
      */}
      <div className="text-table text-ink-muted mt-6">
        <p>
          성향 일곱 칸은 <span style={{ color: "var(--diverge-pos)" }}>■</span>{" "}
          낮음 <span style={{ color: "var(--diverge-neg)" }}>■</span> 높음,
          직무능력 세 칸은 <strong>직원 설문 값</strong>이고 막대 길이가
          값입니다. 줄을 누르면 그래프가 펼쳐집니다.
        </p>
        <Note label="칸마다 무슨 뜻인지" className="mt-3">
          <p>
            <strong>성향</strong>은 축을 왼쪽부터 늘어놓은 것입니다. 어느 쪽도
            좋고 나쁜 것이 아니라 색으로 모양을 먼저 보고 숫자로 값을 확인하는
            칸입니다. <strong>직무능력</strong>은 높을수록 좋은 값이라 갈라지는
            색을 쓰지 않고 한 가지 색의 길이로만 표시합니다.
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
            아래에 모입니다.
          </p>
        </Note>
      </div>
    </>
  );
}

/** 갈래 한 줄 — 앞에 이름을 달고 칩을 늘어놓는다 */
function SortRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/*
        `w-16`(64px)이 「직무능력」 네 글자에 좁아서 **두 줄로 접혔다** —
        칩 줄만 아래로 밀려 어긋나 보였다. 가장 긴 이름에 맞춰 둔다.
      */}
      <span className="text-ink-muted w-20 shrink-0 whitespace-nowrap">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * 정렬 칩.
 *
 * **고른 칩에만 화살표가 붙는다.** 안 고른 칩에까지 달면 열한 개가 전부
 * 화살표를 달고 있어 어느 것이 켜졌는지 안 보인다.
 *
 * 화살표는 **지금 보이는 순서**를 말한다 — `▼`면 큰 값이 위, `▲`면 작은 값이
 * 위다. 이름은 `▲`가 가나다순이다.
 */
function SortChip({
  href,
  on,
  dir,
  children,
}: {
  href: string;
  on: boolean;
  dir?: SortDir;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      // 정렬을 바꿔도 보던 자리에 머문다
      scroll={false}
      className="inline-flex items-center gap-1 rounded-md px-3 py-1.5"
      style={{
        background: on ? "var(--ink)" : "var(--wash)",
        color: on ? "var(--page)" : "var(--ink-secondary)",
        fontWeight: on ? 600 : 400,
      }}
      title={on ? "다시 누르면 반대 순서로 바뀝니다" : undefined}
    >
      {children}
      {on && dir && (
        <span aria-hidden style={{ fontSize: "0.75em" }}>
          {dir === "desc" ? "▼" : "▲"}
        </span>
      )}
      {on && dir && (
        <span className="sr-only">
          {dir === "desc" ? ", 큰 값부터" : ", 작은 값부터"}
        </span>
      )}
    </Link>
  );
}
