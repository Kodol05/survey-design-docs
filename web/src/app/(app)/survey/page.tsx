import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
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
  searchParams: Promise<{ section?: string; start?: string; rest?: string }>;
}) {
  const me = await requireUser();
  const session = await getOrCreateSession(me.id);

  const { section: raw, start, rest } = await props.searchParams;
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

  /*
    묶음을 넘길 때 **한 번 쉬어 간다** (2026-08-25).

    114문항이 끊김 없이 이어지면 끝이 안 보인다. 묶음이 끝날 때마다
    「몇 개 끝났고 몇 개 남았다」를 한 번 보여주면 17분이 덜 길게 느껴진다.
    누르면 다음 묶음이니 손이 한 번 더 가지만, 그 대신 **지금 어디쯤인지**를
    안다.
  */
  if (rest === "1" && section > 1 && section <= SECTION_COUNT)
    return <Breather section={section} />;

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
        <ButtonLink href="/survey?start=1" size="lg">
          검사 시작하기
        </ButtonLink>
      </p>

      <p className="text-axis text-ink-muted mt-16 border-t border-[--border] pt-6">
        2주 넘게 이어서 하지 않으면 처음부터 다시 하시게 됩니다. 오래 전 답과
        지금 답이 한 결과로 섞이지 않게 하기 위해서입니다.
      </p>
    </main>
  );
}

/**
 * 묶음 사이 쉬어 가는 자리.
 *
 * **진행률만으로는 부족하다.** 위에 막대가 있지만 문항을 답하는 동안에는
 * 눈이 문항에만 간다. 묶음이 끝나는 순간이 유일하게 고개를 드는 때다.
 */
function Breather({ section }: { section: number }) {
  const done = section - 1;
  const left = SECTION_COUNT - done;

  return (
    <main className="reading-column flex flex-1 flex-col justify-center py-24 text-center">
      <p className="text-axis text-ink-muted mb-3">
        {SECTION_COUNT}개 묶음 중 {done}개 끝났습니다
      </p>

      <h1 className="text-screen-title mb-10">
        {left === 1 ? "마지막 묶음이 남았습니다" : `${left}개 남았습니다`}
      </h1>

      {/* 묶음 하나가 칸 하나. 진행률 막대보다 「몇 개」가 눈에 잡힌다 */}
      <ul className="mb-12 flex justify-center gap-2" aria-hidden>
        {Array.from({ length: SECTION_COUNT }, (_, i) => (
          <li
            key={i}
            className="h-2.5 w-10 rounded-full"
            style={{ background: i < done ? "var(--series-1)" : "var(--grid)" }}
          />
        ))}
      </ul>

      <p>
        <ButtonLink href={`/survey?section=${section}`} size="lg">
          이어서 하기
        </ButtonLink>
      </p>

      <p className="text-axis text-ink-muted mt-10">
        여기서 나가셔도 됩니다. 다음에 들어오면 이 자리부터 이어서 합니다.
      </p>
    </main>
  );
}
