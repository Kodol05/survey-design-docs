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
  searchParams: Promise<{ section?: string }>;
}) {
  const me = await requireUser();
  const session = await getOrCreateSession(me.id);

  const { section: raw } = await props.searchParams;
  const asked = Number(raw);
  const resume = (await firstUnansweredSection(session.id)) ?? SECTION_COUNT;
  const section =
    Number.isInteger(asked) && asked >= 1 && asked <= SECTION_COUNT ? asked : resume;

  const { items, answers } = await getSection(session.id, section);
  if (!items.length) redirect("/me");

  const pct = Math.round(((section - 1) / SECTION_COUNT) * 100);

  return (
    <main className="mx-auto w-full max-w-[80rem] px-6">
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

      <p className="text-ink-secondary my-12 text-center text-lg">
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
