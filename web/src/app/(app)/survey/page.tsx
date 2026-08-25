import { redirect } from "next/navigation";
import { SectionForm } from "@/components/survey/SectionForm";
import { SectionProgress } from "@/components/survey/SectionProgress";
import { requireUser } from "@/lib/auth/guard";
import {
  SECTION_COUNT,
  firstUnansweredSection,
  getOrCreateSession,
  getSection,
  sessionProgress,
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
    Number.isInteger(asked) && asked >= 1 && asked <= SECTION_COUNT
      ? asked
      : resume;

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

  /*
    막대는 **문항 단위로** 움직인다 (2026-08-26 사용자 요청). 그래서 답 상태를
    쥐고 있는 `SectionForm`이 머리말째로 그린다 — 서버에서 그리면 묶음을
    넘길 때만 움직인다.

    지금 묶음에 저장된 답은 빼고 넘긴다. 화면이 자기 상태로 다시 세서
    더하므로, 안 빼면 두 번 세게 된다.
  */
  const { saved, total } = await sessionProgress(session.id);
  const savedElsewhere = saved - Object.keys(answers).length;

  return (
    <main className="mx-auto w-full max-w-[92rem] px-6">
      {/*
        묶음을 넘겨 왔으면 남은 개수를 **화면 가운데 잠깐** 띄운다.
        화면 위에 떠 있는 것이라 이 자리가 본문 흐름을 밀지 않는다.
      */}
      {rest === "1" && section > 1 && (
        <SectionProgress
          key={section}
          section={section}
          sectionCount={SECTION_COUNT}
        />
      )}

      <SectionForm
        key={section}
        sessionId={session.id}
        section={section}
        sectionCount={SECTION_COUNT}
        items={items}
        initialAnswers={answers}
        savedElsewhere={savedElsewhere}
        totalItems={total}
      />
    </main>
  );
}
