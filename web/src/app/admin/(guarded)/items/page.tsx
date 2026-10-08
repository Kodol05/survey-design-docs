import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { Note } from "@/components/ui/Note";
import { Panel } from "@/components/ui/Panel";
import { StickyToolbar } from "@/components/ui/StickyToolbar";
import { Chip, ChipGroup, ChipGroups, ToolbarSearch } from "@/components/ui/ToolbarChips";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import {
  ABILITY_AXES,
  ABILITY_AXIS_FROM_DB,
  TRAIT_SCALES,
} from "@/lib/items/types";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";

export const metadata = { title: "문항 목록 — 관리자" };

/*
  문항 목록의 열 배분 — **머리글과 줄이 이 한 줄을 같이 쓴다** (2026-10-07).

  머리글이 위에 붙어 다니는 도구줄 카드로 옮겨 가면서 `<table>`의 `<thead>`를
  쓸 수 없게 됐다 — 머리글과 본문이 서로 다른 상자에 있다. 그래서 둘 다 같은
  격자 틀을 쓰고, 좌우 여백(`px-5`)까지 같게 둬서 자리를 맞춘다.

  축 칸은 넉넉히 둔다. `w-28`(7rem)에서 「조직생활 간접」이 **두 줄로
  접혔다** — 같은 열의 「협력 직접」은 한 줄이라 줄마다 높이가 달라져 훑는
  눈이 걸렸다.

  좁은 화면(md 아래)에서는 격자를 풀고 한 줄에 몰아 쓴다. 전에는 표를 가로로
  밀어 봤는데, 머리글이 따로 떨어진 지금은 가로 스크롤이 머리글과 어긋난다.
*/
const ITEM_COLS =
  "md:grid md:grid-cols-[3rem_9.5rem_8rem_minmax(0,1fr)_4.5rem_3.5rem_3.5rem] md:items-baseline md:gap-x-4";

/**
 * 문항 목록 (Task 28).
 *
 * 그동안 무슨 문항이 나가는지 볼 방법이 `data/items/v1.yaml`을 여는 것뿐이었다.
 * 대표님이 "무슨 질문 하는데?"라고 물으시면 보여드릴 화면이 없었다.
 *
 * 처음에는 읽기 전용이었다. 지금은 줄마다 **수정**으로 넘어가 DB 값을 고칠 수
 * 있다(`[id]`). 원본 파일은 그대로라 같은 내용을 파일에도 옮겨 둬야 한다.
 *
 * ## 역채점 여부를 보여준다
 *
 * 응시 화면에는 절대 넘기지 않는 값이다 — 알면 의식해서 답이 왜곡된다.
 * 여기는 관리자만 들어오므로 보여준다. **문항이 제대로 만들어졌는지
 * 확인하려면 이게 보여야 한다.**
 *
 * ## 문구로 찾기 (2026-10-07 사용자 결정)
 *
 * 「그 '쉽게 지친다' 문항 몇 번이지?」를 120줄을 눈으로 훑어 찾았다. 도구줄에
 * 검색 칸을 두고 `?q=`로 **서버에서** 거른다. 축 칩이 이미 서버에서 거르는
 * 링크라, 검색도 같은 길로 가야 둘을 함께 걸고 주소로 나눠 볼 수 있다.
 * 120개라 이미 다 읽어 온 것을 걸러도 부담이 없다.
 */
