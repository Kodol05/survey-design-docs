import { WarningBadge } from "@/components/ui/WarningBadge";
import { Note } from "@/components/ui/Note";
import type { loadRatingCompare } from "@/lib/admin/ratingCompare";
import { AgreementPanel } from "./AgreementPanel";

// ── 평가 대조 ──────────────────────────────────────────────────────

/**
 * 본인 답 ↔ 대표님 평가 (Task 31).
 *
 * **이 시스템에서 유일하게 「실제와 맞나」에 답하는 화면이다.** 나머지는
 * 전부 설문 안에서 앞뒤가 맞는지를 본다 — 성향도 직무능력도 같은 사람이
 * 이어서 답하므로, 잘 맞는다고 실제와 맞는 것은 아니다.
 */
export function AgreementTab({ data }: { data: Awaited<ReturnType<typeof loadRatingCompare>> }) {
  return (
    <section>
      {/*
        **제목만 위에 두고 설명은 그림 아래로** (2026-08-25 사용자 요청).
        설명 두 줄을 지나야 그림이 나오면, 화면을 열 때마다 같은 문장을
        다시 읽게 된다. 그림이 먼저 보이고 궁금할 때 아래를 본다.
      */}
      <h2 className="text-section-title mb-6">본인 답과 관리자가 보는 것</h2>

      {data.axes.length === 0 ? (
        <>
          <WarningBadge kind="smallSample" />
          <p className="text-ink-secondary mt-4">
            두 값이 다 있는 사람이 아직 없습니다. 관리자 평가를 먼저 매겨야 합니다.
          </p>
        </>
      ) : (
        <AgreementPanel data={data} />
      )}

      <Note label="이 화면이 무엇을 보여주는지" className="mt-8">
        <p>
          같은 사람의 직무능력을 <strong>본인이 답한 값</strong>과{" "}
          <strong>관리자가 매긴 값</strong>으로 나란히 놓았습니다.
        </p>
      </Note>

      <Note label="이 화면을 어떻게 읽는지" className="mt-3">
        <p className="mb-2">
          <strong>「누가 맞았나」를 보는 화면이 아닙니다.</strong>{" "}
          <strong>둘이 갈리는 사람이 이야깃거리</strong>라는 뜻입니다 — 본인은
          협력을 높게 보는데 관리자는 낮게 본다면, 그 사이에 무슨 일이 있는지가
          볼 것입니다. 자기보고는 좋게 보이려는 쪽으로, 상사 평가는 최근 일이나
          눈에 띄는 장면 쪽으로 기웁니다.
        </p>
        <p>
          그래도 이 화면이 중요한 이유는, 다른 모든 화면이{" "}
          <strong>설문 안에서 앞뒤가 맞는지</strong>만 보기 때문입니다. 성향도
          직무능력도 같은 사람이 이어서 답하니 잘 맞는 것이 당연합니다. 여기만{" "}
          <strong>바깥에서 온 눈</strong>과 맞댑니다.
        </p>
      </Note>
    </section>
  );
}
