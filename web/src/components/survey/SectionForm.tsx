"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LikertScale } from "./LikertScale";
import { saveSectionAction, submitAction } from "@/lib/survey/actions";
import type { PublicItem } from "@/lib/survey/session";
import { smoothScrollIntoView } from "@/lib/smoothScroll";

/** 빠뜨린 문항 카드의 그림자 — 테두리 없이 붉은 기운만 번진다 */
const MISSED_SHADOW =
  "0 0 14px color-mix(in oklab, var(--status-critical) 22%, transparent), 0 8px 26px color-mix(in oklab, var(--status-critical) 22%, transparent)";

/**
 * 섹션 응시 화면 — 01 §2.5~2.7, 11 §5.1
 *
 * - 답할 차례 문항만 진하게, 나머지는 흐리게 (포커스/디밍)
 * - 답하면 **다음 문항이 화면 가운데로 올라온다.** 스크롤을 직접 하지 않아도 된다
 * - 문항이 화면에 뜬 시각부터 응답까지의 시간과 고친 횟수를 기록한다 (01 §2.7)
 * - 섹션을 나갈 때 미응답을 검사한다. 120문항 다 훑고 나서 찾으러 돌아가면 안 된다
 */
export function SectionForm({
  sessionId,
  section,
  sectionCount,
  items,
  initialAnswers,
  savedElsewhere,
  totalItems,
}: {
  sessionId: string;
  section: number;
  sectionCount: number;
  items: PublicItem[];
  initialAnswers: Record<string, number>;
  /** 다른 묶음에 저장된 답 수. 지금 묶음은 빠져 있다 */
  savedElsewhere: number;
  /** 설문 전체 문항 수 */
  totalItems: number;
}) {
  const [answers, setAnswers] =
    useState<Record<string, number>>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  /** 「다음 설문」을 눌렀을 때 빈 문항이 있었나 — 있었으면 그 카드들을 붉은 그림자로 띄운다 */
  const [flagMissing, setFlagMissing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  // 응답시간·수정횟수는 품질 지표의 원자료다. 응시자에게는 알리지 않는다.
  /*
    한 문항의 응답시간은 **바로 앞 답을 고른 때부터** 잰다 (2026-09-30).
    전에는 화면이 열린 때부터 재서 뒤 문항일수록 시간이 쌓였고, 빨리 찍어도
    「너무 빠름」에 안 걸렸다.
  */
  const lastPickAt = useRef<number | null>(null);
  const meta = useRef<
    Record<string, { elapsedMs: number; changedCount: number }>
  >({});
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    lastPickAt.current = Date.now();
  }, []);

  /** 「다음 설문」 버튼 자리 — 묶음을 처음 다 채웠을 때 여기로 내려간다 */
  const nextArea = useRef<HTMLDivElement>(null);
  /** 이 묶음을 이미 한 번 다 채웠나. 이미 다 채운 채로 열었으면 처음부터 참 */
  const completedOnce = useRef(
    items.every((i) => initialAnswers[i.id] !== undefined),
  );

  const answered = items.filter((i) => answers[i.id] !== undefined).length;

  /*
    막대는 **문항 단위**로 움직인다 (2026-08-26 사용자 요청).

    전에는 묶음 단위였다. 일곱 묶음이라 한 번 움직이는 데 열일곱 문항이
    걸리고, 그동안 막대는 꼼짝도 안 한다. **답을 열 개 골라도 화면이
    「아무 일도 없었다」고 말하는 셈**이었다.

    지금 고르는 중인 것은 아직 서버에 없으므로, 다른 묶음의 저장분에
    이 화면이 세는 수를 더한다.
  */
  const doneAll = savedElsewhere + answered;
  const pct = totalItems ? Math.round((doneAll / totalItems) * 100) : 0;
  const firstUnanswered = items.find((i) => answers[i.id] === undefined)?.id;

  /*
    문항 카드를 **화면 위에서 두 번째 자리**로 옮긴다 (2026-10-30 사용자 요청).
    전에는 화면 가운데에 세웠는데, 눈높이보다 아래라 시선이 내려가 있었다.
    바로 앞 카드를 화면 맨 위에 붙이면 이 카드가 그 아래, 두 번째에 온다.
    첫 문항은 앞 카드가 없으니 자기를 맨 위에 붙인다.

    움직임은 직접 그린다. 브라우저의 smooth 스크롤은 윈도우 「애니메이션
    끄기」에서 순간이동이 되어 문항이 툭 바뀌어 보였다.
  */
  const scrollToCard = useCallback(
    (itemId: string) => {
      const at = items.findIndex((i) => i.id === itemId);
      const before = at > 0 ? nodes.current[items[at - 1].id] : null;
      const anchor = before ?? nodes.current[itemId];
      if (anchor) smoothScrollIntoView(anchor, "start");
    },
    [items],
  );

  const pick = useCallback(
    (itemId: string, value: number) => {
      const now = Date.now();
      const prev = meta.current[itemId];
      meta.current[itemId] = prev
        ? { elapsedMs: prev.elapsedMs, changedCount: prev.changedCount + 1 }
        : {
            elapsedMs: Math.max(0, now - (lastPickAt.current ?? now)),
            changedCount: 0,
          };
      lastPickAt.current = now;

      setAnswers((a) => {
        const next = { ...a, [itemId]: value };
        /*
          **처음 답할 때만** 다음 빈 문항으로 내려간다 (2026-10-30 사용자 요청).
          이미 답한 문항을 고치러 올라왔는데 고르자마자 아래로 끌려가면
          안 된다 — 움직임은 손으로 내리는 수고를 덜어 줄 뿐, 화면을 붙잡아
          두려는 것이 아니다.

          다음 빈 문항은 **지금 문항 뒤에서** 찾는다. 앞쪽에 빈 문항이 남아
          있어도 거꾸로 끌어올리지 않는다(그것은 「다음 설문」이 알려 준다).
        */
        if (a[itemId] === undefined) {
          /*
            이 답으로 **묶음을 처음 다 채웠으면** 「다음 설문」 버튼 쪽으로
            살짝 내려간다 (2026-10-30 사용자 요청). 버튼도 이때 색이 바뀐다.
            순서와 상관없다 — 2~17번을 먼저 하고 1번을 마지막에 해도 같다.
            **딱 한 번만.** 다 채운 뒤에 3번을 고쳐도 아무 데로도 가지 않는다.
          */
          if (items.every((i) => next[i.id] !== undefined)) {
            if (!completedOnce.current) {
              completedOnce.current = true;
              setTimeout(() => {
                if (nextArea.current) smoothScrollIntoView(nextArea.current, "center");
              }, 150);
            }
          } else {
            const at = items.findIndex((i) => i.id === itemId);
            const following = items
              .slice(at + 1)
              .find((i) => next[i.id] === undefined);
            if (following) setTimeout(() => scrollToCard(following.id), 120);
          }
        }
        return next;
      });
      setError(null);
    },
    [items, scrollToCard],
  );

  const missing = items.filter((i) => answers[i.id] === undefined);
  const isLast = section === sectionCount;

  /*
    **위로 지나쳐 버린 빈 문항** (2026-10-30 사용자 요청).

    건너뛴 문항이 화면 위로 올라가 버리면 눈에 안 보인다. 그런 것이 있으면
    화면 맨 위에 「ㅡ^ㅡ」 표시와 「N개 놓친 문항이 있습니다」를 옅게 띄우고,
    누르면 그 문항으로 미끄러져 올라간다.

    「놓친」 문항은 답한 문항 중 가장 뒤의 것보다 **앞에 있는** 빈 문항이다
    — 아직 차례가 안 온 뒤쪽 문항까지 세면 늘 떠 있게 된다. 「다음 설문」을
    눌러 빈 문항을 알린 뒤에는 빈 문항 모두가 대상이다. 그중 화면 위로
    벗어난 것만 센다.
  */
  const [above, setAbove] = useState<string[]>([]);
  useEffect(() => {
    const lastAnswered = items.findLastIndex((i) => answers[i.id] !== undefined);
    const candidates = items.filter(
      (it, idx) =>
        answers[it.id] === undefined && (flagMissing || idx < lastAnswered),
    );
    const update = () => {
      const ids = candidates
        .filter((it) => {
          const el = nodes.current[it.id];
          return el ? el.getBoundingClientRect().bottom < 40 : false;
        })
        .map((it) => it.id);
      setAbove((prev) =>
        prev.length === ids.length && prev.every((id, k) => id === ids[k])
          ? prev
          : ids,
      );
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items, answers, flagMissing]);

  function next() {
    if (missing.length) {
      setError(`${missing.length}개 문항이 비어 있습니다`);
      setFlagMissing(true);
      scrollToCard(missing[0].id);
      return;
    }
    start(async () => {
      const drafts = items.map((i) => ({
        itemId: i.id,
        value: answers[i.id],
        // 이 화면에서 새로 고르지 않은 답(이미 저장된 것)은 비워 보낸다
        elapsedMs: meta.current[i.id]?.elapsedMs,
        changedCount: meta.current[i.id]?.changedCount,
      }));
      /*
        저장이 실패하면 **여기서 멈추고 알린다.**

        전에는 `r.nextSection`만 보고 넘어갔다. 저장이 실패해도 그 값이
        없으니 곧장 제출로 갔고, 제출도 실패하면 아무 표시 없이 끝났다.
        답한 내용은 화면에 그대로 있으니 다시 누르면 된다.
      */
      const r = await saveSectionAction(sessionId, section, drafts);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      if (r.nextSection) {
        // `rest=1`이면 묶음 사이 쉬어 가는 화면을 한 번 거친다
        // 화면 쪽은 `key={section}` 으로 묶음마다 새로 마운트되므로 상태가 섞이지 않는다
        router.push(`/survey?section=${r.nextSection}&rest=1`);
        return;
      }
      const s = await submitAction(sessionId);
      if (s && "error" in s) setError(s.error);
    });
  }

  return (
    <div className="flex flex-col gap-5 pt-8">
      {/*
        위로 지나친 빈 문항 알림 — 화면 맨 위 가운데에 옅게. 없으면 사라진다.
        누르면 그중 가장 앞의 문항으로 간다(위에서 두 번째 자리).
      */}
      <button
        type="button"
        onClick={() => above[0] && scrollToCard(above[0])}
        aria-hidden={!above.length}
        tabIndex={above.length ? 0 : -1}
        className="group fixed top-0 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-b-xl px-6 pt-1.5 pb-2 backdrop-blur transition-opacity duration-300"
        style={{
          background: "color-mix(in oklab, var(--page) 85%, transparent)",
          opacity: above.length ? 1 : 0,
          pointerEvents: above.length ? "auto" : "none",
        }}
      >
        <svg
          viewBox="0 0 160 12"
          className="h-3 w-40 transition-transform duration-200 group-hover:-translate-y-0.5"
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2 10 H70 L80 2 L90 10 H158" />
        </svg>
        <span className="text-ink-secondary text-sm">
          {above.length}개 놓친 문항이 있습니다
        </span>
      </button>
      {/*
        진행 상황을 **읽어주는 표시**로도 남긴다 (2026-08-25).

        아래 「12 / 24」는 눈으로만 읽힌다. 화면 낭독기를 쓰는 사람에게는
        지금 어디쯤인지 알 방법이 없었다. `aria-live`로 두면 답할 때마다
        조용히 읽어준다.
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {sectionCount}개 묶음 중 {section}번째, {items.length}문항 중 {answered}
        문항 답했습니다.
      </p>

      {/* 문항 카드들과 진행 막대를 한 상자에 — 막대가 이 상자 안에서만 따라온다 */}
      <div className="flex flex-col gap-5">
        {items.map((item, idx) => {
          const done = answers[item.id] !== undefined;
          const current = item.id === firstUnanswered;
          const missed = flagMissing && !done;
          return (
            <div
              key={item.id}
              ref={(el) => {
                nodes.current[item.id] = el;
              }}
              /*
                문항은 선 없이 카드로 나눈다 (2026-10-30 사용자 요청, 법무법인 정안
                시안처럼). 카드 바탕은 화면 바탕과 같고 테두리도 없으며, **평소에는
                그림자도 없다** — 강조할 카드에만 그림자가 생긴다.

                  지금 답할 문항   한 단 깊은 그림자로 살짝 떠 보이게
                  빠뜨린 문항      「다음 설문」을 눌렀을 때 비어 있던 카드들에 붉은
                                   그림자. 여러 장이 한꺼번에 뜰 수 있고, 지금 답할
                                   문항과 겹치면 두 그림자를 같이 준다

                답을 고르면 그 카드의 그림자는 곧바로 사라진다.
              */
              className="scroll-mt-4 rounded-2xl px-8 py-10 transition-[box-shadow,background-color] duration-300"
              style={{
                // 강조된 카드는 바탕도 아주 옅은 아이보리로 (2026-10-30 사용자 요청)
                background: current || missed ? "var(--survey-focus)" : "var(--page)",
                boxShadow:
                  [current && "var(--card-shadow-hover)", missed && MISSED_SHADOW]
                    .filter(Boolean)
                    .join(", ") || "none",
              }}
            >
              {/* 답한 문항인지 아직인지도 읽어준다. 화면에서는 흐리기로 표시한다 */}
              <span className="sr-only">
                {items.length}문항 중 {idx + 1}번째
                {done ? ", 답함" : ", 아직 답하지 않음"}
              </span>
              {/* 글자만 읽기 폭으로 제한한다. 한 줄 40~50자를 넘기면 다음 줄
                  첫 글자를 찾느라 눈이 헤맨다 (01 §2.3). 아래 척도 줄은 글이
                  아니므로 이 제한을 받지 않는다. */}
              <p
                id={`q-${item.id}`}
                /*
                  **지금 답할 문항을 더 분명히 한다** (2026-08-25).

                  전에는 굵기가 500↔600으로 한 단만 차이 나고 흐림도 45%라
                  「어디를 답할 차례인지」가 잘 안 잡혔다. 굵기 차이를 벌리고,
                  아직 안 온 문항은 더 흐리게, 이미 답한 문항은 중간쯤 둔다 —
                  답한 것과 아직인 것도 서로 구분되어야 한다.
                */
                className="mx-auto mb-7 max-w-[40rem] text-center transition-opacity duration-200"
                style={{
                  // 2026-10-30 두 번 줄임 (사용자 요청 — 응시 영역이 너무 컸다)
                  fontSize: "clamp(0.95rem, 0.75rem + 0.6vw, 1.4rem)",
                  lineHeight: 1.45,
                  fontWeight: current || missed ? 700 : 500,
                  /*
                    글자는 **검정(본문 잉크)** 으로 (2026-10-30 사용자 요청 — 회색으로
                    보였다). 이미 답한 문항은 흐리지 않고, 아직 차례가 안 온 문항만
                    옅게 둔다. 빠뜨린 문항은 찾아서 답해야 하므로 흐리지 않는다.
                  */
                  opacity: current || missed || done ? 1 : 0.4,
                  color: "var(--ink)",
                }}
              >
                <span className="text-ink-muted tabular mr-3 text-[0.6em] font-normal">
                  {idx + 1}
                </span>
                {item.content}
              </p>
              <LikertScale
                name={item.id}
                value={answers[item.id]}
                onChange={(v) => pick(item.id, v)}
                dimmed={!done && !current && !missed}
                labelledBy={`q-${item.id}`}
              />
            </div>
          );
        })}

        {/*
          진행률 — 바 + "N / 7 묶음". 퍼센트 숫자와 타이머는 두지 않는다 (01 §2.5).

          **작게, 가운데에, 둘을 한 줄로** (2026-09-18 사용자 요청). 전에는 왼쪽에
          「7차원 성향 설문」 제목, 오른쪽에 묶음 수, 아래에 화면 폭 가득한 바였다.
          제목은 위 머리에 이미 있으니 「설문 진행도」로 바꾸고, 바는 폭을 2/3 로
          줄여 한눈에 들어오게 한다.

          **화면 맨 아래에 붙인다** (2026-10-30 사용자 요청). 위에 있으면 문항보다
          먼저 눈에 걸린다. 맨 끝에 두고 `sticky bottom-0`으로 묶어서, 내리는
          동안은 화면 아래에 붙어 있다가 맨 끝에서 제자리에 선다.

          「설문 진행도」 글자는 뺀다 (2026-10-30 사용자 요청 — 막대만 봐도
          안다). 화면 낭독기용 제목으로만 남기고, 「N / 7 묶음」은 막대 **아래**
          빈자리에 작게 둔다.

          **문항 영역 끝까지만 따라 내려온다** (2026-10-30 사용자 요청). 문항
          카드들과 한 상자에 넣어 두었으므로, 마지막 문항을 지나면 그 자리에
          멈추고 아래의 선과 「다음 설문」 버튼 위로는 넘어가지 않는다.
        */}
        <div className="bg-page/95 sticky bottom-0 z-10 -mx-6 px-6 pt-4 pb-2 backdrop-blur">
          <div className="mx-auto w-full max-w-[42rem]">
            <h1 className="sr-only">설문 진행도</h1>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: "var(--grid)" }}
              role="progressbar"
              aria-valuenow={doneAll}
              aria-valuemin={0}
              aria-valuemax={totalItems}
              aria-label={`전체 ${totalItems}문항 중 ${doneAll}문항 답함`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, background: "var(--series-1)" }}
              />
            </div>
            <p className="text-ink-muted tabular mt-1.5 text-center text-sm">
              {section} / {sectionCount} 묶음
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 text-center"
          style={{ color: "var(--status-critical)" }}
        >
          {error}
        </p>
      )}

      {/*
        버튼 위에만 아주 얇은 선 하나 (2026-10-30 사용자 요청) — 문항 카드들과
        「다음으로 넘어가기」를 가른다. 「N / N」은 버튼 아래에 아주 작게.
      */}
      <div
        ref={nextArea}
        className="mt-6 flex flex-col items-center gap-2 border-t border-(--border)/70 pt-10 pb-24"
      >
        {/*
          이 화면의 유일한 동작. 좌우로 덜 길고 위아래로 두툼하게 (2026-10-30
          사용자 요청 — 진한 남색 띠 같았다).

          **두 가지 모습** (2026-10-30 사용자 요청):
            덜 채웠을 때   아주 연한 파랑 바탕에 옅은 파란 글자 — 아직 아니라는 느낌.
                           그래도 누를 수는 있다(빠뜨린 문항을 붉게 알려 준다)
            다 채웠을 때   또렷한 파랑 바탕에 흰 글자로 바뀐다 — 이제 넘어가면 된다
        */}
        <button
          type="button"
          onClick={next}
          disabled={pending}
          className="h-16 min-w-60 rounded-xl px-10 text-[1.375rem] font-semibold transition-[background-color,color,filter] duration-500 hover:brightness-95 disabled:opacity-60"
          style={
            missing.length
              ? {
                  background: "color-mix(in oklab, var(--series-1) 12%, var(--page))",
                  color: "color-mix(in oklab, var(--series-1) 65%, var(--page))",
                }
              : {
                  background: "color-mix(in oklab, var(--series-1) 80%, var(--page))",
                  color: "var(--page)",
                }
          }
        >
          {pending ? "저장 중…" : isLast ? "제출하고 결과 보기" : "다음 설문"}
        </button>
        <p className="text-ink-muted tabular text-[0.8125rem]" aria-hidden>
          {answered} / {items.length}
        </p>
      </div>

    </div>
  );
}
