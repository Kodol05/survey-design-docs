"use client";

import { useEffect, useRef, useState } from "react";
import { TraitBars } from "@/components/charts/TraitBars";
import { TraitRadar } from "@/components/charts/TraitRadar";
import {
  AbilityStrip,
  AbilityStripHeader,
  TraitStrip,
  TraitStripHeader,
} from "@/components/analysis/TraitStrip";
import { CHARACTER, TEMPERAMENT, abilityColorAt } from "@/components/charts/scale";
import { QuickRead } from "@/components/analysis/QuickRead";
import { ButtonLink } from "@/components/ui/Button";
import { panelClass } from "@/components/ui/Panel";
import { DeleteInline } from "./DeleteInline";
import { ABILITY_AXES } from "@/lib/items/types";
import { formatPhone } from "@/lib/auth/phone";

/**
 * 구성원 목록.
 *
 * **줄을 누르면 그 자리에서 펼쳐진다.** 상세 화면으로 넘어가지 않아도 다각형
 * 그래프와 세로 막대로 모양을 볼 수 있다. 50명을 훑을 때 한 명 볼 때마다
 * 화면을 오가면 흐름이 끊긴다. 더 자세한 것은 상세 화면에서 본다.
 *
 * ## 표가 아니라 칸으로 둔다 (2026-08-25 사용자 결정)
 *
 * 전에는 `<table>`이었다. 줄과 줄 사이가 가는 선 하나뿐이라 **한 사람이
 * 어디서 시작해 어디서 끝나는지**가 흐렸다 — 특히 펼쳤을 때, 펼쳐진 내용이
 * 표의 다른 줄인지 그 사람의 것인지 눈으로 갈라야 했다.
 *
 * 한 사람을 테두리로 감싸면 그 물음이 없어진다. 펼친 내용도 **같은 테두리
 * 안**에서 자라므로 누구 것인지 묻지 않아도 된다.
 *
 * 칸은 **크기가 서로 비슷해야** 한다. 사람마다 높이가 달라지면 훑는 눈이
 * 자꾸 걸린다. 그래서 왼쪽 글자 블록을 두 줄로 못 박고, 값이 없는 자리도
 * 빈 줄로 두지 않고 `—`를 적는다.
 *
 * ## 칸도 카드 모양으로 (2026-10-07 사용자 결정)
 *
 * 관리자 화면이 카드(`Panel`)로 바뀌면서 바탕(`--canvas`)이 한 단 어두워졌다.
 * 테두리만 두른 칸은 그 바탕 위에서 구멍처럼 보였다. 그래서 칸도 카드와
 * 같은 겉모양(`panelClass` — 밝은 바탕 · 가는 테두리 · 옅은 그림자)을 쓴다.
 * 칸 하나가 한 사람이라는 것은 그대로다.
 *
 * 열 머리글은 이제 이 파일이 아니라 위에 붙어 다니는 도구줄(`StickyToolbar`)
 * 아래 끝에 들어간다 — `EmployeeListHeader`. 자리는 `COLUMNS` 하나를 같이
 * 써서 맞춘다.
 */

export type Row = {
  id: string;
  name: string;
  phone: string | null;
  status: string | null;
  flag: string;
  agreement: number | null;
  fastCount: number | null;
  completedLabel: string | null;
  /** CSV 용 "2026-09-30" (한국 날짜) */
  completedDay: string | null;
  traits: Record<string, number> | null;
  abilities: Record<string, number> | null;
};

const FLAG = {
  review: { label: "검토", color: "var(--status-warn)" },
  // 「미달」이라고 쓰지 않는다 — 사람을 깎는 말로 읽힌다. 낮은 것은 응답의 값이다
  poor: { label: "낮음", color: "var(--status-critical)" },
} as const;

/*
  `ABANDONED`가 빠져 있어 **빈 칸으로 나오고 있었다.** 14일 정리를 켜면
  실제로 생기는 상태다 (2026-08-25).
*/
const STATUS = {
  COMPLETED: "완료",
  IN_PROGRESS: "진행 중",
  ABANDONED: "중단",
} as const;

/*
  칸 안의 자리 배분 — **머리글과 줄이 이 한 줄을 같이 쓴다.**

  왼쪽 글자 블록은 **고정폭**이다 — 이름 길이에 따라 오른쪽 스트립이 밀리면
  칸끼리 축이 안 맞아서 세로로 훑을 수가 없다. 성향만 남는 폭을 가져간다.

  직무능력 칸도 폭을 못 박는다 (2026-10-07). 전에는 `auto`라 그 칸의 폭이
  **내용에 따라** 정해졌다. 머리글이 도구줄 카드로 옮겨 가 줄과 다른 격자에
  있게 되면서, 직무능력 값이 없는 사람(`—` 한 글자)은 그 칸이 좁아지고 성향
  칸이 넓어져 머리글과 어긋날 수 있다. 네 칸(4.25rem) + 사이 셋 + 세로선이
  20rem 남짓이라 넉넉히 20.25rem으로 둔다.
*/
const COLUMNS =
  "gap-x-6 gap-y-4 " +
  "xl:grid-cols-[minmax(11rem,13rem)_5rem_minmax(0,1fr)_20.25rem] xl:items-center";
