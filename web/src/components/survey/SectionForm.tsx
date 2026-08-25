"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Button } from "../ui/Button";
import { LikertScale } from "./LikertScale";
import { saveSectionAction, submitAction } from "@/lib/survey/actions";
import type { PublicItem } from "@/lib/survey/session";

/**
 * 섹션 응시 화면 — 01 §2.5~2.7, 11 §5.1
 *
 * - 답할 차례 문항만 진하게, 나머지는 흐리게 (포커스/디밍)
 * - 답하면 **다음 문항이 화면 가운데로 올라온다.** 스크롤을 직접 하지 않아도 된다
 * - 문항이 화면에 뜬 시각부터 응답까지의 시간과 고친 횟수를 기록한다 (01 §2.7)
 * - 섹션을 나갈 때 미응답을 검사한다. 114문항 다 훑고 나서 찾으러 돌아가면 안 된다
 */
export function SectionForm({
  sessionId,
  section,
  sectionCount,
  items,
  initialAnswers,
}: {
  sessionId: string;
  section: number;
  sectionCount: number;
  items: PublicItem[];
  initialAnswers: Record<string, number>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // 응답시간·수정횟수는 품질 지표의 원자료다. 응시자에게는 알리지 않는다.
  const shownAt = useRef<Record<string, number>>({});
  const meta = useRef<Record<string, { elapsedMs: number; changedCount: number }>>({});
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});

  for (const it of items) shownAt.current[it.id] ??= Date.now();

  const answered = items.filter((i) => answers[i.id] !== undefined).length;
  const firstUnanswered = items.find((i) => answers[i.id] === undefined)?.id;

  const pick = useCallback(
    (itemId: string, value: number) => {
      const now = Date.now();
      const prev = meta.current[itemId];
      meta.current[itemId] = prev
        ? { elapsedMs: prev.elapsedMs, changedCount: prev.changedCount + 1 }
        : { elapsedMs: Math.max(0, now - (shownAt.current[itemId] ?? now)), changedCount: 0 };

      setAnswers((a) => {
        const next = { ...a, [itemId]: value };
        // 답하고 나면 다음 빈 문항을 화면 가운데로 올린다
        const following = items.find((i) => next[i.id] === undefined);
        if (following) {
          setTimeout(
            () =>
              nodes.current[following.id]?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              }),
            120,
          );
        }
        return next;
      });
      setError(null);
    },
    [items],
  );

  const missing = items.filter((i) => answers[i.id] === undefined);
  const isLast = section === sectionCount;

  function next() {
    if (missing.length) {
      setError(`${missing.length}개 문항이 비어 있습니다`);
      nodes.current[missing[0].id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    start(async () => {
      const drafts = items.map((i) => ({
        itemId: i.id,
        value: answers[i.id],
        elapsedMs: meta.current[i.id]?.elapsedMs ?? 0,
        changedCount: meta.current[i.id]?.changedCount ?? 0,
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
        window.location.href = `/survey?section=${r.nextSection}&rest=1`;
        return;
      }
      const s = await submitAction(sessionId);
      if (s && "error" in s) setError(s.error);
    });
  }

  return (
    <div className="flex flex-col">
      {/*
        진행 상황을 **읽어주는 표시**로도 남긴다 (2026-08-25).

        아래 「12 / 24」는 눈으로만 읽힌다. 화면 낭독기를 쓰는 사람에게는
        지금 어디쯤인지 알 방법이 없었다. `aria-live`로 두면 답할 때마다
        조용히 읽어준다.
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {sectionCount}개 묶음 중 {section}번째, {items.length}문항 중 {answered}문항
        답했습니다.
      </p>

      {items.map((item, idx) => {
        const done = answers[item.id] !== undefined;
        const current = item.id === firstUnanswered;
        return (
          <div
            key={item.id}
            ref={(el) => {
              nodes.current[item.id] = el;
            }}
            className="scroll-mt-32 border-b border-[--border] py-16 last:border-0"
          >
            {/* 답한 문항인지 아직인지도 읽어준다. 화면에서는 흐리기로 표시한다 */}
            <span className="sr-only">
              {items.length}문항 중 {idx + 1}번째{done ? ", 답함" : ", 아직 답하지 않음"}
            </span>
            {/* 글자만 읽기 폭으로 제한한다. 한 줄 40~50자를 넘기면 다음 줄
                첫 글자를 찾느라 눈이 헤맨다 (01 §2.3). 아래 척도 줄은 글이
                아니므로 이 제한을 받지 않는다. */}
            <p
              /*
                **지금 답할 문항을 더 분명히 한다** (2026-08-25).

                전에는 굵기가 500↔600으로 한 단만 차이 나고 흐림도 45%라
                「어디를 답할 차례인지」가 잘 안 잡혔다. 굵기 차이를 벌리고,
                아직 안 온 문항은 더 흐리게, 이미 답한 문항은 중간쯤 둔다 —
                답한 것과 아직인 것도 서로 구분되어야 한다.
              */
              className="mx-auto mb-10 max-w-[54rem] text-center transition-opacity duration-200"
              style={{
                fontSize: "clamp(1.25rem, 1rem + 1vw, 2.1rem)",
                lineHeight: 1.45,
                fontWeight: current ? 700 : 500,
                opacity: current ? 1 : done ? 0.72 : 0.35,
                color: current ? "var(--ink)" : undefined,
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
              dimmed={!done && !current}
            />
          </div>
        );
      })}

      {error && (
        <p role="alert" className="mt-6 text-center" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-axis text-ink-muted tabular" aria-hidden>
          {answered} / {items.length}
        </p>
        {/* 이 화면의 유일한 동작이라 크기를 한 단 더 준다 */}
        <Button size="lg" onClick={next} disabled={pending} className="min-w-72">
          {pending ? "저장 중…" : isLast ? "제출하고 결과 보기" : "다음 묶음"}
        </Button>
      </div>
    </div>
  );
}
