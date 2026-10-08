"use client";

import { formatR } from "./correlationColor";
import { formatReliability } from "./reliability";
import { subjectParticle } from "./correlationWords";
import { Note } from "../ui/Note";
import type { Point } from "./ScatterPlot";
import { DivergingBar } from "./DivergingBar";
import { ShareList } from "./ShareList";
import type { Composite } from "@/lib/admin/composite";

/**
 * 세 능력을 묶은 값이 **무엇과 가장 연관되는가** (2026-08-25 사용자 요청).
 *
 * 위쪽은 「협력은 무엇과」, 「조직생활은 무엇과」를 따로 말한다. 실제로
 * 궁금한 것은 그다음이다 — **「전반적으로 일이 되는 사람은 어떤 사람인가」.**
 *
 * ## 무리 가르기 대신 위 카드와 같은 % 줄로 (2026-10-07 사용자 결정)
 *
 * 전에는 성향이 높은 3분의 1과 낮은 3분의 1의 평균 점수 차이를 보였다.
 * 위 카드와 눈금이 달라(점 대 상관) 두 카드가 머릿속에서 이어지지 않았다.
 * 이제 같은 `ShareList`로 일곱 축을 |r| 순으로 늘어놓는다 — 값은 직무능력
 * 평균과의 상관(`abilityComposite().drivers`)이다.
 *
 * ## 묶어도 된다는 근거는 접어서 남긴다
 *
 * 서로 다른 것을 재는 축을 더하면 총합은 아무 뜻도 없어진다. 축끼리의
 * 상관과 α는 「평균을 낼 만한가」에 접어 둔다.
 */
export function CompositePanel({
  c,
  full,
  scatter,
  trends,
}: {
  c: Composite;
  /** 막대가 끝까지 차는 % — 위 카드와 같은 값 */
  full: number;
  /** `축이름` → 점(가로 성향, 세로 세 능력 평균). 줄을 눌렀을 때 그린다 */
  scatter?: Record<string, Point[]>;
  trends?: Record<string, { x: number; y: number }[] | null>;
}) {
  const shaky = c.verdict === "poor";
  const rows = c.drivers.map((d) => ({ scale: d.scale, ...d.corr }));

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-axis text-ink-muted">
          아직 견줘 볼 만큼 모이지 않았습니다.
        </p>
      ) : (
        <ShareList
          rows={rows}
          full={full}
          target="직무능력"
          sentence={(r) => (
            <>
              {r.scale}
              {subjectParticle(r.scale)} 높은 사람일수록 직무능력(협력·조직생활·자율적
              실행 평균)이 {r.r >= 0 ? "높은" : "낮은"} 편입니다.
            </>
          )}
          scatter={scatter}
          trends={trends}
        />
      )}

      {/*
        해설은 접어 둔다 (2026-08-25 사용자 요청). 처음 한 번 읽으면 되는
        것들이라 늘 펴 두면 목록보다 설명이 길어진다.
      */}
      <div className="mt-6 flex flex-col gap-2 border-t border-(--border) pt-4">
        <Note label="어떻게 잰 것인지">
          <p className="mb-2">
            협력·조직생활·자율적 실행 <strong>세 값의 평균</strong>을 직무능력
            점수로 보고, 성향 축마다 그 점수와의 관련도(r)를 냈습니다.
          </p>
          <p className="mb-2">
            <strong>%는 r을 제곱한 값</strong>입니다. 직무능력 점수가 사람마다
            다른 정도 가운데 <strong>그 성향과 같이 움직이는 몫</strong>이
            몇 %인지를 뜻합니다. 앞의 <span className="tabular">+</span>·
            <span className="tabular">−</span>는 방향입니다 — +면 성향이 높을수록
            직무능력도 높고, −면 낮습니다.
          </p>
          <p className="mb-2">
            <span className="tabular">{c.values.length}</span>명 규모에서는
            관계가 없어도 몇 %쯤은 우연히 나옵니다. 옅게 그린 줄은 방향이 아직
            확정되지 않은 것입니다.
          </p>
          <p>
            같이 움직인다는 뜻이지 <strong>원인이라는 뜻은 아닙니다.</strong>
          </p>
        </Note>

        <Note label="평균을 낼 만한가">
          <ul className="mb-3 flex flex-col gap-1.5">
            {c.pairs.map((p) => (
              <li key={`${p.a}${p.b}`} className="flex items-center gap-3">
                <span className="w-[11rem] shrink-0">
                  {p.a} <span className="text-ink-muted">×</span> {p.b}
                </span>
                <span className="block w-full max-w-[7rem] shrink">
                  <DivergingBar r={p.r} height={11} />
                </span>
                <span className="tabular w-11 shrink-0 text-right">
                  {formatR(p.r)}
                </span>
              </li>
            ))}
          </ul>
          <p>
            세 능력이 서로 같이 움직여야 평균이 뜻을 갖습니다. 묶으면{" "}
            {c.alpha !== null && (
              <strong
                className="tabular"
                style={{ color: shaky ? "var(--status-critical)" : undefined }}
              >
                신뢰도 {formatReliability(c.alpha)}
              </strong>
            )}
            {shaky ? (
              <>
                {" "}
                — <strong>아직 묶을 만하지 않습니다.</strong>
              </>
            ) : (
              <>
                {" "}
                입니다. 뜻밖에도 <strong>개별 축보다 안정적입니다</strong> —
                평균을 내면 각 축의 잡음이 서로 상쇄되기 때문입니다.
              </>
            )}{" "}
            <span className="text-ink-muted">
              세 축이 다 있는 <span className="tabular">{c.values.length}</span>
              명만 셉니다.
            </span>
          </p>
        </Note>
      </div>
    </div>
  );
}
