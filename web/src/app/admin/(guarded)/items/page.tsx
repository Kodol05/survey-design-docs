import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { Note } from "@/components/ui/Note";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import {
  ABILITY_AXES,
  ABILITY_AXIS_FROM_DB,
  TRAIT_SCALES,
} from "@/lib/items/types";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";

export const metadata = { title: "문항 목록 — 관리자" };

/**
 * 문항 목록 (Task 28) — **읽기 전용**입니다.
 *
 * 그동안 무슨 문항이 나가는지 볼 방법이 `data/items/v1.yaml`을 여는 것뿐이었다.
 * 대표님이 "무슨 질문 하는데?"라고 물으시면 보여드릴 화면이 없었다.
 *
 * ## 고치는 기능을 넣지 않는다
 *
 * 문항은 **파일이 원본**이다 (`data/items/v1.yaml` → seed → DB). 화면에서
 * 고칠 수 있게 하면 파일과 DB가 갈라지고, 어느 쪽이 진짜인지 알 수 없게 된다.
 * 문항을 고치려면 파일을 고치고 다시 seed 한다.
 *
 * ## 역채점 여부를 보여준다
 *
 * 응시 화면에는 절대 넘기지 않는 값이다 — 알면 의식해서 답이 왜곡된다.
 * 여기는 관리자만 들어오므로 보여준다. **문항이 제대로 만들어졌는지
 * 확인하려면 이게 보여야 한다.**
 */
export default async function ItemsPage(props: {
  searchParams: Promise<{ scale?: string }>;
}) {
  await requireAdmin();
  const { scale } = await props.searchParams;

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
    { label: "기질", note: "타고나는 쪽 · TCI 4축", of: TEMPERAMENT },
    { label: "성격", note: "살면서 만들어지는 쪽 · TCI 3축", of: CHARACTER },
    { label: "직무능력", note: "우리가 만든 3축", of: null },
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
  const shown = picked ? items.filter((i) => named(i) === picked) : items;

  const reverseCount = items.filter((i) => i.isReverse).length;

  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-screen-title">문항 목록</h1>
        <p className="text-axis text-ink-muted tabular">
          v{assessment.version} · {items.length}문항
        </p>
      </div>

      <p className="text-ink-secondary mb-6 max-w-[56rem]">
        실제로 나가는 문항 그대로입니다. 순서도 응시 화면과 같습니다.
      </p>

      {/* 축으로 좁혀 보기 */}
      <div className="text-axis mb-8 flex flex-col gap-2">
        {groups.map((g) => (
          <div key={g.label} className="flex flex-wrap items-center gap-1.5">
            {/*
              ⚠️ `w-16`(64px)에 「직무능력」 네 글자가 안 들어가 **두 줄로
              접혔다** — 칩 줄만 아래로 밀려 어긋나 보인다. 구성원 화면에서
              똑같이 겪은 것이라 거기와 같은 폭으로 맞춘다.
            */}
            <span className="text-ink-muted w-20 shrink-0 whitespace-nowrap">
              {g.label}
            </span>
            {(
              g.of ?? [
                ...new Set(
                  items.filter((i) => i.kind === "ABILITY").map(named),
                ),
              ]
            ).map((s) => (
              <Link
                key={s}
                href={
                  picked === s
                    ? "/admin/items"
                    : `/admin/items?scale=${encodeURIComponent(s)}`
                }
                scroll={false}
                className="rounded-md px-3 py-1.5"
                style={{
                  background: picked === s ? "var(--ink)" : "var(--wash)",
                  color: picked === s ? "var(--page)" : "var(--ink-secondary)",
                  fontWeight: picked === s ? 600 : 400,
                }}
              >
                {s}
              </Link>
            ))}
          </div>
        ))}
        {picked && (
          <p className="mt-1">
            <Link href="/admin/items" className="text-ink-secondary underline">
              전체 보기
            </Link>
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="text-table w-full min-w-[48rem]">
          <thead>
            <tr className="text-axis text-ink-muted border-b border-[--border]">
              <th className="w-14 pb-2 text-right font-medium">순서</th>
              <th className="w-36 pb-2 pl-4 text-left font-medium">축</th>
              <th className="w-32 pb-2 text-left font-medium">세부 항목</th>
              <th className="pb-2 pl-4 text-left font-medium">문항</th>
              <th className="w-20 pb-2 text-center font-medium">역채점</th>
              <th className="w-16 pb-2 text-right font-medium">묶음</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr
                key={i.id}
                className="border-b border-[--border] last:border-0"
              >
                <td className="tabular text-ink-muted py-3 text-right">
                  {i.orderNo}
                </td>
                {/*
                  ⚠️ `w-28`에서는 「조직생활 간접」이 **두 줄로 접혔다.**
                  같은 열의 「협력 직접」은 한 줄이라, 줄마다 높이가 달라져
                  훑는 눈이 걸린다. 한 줄로 못 박고 폭을 넉넉히 준다.
                */}
                <td className="py-3 pl-4 whitespace-nowrap">
                  {named(i)}
                  {i.kind === "ABILITY" && (
                    <span className="text-axis text-ink-muted ml-2">
                      {i.isDirect ? "직접" : "간접"}
                    </span>
                  )}
                </td>
                <td className="text-axis text-ink-secondary py-3">
                  {i.subscale ?? "—"}
                </td>
                <td className="py-3 pl-4">{i.content}</td>
                <td className="py-3 text-center">
                  {i.isReverse ? (
                    <span
                      className="text-axis rounded-md px-2 py-0.5"
                      style={{
                        background: "var(--wash)",
                        color: "var(--ink-secondary)",
                      }}
                    >
                      역
                    </span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="tabular text-ink-muted py-3 text-right">
                  {i.section}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Note label="이 화면을 어떻게 읽는지" className="mt-8">
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
          문항을 고치려면 <code>data/items/v1.yaml</code>을 고치고 다시
          올립니다. 이 화면에서는 고칠 수 없습니다 — 화면에서 고치게 하면 파일과
          실제 문항이 갈라져 어느 쪽이 진짜인지 알 수 없게 됩니다.
        </p>
      </Note>
    </>
  );
}