/** 머리글·줄이 같이 쓰는 좌우 여백 — 이것까지 같아야 자리가 맞는다 */
const PAD_X = "px-5 pr-6";
/*
  칸마다 **키를 같게 잡는다** (2026-08-25 화면에서 확인).

  결과가 있는 사람은 성향 스트립이 높이를 만들어 주는데, 미응시인 사람은
  글자 두 줄뿐이라 칸이 눈에 띄게 낮았다. 「비슷한 사이즈 박스」가 목적인데
  거기서 어긋난다. 안쪽에 최소 높이를 걸어 둔다.
*/
const MIN_H = "xl:min-h-[4.5rem]";
/** 칸 안 — 좁으면 한 줄에 하나씩 쌓는다 */
const LAYOUT = `grid grid-cols-1 ${COLUMNS}`;
/*
  머리글 줄 — **`grid`를 붙이지 않는다.** `hidden`과 `grid`를 같이 주면
  어느 쪽이 이기는지가 Tailwind가 규칙을 찍어내는 순서에 달린다.
  `xl:grid`만 주면 좁은 화면에서는 `hidden`만 남는다. 좁은 화면에서는
  칸 안에 이름표가 따로 붙으므로 머리글이 필요 없다.
*/
const HEAD = `hidden ${PAD_X} xl:grid ${COLUMNS}`;

/**
 * 열 머리글 — 도구줄 카드 아래 끝에 들어간다 (2026-10-07 사용자 결정).
 *
 * 위에 **갈래 이름 줄**을 하나 더 둔다. 「자극 위험 민감 …」 일곱과 「협력
 * 조직 실행 평균」 넷이 나란히 있으면 어디까지가 성향인지 머리글만 봐서는
 * 안 보인다. 갈래 이름 아래 가는 선을 그 갈래 폭만큼 그어 묶는다.
 *
 * 성향 쪽 끝에는 색 범례를 붙인다 — 색이 어느 쪽이 높음인지는 표를 훑는
 * 내내 필요해서, 맨 아래 접힌 설명에 넣으면 안 된다.
 */
export function EmployeeListHeader() {
  return (
    <div aria-hidden className="text-axis text-ink-muted">
      <div className={`${HEAD} pt-2.5`}>
        <span />
        <span />
        <GroupLabel max="max-w-[56rem]">
          <span>성향</span>
          <span className="flex items-center gap-2" style={{ fontSize: 14 }}>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-[2px]" style={{ background: "var(--scale-0)" }} />
              낮음
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-[2px]" style={{ background: "var(--scale-100)" }} />
              높음
            </span>
          </span>
        </GroupLabel>
        <GroupLabel max="max-w-[33rem]">
          <span>직무능력</span>
        </GroupLabel>
      </div>
      <div className={`${HEAD} pt-1.5 pb-2.5`}>
        <span>이름</span>
        <span>신뢰도</span>
        <TraitStripHeader />
        <AbilityStripHeader />
      </div>
    </div>
  );
}

