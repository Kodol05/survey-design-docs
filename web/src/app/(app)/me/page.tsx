import { ResultBook } from "@/components/charts/ResultBook";
import {
  RESULT_PAGE_KEYS,
  buildResultBook,
  initialPageOf,
} from "@/components/result/resultPages";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import {
  completedResults,
  inProgress,
  latestResult,
} from "@/lib/survey/result";

export const metadata = { title: "내 결과 — 7차원 성향 설문" };

/**
 * 개인 결과지 (2026-09-18 다시 짬, 같은 날 사용자 피드백으로 한 번 더).
 *
 * 위 머리와 같은 폭의 종이(`ResultBook`)에 세 장(결과 요약 · 척도별 결과 ·
 * 종합)이 실린다. **장의 내용은 여기서 만들지 않는다** — 관리자 구성원
 * 상세도 같은 장을 보여야 해서 `components/result/resultPages`로 옮겼다
 * (2026-10-07 사용자 결정). 결과지를 다시 짤 때는 그쪽을 고친다. 여기는
 * 누구의 어느 결과를 펼지, 응시 전·중 안내, 지난 결과 목록만 맡는다.
 *
 * 직무능력과 사내 위치는 개인 화면에 두지 않는다 (00 D-35 · D-09).
 */
export default async function MePage(props: {
  searchParams: Promise<{ p?: string; r?: string }>;
}) {
  const me = await requireUser();
  const { p, r } = await props.searchParams;
  const [result, history] = await Promise.all([
    latestResult(me.id, r),
    completedResults(me.id),
  ]);
  /** 지금 보고 있는 것이 가장 최근 결과가 아니면 주소에 남긴다 */
  const viewing = result && result.sessionId !== history[0]?.id ? result.sessionId : null;
  const qs = (page: number) => `?${viewing ? `r=${viewing}&` : ""}p=${page}`;

  if (!result) {
    /*
      ⚠️ **하다 만 사람에게 「시작하지 않았다」고 하면 안 된다** (2026-08-26).
      `latestResult`는 끝낸 것만 찾는다. 답이 날아간 줄 알지 않게 사실대로 말한다.
    */
    const doing = await inProgress(me.id);
    return (
      <main className="page-column py-20">
        <h1 className="text-screen-title mb-6">내 결과</h1>
        {doing ? (
          <>
            <EmptyState
              message={`아직 응시 중입니다 — ${doing.total}문항 중 ${doing.answered}문항 답하셨습니다.`}
            />
            <p className="text-ink-muted text-axis mb-8 text-center">
              답하신 것은 그대로 저장돼 있습니다. 끝내시면 여기에 결과가
              나옵니다.
            </p>
          </>
        ) : (
          <EmptyState message="아직 응시하지 않으셨습니다." />
        )}
        <div className="flex justify-center">
          <ButtonLink href="/survey" size="lg">
            {doing ? "이어서 하기" : "설문 시작하기"}
          </ButtonLink>
        </div>
      </main>
    );
  }

  const { pages, action } = buildResultBook(
    { name: me.name, result },
    {
      pageHref: (key) => qs(RESULT_PAGE_KEYS.indexOf(key) + 1),
      retake: true,
    },
  );

  /*
    처음 펼 장은 서버가 `?p=` 를 읽어 정한다 — 새로고침·공유 링크에도 그 장이
    바로 그려진다. `key` 로 `?p=` 만 바뀌는 이동에도 장이 새로 잡히게 한다.
  */
  const initialPage = initialPageOf(p, pages.length);

  return (
    // 좁은 화면에선 아래 넘김 줄이 떠 있으므로 바닥 여백을 넉넉히 둔다
    <main className="page-column py-8 pb-24 lg:py-10 lg:pb-12">
      {viewing && (
        <p className="text-axis mb-4 rounded-lg px-4 py-3" style={{ background: "var(--wash)" }}>
          지난 결과를 보고 계십니다.{" "}
          <a href="/me" className="underline underline-offset-2">
            가장 최근 결과로
          </a>
        </p>
      )}
      <ResultBook
        key={`${viewing ?? "latest"}-${initialPage}`}
        pages={pages}
        initial={initialPage}
        action={action}
      />
      {history.length > 1 && (
        <nav aria-label="지난 결과" className="text-axis mt-10">
          <p className="eyebrow mb-2">지난 결과</p>
          <ul className="flex flex-wrap gap-2">
            {history.map((h, i) => {
              const current = h.id === result.sessionId;
              const label = `${h.completedAt?.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}${i === 0 ? " (최근)" : ""}`;
              return (
                <li key={h.id}>
                  {current ? (
                    <span
                      aria-current="page"
                      className="inline-flex h-9 items-center rounded-lg border border-(--ink) px-3 font-medium tabular"
                    >
                      {label}
                    </span>
                  ) : (
                    <a
                      href={i === 0 ? "/me" : `?r=${h.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-(--border) px-3 tabular hover:bg-(--wash)"
                    >
                      {label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </main>
  );
}