export default async function ItemsPage(props: {
  searchParams: Promise<{ scale?: string; q?: string }>;
}) {
  await requireAdmin();
  const { scale, q } = await props.searchParams;

  const assessment = await prisma.assessment.findFirst({
    where: { isActive: true },
  });
  if (!assessment)
    return (
      <>
        <h1 className="text-screen-title mb-6">문항 목록</h1>
        <EmptyState message="아직 문항이 올라가지 않았습니다. npm run db:seed 를 돌려주세요." />
      </>
    );

  const items = await prisma.item.findMany({
    where: { assessmentId: assessment.id },
    orderBy: { orderNo: "asc" },
  });

  const named = (i: (typeof items)[number]) =>
    i.kind === "TRAIT" ? i.scale! : ABILITY_AXIS_FROM_DB[i.abilityAxis!];

  const groups = [
    { label: "기질", of: TEMPERAMENT as readonly string[] },
    { label: "성격", of: CHARACTER as readonly string[] },
    {
      label: "직무능력",
      of: [...new Set(items.filter((i) => i.kind === "ABILITY").map(named))],
    },
  ];

  /*
    ⚠️ **직무능력 칩이 눌려도 아무 일이 없었다** (2026-08-26 사용자 발견).

    받아들이는 이름을 `TRAIT_SCALES`로만 봤는데, 거기에는 성향 7축밖에 없다.
    직무능력 세 축은 `ABILITY_AXES`에 있어서 `?scale=협력`이 통째로 버려졌고,
    **칩은 멀쩡히 그려지는데 눌러도 목록이 그대로**였다. 고르개가 있으면
    눌린다고 믿는다 — 안 되면 화면이 고장 난 것으로 보인다.

    거르는 쪽(`named`)은 처음부터 두 갈래를 다 다루고 있었다. 받는 문턱만
    한쪽을 몰랐던 것이다.
  */
  const known = (n: string) =>
    TRAIT_SCALES.includes(n as never) || ABILITY_AXES.includes(n as never);
  const picked = scale && known(scale) ? scale : null;
  const keyword = (q ?? "").trim();
  // 영문이 섞인 문구도 있어 대소문자는 가리지 않는다
  const needle = keyword.toLowerCase();
  const shown = items.filter(
    (i) =>
      (!picked || named(i) === picked) &&
      (!needle || i.content.toLowerCase().includes(needle)),
  );
  const filtered = Boolean(picked || keyword);

  const reverseCount = items.filter((i) => i.isReverse).length;

  /** 검색어는 축을 바꿔도 따라간다 */
  const href = (s: string | null) => {
    const sp = new URLSearchParams();
    if (s) sp.set("scale", s);
    if (keyword) sp.set("q", keyword);
    const str = sp.toString();
    return `/admin/items${str ? `?${str}` : ""}`;
  };

  const summary = (
    <>
      축: <span className="text-ink font-medium">{picked ?? "전체"}</span>
      {keyword && <> · &ldquo;{keyword}&rdquo;</>}
    </>
  );

  return (
    <>
      {/* 제목 줄 — 설명 문장은 맨 아래 접힌 설명으로 옮겼다 (2026-10-07 사용자 결정) */}
      <h1 className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <span className="text-screen-title">문항 목록</span>
        <span className="text-axis text-ink-muted tabular">
          v{assessment.version} · {items.length}문항
        </span>
      </h1>

      {/*
        검색 · 축 칩 · 열 머리글을 카드 하나로 묶어 위에 붙여 둔다 — 구성원
        목록과 같은 도구줄이다 (`StickyToolbar`). 축 칩은 기질 | 성격 | 직무능력
        갈래를 세로선으로 나눠 한 흐름에 늘어놓는다.
      */}
      <StickyToolbar
        label="문항 목록 도구"
        search={
          <ToolbarSearch
            defaultValue={keyword}
            placeholder="문항 문구"
            hidden={{ scale: picked ?? undefined }}
          />
        }
        summary={summary}
        end={
          filtered && (
            <span className="flex items-center gap-3">
              <span className="tabular">{shown.length}문항</span>
              <Link href="/admin/items" scroll={false} className="text-ink-secondary underline">
                전체 보기
              </Link>
            </span>
          )
        }
        header={
          <div
            aria-hidden
            className={`text-axis text-ink-muted hidden px-5 py-2.5 font-medium ${ITEM_COLS}`}
          >
            <span className="text-right">순서</span>
            <span>축</span>
            <span>세부 항목</span>
            <span>문항</span>
            <span className="text-center">역채점</span>
            <span className="text-right">묶음</span>
            <span className="text-right">수정</span>
          </div>
        }
      >
        <ChipGroups>
          {groups.map((g) => (
            <ChipGroup key={g.label} label={g.label}>
              {g.of.map((s) => (
                // 고른 칩을 다시 누르면 풀린다
                <Chip key={s} href={href(picked === s ? null : s)} on={picked === s}>
                  {s}
                </Chip>
              ))}
            </ChipGroup>
          ))}
        </ChipGroups>
      </StickyToolbar>

      <Panel flush>
        {shown.length === 0 ? (
          <p className="text-ink-muted px-5 py-10 text-center">맞는 문항이 없습니다.</p>
        ) : (
          <ol className="text-table">
            {shown.map((i) => (
              <li
                key={i.id}
                className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-(--border) px-5 py-3 last:border-0 ${ITEM_COLS}`}
              >
                <span className="tabular text-ink-muted md:text-right">{i.orderNo}</span>
                <span className="whitespace-nowrap">
                  {named(i)}
                  {i.kind === "ABILITY" && (
                    <span className="text-axis text-ink-muted ml-2">
                      {i.isDirect ? "직접" : "간접"}
                    </span>
                  )}
                </span>
                <span className="text-axis text-ink-secondary">{i.subscale ?? "—"}</span>
                {/* 좁은 화면에서는 문구가 한 줄을 다 쓴다 */}
                <span className="basis-full md:basis-auto">{i.content}</span>
                <span className="md:text-center">
                  {i.isReverse ? (
                    <span
                      className="text-axis rounded-md px-2 py-0.5"
                      style={{ background: "var(--wash)", color: "var(--ink-secondary)" }}
                    >
                      역
                    </span>
                  ) : (
                    <span className="text-ink-muted max-md:hidden">—</span>
                  )}
                </span>
                <span className="tabular text-ink-muted md:text-right">
                  <span className="text-axis md:hidden">묶음 </span>
                  {i.section}
                </span>
                <span className="max-md:ml-auto md:text-right">
                  <Link href={`/admin/items/${i.id}`} className="text-ink-secondary underline">
                    수정
                  </Link>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Note label="이 화면을 어떻게 읽는지" className="mt-8">
        <p className="mb-2">
          실제로 나가는 문항 그대로이고, 순서도 응시 화면과 같습니다.
        </p>
        <p className="mb-2">
          <strong>역채점</strong>은 답을 뒤집어 계산하는 문항입니다. 「나는 쉽게
          지친다」에 「매우 그렇다」로 답하면 인내력 점수는 낮게 잡힙니다. 전체{" "}
          <span className="tabular">{items.length}</span>문항 중{" "}
          <span className="tabular">{reverseCount}</span>개입니다.
        </p>
        <p className="mb-2">
          한 방향으로만 물으면 <strong>읽지 않고 한쪽으로 쭉 찍는 것</strong>을
          걸러낼 수 없습니다. 반대 방향 문항을 섞어 두면 그 사람의 답이 서로
          어긋나고, 그것이 응답 신뢰도 점수가 됩니다.
        </p>
        <p className="mb-2">
          <strong>직무능력</strong> 문항의 「직접」은 능력을 바로 묻는 것이고
          「간접」은 행동을 묻는 것입니다. 직접형만 두면 거의 다 높게 답해서
          사람마다 구분이 되지 않습니다.
        </p>
        <p>
          문항은 오른쪽 <strong>수정</strong>으로 바로 고칠 수 있습니다 — 문구는
          물론 축·세부 항목·역채점·묶음 같은 채점에 쓰는 값도요. 다만 채점값을
          바꾸면 이미 답한 사람들의 점수 근거가 달라지니, 수정 화면의 경고를
          먼저 읽어 주세요. 원본 파일 <code>data/items/v1.yaml</code>이 아니라
          DB 만 바뀌므로, 같은 내용을 파일에도 반영해 두면 좋습니다.
        </p>
      </Note>
    </>
  );
}