function GroupLabel({ max, children }: { max: string; children: React.ReactNode }) {
  return (
    <div
      className={`text-ink-secondary flex w-full items-baseline justify-between gap-3 border-b border-(--border) pb-1 ${max}`}
    >
      {children}
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EmployeeList({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  /*
    펼치면 **그 사람 칸의 윗변을 도구줄 바로 아래로** 끌어온다 (2026-10-07
    사용자 결정). 아래쪽 사람을 펼치면 패널이 화면 밖에서 자라서, 눌렀는데
    아무 일도 없는 것처럼 보였다. 위로 밀어 올릴 자리는 `scroll-margin-top`
    (머리줄 + 도구줄 접힌 키)이 정한다. 접을 때는 움직이지 않는다 — 보던
    자리를 잃는다.
  */
  useEffect(() => {
    if (!openId) return;
    itemRefs.current.get(openId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }, [openId]);

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const expanded = openId === r.id;
        const canExpand = Boolean(r.traits);
        return (
          <li
            key={r.id}
            ref={(el) => {
              if (el) itemRefs.current.set(r.id, el);
              else itemRefs.current.delete(r.id);
            }}
            className={`${panelClass} overflow-hidden transition-[border-color,box-shadow]`}
            style={{
              borderColor: expanded ? "var(--ink-muted)" : undefined,
              scrollMarginTop:
                "calc(var(--admin-top) + 0.5rem + var(--sticky-toolbar-h, 0px) + 0.75rem)",
            }}
          >
            {/*
              칸 전체가 누르는 자리다. `<button>`으로 감싸면 안쪽 그래프의
              `title`과 겹치므로 `<div>`에 역할을 준다.
            */}
            <div
              role={canExpand ? "button" : undefined}
              tabIndex={canExpand ? 0 : undefined}
              aria-expanded={canExpand ? expanded : undefined}
              onClick={() => canExpand && setOpenId(expanded ? null : r.id)}
              onKeyDown={(e) => {
                if (!canExpand) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenId(expanded ? null : r.id);
                }
              }}
              className={`${LAYOUT} ${MIN_H} ${PAD_X} py-4 transition-colors ${
                canExpand ? "hover:bg-card-head cursor-pointer" : ""
              } ${expanded ? "bg-card-head" : ""}`}
            >
              {/* ── 누구인가 ── */}
              <div className="min-w-0">
                <p className="flex items-baseline gap-2">
                  <span className="text-table truncate font-medium">{r.name}</span>
                  <span className="text-axis text-ink-muted shrink-0">
                    {r.status ? STATUS[r.status as keyof typeof STATUS] : "미응시"}
                  </span>
                  {/*
                    펼침 표시는 **이름 바로 옆**에 둔다. `ml-auto`로 칸 오른쪽
                    끝에 붙였더니 이름과 멀어져서 옆 열(신뢰도)에 딸린
                    것처럼 보였다.
                  */}
                  {canExpand && (
                    <span aria-hidden className="text-ink-muted -ml-0.5">
                      {expanded ? "▾" : "▸"}
                    </span>
                  )}
                </p>
                <p className="text-axis text-ink-secondary tabular mt-0.5 truncate">
                  {r.phone ? formatPhone(r.phone) : "번호 없음"}
                  <span className="text-ink-muted">
                    {" · "}
                    {r.completedLabel ?? "—"}
                  </span>
                </p>
              </div>

              {/* ── 이 응답을 믿을 수 있는가 ── */}
              <div>
                <span className="text-axis text-ink-muted mr-2 xl:hidden">신뢰도</span>
                <Quality flag={r.flag} agreement={r.agreement} fastCount={r.fastCount} />
              </div>

              {/* ── 어떤 사람인가 ── */}
              <div className="min-w-0">
                {r.traits && (
                  <span className="text-axis text-ink-muted mb-1 block xl:hidden">성향</span>
                )}
                <TraitStrip traits={r.traits} />
              </div>

              <div className="min-w-0">
                {r.abilities && (
                  <span className="text-axis text-ink-muted mb-1 block xl:hidden">
                    직무능력
                  </span>
                )}
                <AbilityStrip abilities={r.abilities} />
              </div>
            </div>

            {expanded && r.traits && (
              <div className="border-t border-(--border) px-5 py-8 sm:px-6">
                <Detail row={r} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 응답 품질 — 등급만 있던 것을 **숫자와 같이** 보여준다.
 *
 * 종전에는 `검토`·`미달` 두 글자뿐이라, 아무것도 안 적힌 사람들 사이에서
 * 누가 아슬아슬하고 누가 넉넉한지 구분되지 않았다. `ok` 안에서도 편차가 크다.
 *
 * 숫자는 **반대 문항 일치도**를 쓴다. 저장된 값 중 "이 응답을 믿을 수 있는가"에
 * 가장 곧바로 답하는 값이다 — 서로 반대인 문항에 같은 방향으로 답했는지를 잰다.
 * 100이면 짝마다 완전히 일관됐고, 무작위로 답하면 60 근처가 나온다.
 *
 * ⚠️ 등급은 일치도만으로 정해지지 않는다. **너무 빨리 넘긴 문항 비율**도 같이
 *    본다(00 §2.3). 그래서 일치도가 높은데 `미달`인 사람이 있을 수 있고,
 *    그 경우가 헷갈리지 않도록 속도 쪽이 걸린 것이면 따로 표시한다.
 */
function Quality({
  flag,
  agreement,
  fastCount,
}: {
  flag: string;
  agreement: number | null;
  fastCount: number | null;
}) {
  if (agreement === null) return <span className="text-ink-muted text-axis">—</span>;

  const pct = Math.round(agreement * 100);
  const meta = FLAG[flag as keyof typeof FLAG];
  // 일치도는 멀쩡한데 등급이 걸렸다면 속도 쪽이 원인이다
  const bySpeed = Boolean(meta) && agreement >= 0.7;

  return (
    <span
      className="inline-flex items-baseline gap-1.5"
      title={
        `반대 문항 일치도 ${pct}점` +
        (fastCount !== null ? ` · 1.5초 안에 답한 문항 ${fastCount}개` : "") +
        (meta ? ` · ${meta.label}` : "")
      }
    >
      <span
        className="tabular text-table font-medium"
        style={{ color: meta ? meta.color : "var(--ink-secondary)" }}
      >
        {pct}
      </span>
      {meta && (
        <span className="text-axis" style={{ color: meta.color }}>
          {bySpeed ? "속도" : meta.label}
        </span>
      )}
    </span>
  );
}

/**
 * 펼침 패널.
 *
 * **세로로 짧게 두는 것이 이 패널의 제약이다.** 목록 한가운데를 밀어내며
 * 열리기 때문에, 키가 크면 앞뒤 줄이 화면 밖으로 밀려 "50명을 훑는다"는
 * 목록의 목적이 깨진다.
 *
 * 그래서 두 가지를 지킨다.
 *  1. **한 줄 3단**으로 늘어놓는다 — 레이더·막대·직무능력을 세로로 쌓지 않는다.
 *  2. **레이더에 상한을 둔다.** `aspectRatio`가 걸려 있어 폭이 곧 높이다.
 *     상한이 없으면 넓은 화면일수록 패널이 커진다 (1920에서 806px까지 갔다).
 *
 * 칸이 이미 카드라 안에 카드를 또 두르지 않는다 — 가는 선과 여백으로만 나눈다.
 */
function Detail({ row }: { row: Row }) {
  const traits = row.traits!;
  const ordered = [...TEMPERAMENT, ...CHARACTER]
    .filter((s) => typeof traits[s] === "number")
    .map((s) => ({ scale: s, percent: traits[s] }));
  // 순서를 고정한다 — Object.entries는 저장된 순서를 따라가서 사람마다 뒤바뀔 수 있다
  const abilities = ABILITY_AXES.filter(
    (a) => typeof row.abilities?.[a] === "number",
  ).map((a) => [a, row.abilities![a]] as const);

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-section-title">{row.name}</h3>
        <ButtonLink href={`/admin/employees/${row.id}`} size="lg">
          상세 보기
        </ButtonLink>
      </div>

      {/*
        **격자로 둔다. flex-wrap으로 두지 않는다.**

        네 칸을 늘어놓으면 총 90rem이 넘어 어느 노트북에서도 한 줄에 안 들어간다.
        flex-wrap에 맡기면 화면 폭에 따라 3+1로 접혔다 2+2로 접혔다 해서
        열 때마다 배치가 달라진다. 2단·4단만 쓰도록 못 박는다.

        4단일 때 넷을 똑같이 나누면 막대 그래프 칸이 270px 안팎이라 일곱 축
        이름(축당 38px)이 서로 겹친다 (2026-09-18 신고). 막대에만 넉넉히 준다 —
        레이더·직무능력은 각각 상한이 있어 좁혀도 그대로다.
      */}
      <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,1fr)]">
        <div className="w-full max-w-[23rem]">
          <TraitRadar data={ordered} showValues compact />
        </div>

        <div className="w-full max-w-[31rem]">
          {/* 펼침 패널은 칸이 좁다 — 라벨을 작게, 넉 자 이름은 두 줄로 (겹침 방지) */}
          <TraitBars rows={ordered} height={280} compact />
        </div>

        {abilities.length > 0 && (
          <div className="w-full max-w-[19rem]">
            <p className="text-table text-ink-secondary mb-3">직무능력</p>
            <ul className="flex flex-col gap-3">
              {abilities.map(([axis, v]) => (
                <li key={axis}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-table">{axis}</span>
                    <span className="tabular font-medium">{Math.round(v)}</span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--grid)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, Math.min(100, v))}%`,
                        background: abilityColorAt(v),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 「사내 위치는 상세 보기에」 안내 문장은 뺐다 — 위 단추가 이미 말한다 (2026-10-07) */}
        <div className="w-full max-w-[23rem]">
          <QuickRead traits={traits} />
        </div>
      </div>

      {/*
        삭제는 **맨 아래 오른쪽 구석**에 둔다. 「상세 보기」 버튼은 위쪽에
        있으니 되돌릴 수 있는 것과 없는 것이 서로 멀리 떨어진다.
      */}
      <div className="mt-8 flex justify-end border-t border-(--border) pt-5">
        <DeleteInline employeeId={row.id} name={row.name} />
      </div>
    </div>
  );
}
