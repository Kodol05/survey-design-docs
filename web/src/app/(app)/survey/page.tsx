import { redirect } from "next/navigation";
import { SectionForm } from "@/components/survey/SectionForm";
import { SectionProgress } from "@/components/survey/SectionProgress";
import { requireUser } from "@/lib/auth/guard";
import {
  SECTION_COUNT,
  firstUnansweredSection,
  getOrCreateSession,
  getSection,
} from "@/lib/survey/session";

export const metadata = { title: "응시 — 7차원 성향 설문" };

export default async function SurveyPage(props: {
  searchParams: Promise<{ section?: string; rest?: string }>;
}) {
  const me = await requireUser();
  const session = await getOrCreateSession(me.id);

  const { section: raw, rest } = await props.searchParams;
  const asked = Number(raw);
  const resume = (await firstUnansweredSection(session.id)) ?? SECTION_COUNT;
  const section =
    Number.isInteger(asked) && asked >= 1 && asked <= SECTION_COUNT ? asked : resume;

  /*
    ⚠️ **중간에 화면을 끊지 않는다** (2026-08-25 사용자 결정).

    한때 두 자리에 안내 화면을 뒀다 — 시작 전 「이런 검사입니다」와 묶음 사이
    「몇 개 남았습니다」. 둘 다 뺐다.

    앞엣것은 **아직 시작도 안 한 사람에게 읽을 것을 먼저 들이미는 꼴**이었고,
    뒤엣것은 **답하던 흐름을 끊고 버튼을 한 번 더 누르게** 했다. 남은 묶음
    수는 그대로 알리되, 다음 묶음 위에 잠깐 떴다 사라지는 쪽으로 옮겼다
    (`SectionProgress`).
  */
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

      {/*
        묶음을 넘겨 왔으면 남은 개수를 **잠깐만** 알린다. 자리는 늘 차지하고
        있어서 사라질 때 아래 문항이 밀리지 않는다.
      */}
      <div className="mt-8 mb-4 h-8">
        {rest === "1" && section > 1 && (
          <SectionProgress
            key={section}
            section={section}
            sectionCount={SECTION_COUNT}
          />
        )}
      </div>

      <p className="text-ink-secondary mb-12 text-center text-xl">
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
