import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionForm } from "@/components/survey/SectionForm";
import { requireUser } from "@/lib/auth/guard";
import {
  SECTION_COUNT,
  firstUnansweredSection,
  getOrCreateSession,
  getSection,
} from "@/lib/survey/session";

export const metadata = { title: "응시 — 7차원 성향 설문" };

export default async function SurveyPage(props: {
  searchParams: Promise<{ section?: string; start?: string }>;
}) {
  const me = await requireUser();
  const session = await getOrCreateSession(me.id);

  const { section: raw, start } = await props.searchParams;
  const asked = Number(raw);
  const resume = (await firstUnansweredSection(session.id)) ?? SECTION_COUNT;
  const section =
    Number.isInteger(asked) && asked >= 1 && asked <= SECTION_COUNT ? asked : resume;

  /*
    아직 한 문항도 답하지 않았고 「시작」을 누르지도 않았으면 **안내 화면**을
    먼저 보여준다 (01 §2.9).

    전에는 로그인하자마자 1번 문항이 튀어나왔다. 얼마나 걸리는지, 중간에
    나가도 되는지 모른 채로 시작하게 된다. 이어서 하는 사람에게는 안 보인다 —
    이미 아는 내용을 매번 다시 읽힐 이유가 없다.
  */
  const fresh = (await firstUnansweredSection(session.id)) === 1;
  if (fresh && start !== "1") return <StartNotice />;

  const { items, answers } = await getSection(session.id, section);
  if (!items.length) redirect("/me");

  const pct = Math.round(((section - 1) / SECTION_COUNT) * 100);

  return (
    <main className="mx-auto w-full max-w-[92rem] px-6">
      {/* 진행률 — 바 + "묶음 N / 7". 퍼센트 숫자와 타이머는 두지 않는다 (01 §2.5) */}
      <div className="sticky top-0 z-10 -mx-6 bg-page/95 px-6 pt-4 pb-4 backdrop-blur">
        <div className="mb-2 flex items-baseline justify-between">
          <h1 className="text-section-title">7차원 성향 설문</h1>
          <span className="text-axis text-ink-secondary tabular">
            묶음 {section} / {SECTION_COUNT}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--grid)" }}
          role="progressbar"
          aria-valuenow={section}
          aria-valuemin={1}
          aria-valuemax={SECTION_COUNT}
          aria-label={`전체 ${SECTION_COUNT}묶음 중 ${section}번째`}
        >
          <div
            className="h-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: "var(--series-1)" }}
          />
        </div>
      </div>

      <p className="text-ink-secondary my-12 text-center text-xl">
        정답이 없습니다. 오래 고민하지 마시고 평소 모습에 가까운 쪽을 골라 주세요.
      </p>

      <SectionForm
        key={section}
        sessionId={session.id}
        section={section}
        sectionCount={SECTION_COUNT}
        items={items}
        initialAnswers={answers}
      />
    </main>
  );
}

/**
 * 응시 시작 안내.
 *
 * ⚠️ **분량을 늘리지 않는다 (01 §2.9).** 「인사평가에 쓰지 않습니다」,
 *    「관리자가 조회할 수 있습니다」 같은 문구는 넣지 않는다 — 굳이 꺼내면
 *    반감만 산다는 것이 그때의 결정이었고, 열람 범위는 가입 화면의
 *    개인정보 고지에 이미 한 줄로 들어 있다 (D-14).
 */
function StartNotice() {
  return (
    <main className="reading-column flex flex-1 flex-col justify-center py-20">
      <h1 className="text-screen-title mb-8">시작하기 전에</h1>

      <ul className="text-item mb-10 flex flex-col gap-3">
        <li className="flex gap-3">
          <span aria-hidden className="text-ink-muted">·</span>
          <span>약 17분 · 114문항 · 일곱 묶음으로 나뉘어 있습니다</span>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="text-ink-muted">·</span>
          <span>
            <strong>중간에 그만두어도 됩니다.</strong> 묶음을 넘길 때마다 저장되고
            다음에 들어오면 멈춘 자리부터 이어서 합니다
          </span>
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="text-ink-muted">·</span>
          <span>정답과 오답이 없습니다. 오래 고민하지 마시고 평소 모습에 가까운 쪽을 고르시면 됩니다</span>
        </li>
      </ul>

      <p>
        <Link
          href="/survey?start=1"
          className="text-item inline-flex h-14 items-center rounded-lg px-8 font-medium"
          style={{ background: "var(--series-1)", color: "#fff" }}
        >
          검사 시작하기
        </Link>
      </p>

      <p className="text-axis text-ink-muted mt-16 border-t border-[--border] pt-6">
        2주 넘게 이어서 하지 않으면 처음부터 다시 하시게 됩니다. 오래 전 답과
        지금 답이 한 결과로 섞이지 않게 하기 위해서입니다.
      </p>
    </main>
  );
}
