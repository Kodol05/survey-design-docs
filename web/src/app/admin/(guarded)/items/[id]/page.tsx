import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { ABILITY_AXIS_FROM_DB } from "@/lib/items/types";
import { ItemEditForm } from "./ItemEditForm";

export const metadata = { title: "문항 수정 — 관리자" };

/**
 * 문항 하나를 고치는 화면 (2026-09-18).
 *
 * 목록(`../page.tsx`)은 오래도록 읽기 전용이었다. 사용자가 목록에서 바로
 * 고치고 채점에 쓰는 값까지 조정하고 싶다고 해서 이 화면을 뒀다. 무엇이
 * 걸리는지(파일과 갈라짐 · 지난 응답 근거 어긋남)는 아래 경고로 분명히 둔다.
 */
export default async function ItemEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await props.params;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  // 세부 항목 입력을 도우려 지금 쓰는 값들을 모아 datalist 로 준다
  const subs = await prisma.item.findMany({
    where: { assessmentId: item.assessmentId, subscale: { not: null } },
    select: { subscale: true },
    distinct: ["subscale"],
    orderBy: { subscale: "asc" },
  });
  const subscaleOptions = subs
    .map((s) => s.subscale!)
    .filter((v): v is string => Boolean(v));

  const axisName =
    item.kind === "TRAIT"
      ? item.scale
      : ABILITY_AXIS_FROM_DB[item.abilityAxis!];

  return (
    <>
      <p className="text-axis mb-2">
        <Link href="/admin/items" className="text-ink-secondary underline">
          문항 목록
        </Link>
      </p>
      <h1 className="text-screen-title mb-1">문항 수정</h1>
      <p className="text-axis text-ink-muted mb-6 tabular">
        {item.code} · {axisName} · {item.orderNo}번
      </p>

      {/*
        경고는 접지 않고 늘 보이게 둔다 — 채점값을 바꾸는 화면이라 여기서만은
        먼저 읽혀야 한다. 상자 대신 왼쪽 색선으로 세운다 (11 §1.1).
      */}
      <div
        className="text-table text-ink-secondary mb-8 max-w-[52rem] border-l-2 pl-4 leading-relaxed"
        style={{ borderColor: "var(--status-warn)" }}
      >
        <p
          className="mb-2 font-medium"
          style={{ color: "var(--status-warn-ink)" }}
        >
          고치기 전에
        </p>
        <p className="mb-2">
          축·세부 항목·역채점을 바꾸면 <strong>이 문항에 이미 답한 사람들의
          점수 근거가 달라집니다.</strong> 지난 결과지는 응시 시점 값으로
          고정돼 있어 그대로지만, 다시 채점하면 값이 바뀝니다.
        </p>
        <p>
          문항의 원본은 <code>data/items/v1.yaml</code> 파일입니다. 여기서
          고치면 파일이 아니라 <strong>DB 만</strong> 바뀌어 둘이 갈라집니다.
          같은 내용을 파일에도 반영해 두시면 다음 셋업이 어긋나지 않습니다.
        </p>
      </div>

      <ItemEditForm
        id={item.id}
        kind={item.kind as "TRAIT" | "ABILITY"}
        code={item.code}
        orderNo={item.orderNo}
        content={item.content}
        section={item.section}
        isReverse={item.isReverse}
        status={item.status}
        scale={item.scale}
        subscale={item.subscale}
        abilityAxis={item.abilityAxis}
        isDirect={item.isDirect}
        subscaleOptions={subscaleOptions}
      />
    </>
  );
}
