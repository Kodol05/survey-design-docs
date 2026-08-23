"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "../ui/Button";
import { LikertScale } from "./LikertScale";
import { saveSectionAction, submitAction } from "@/lib/survey/actions";
import type { PublicItem } from "@/lib/survey/session";

/**
 * 섹션 응시 화면 — 01 §2.5~2.7, 11 §5.1
 *
 * - 아직 답하지 않은 첫 문항 외에는 흐리게 (포커스/디밍)
 * - 문항이 활성화된 시각부터 응답까지의 시간과 고친 횟수를 기록한다
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

  // 응답시간·수정횟수는 품질 지표의 원자료다 (01 §2.7). 응시자에게는 알리지 않는다.
  const shownAt = useRef<Record<string, number>>({});
  const meta = useRef<Record<string, { elapsedMs: number; changedCount: number }>>({});

  const firstUnanswered = items.find((i) => answers[i.id] === undefined)?.id;

  function pick(itemId: string, value: number) {
    const now = Date.now();
    const prev = meta.current[itemId];
    if (prev) {
      meta.current[itemId] = { elapsedMs: prev.elapsedMs, changedCount: prev.changedCount + 1 };
    } else {
      const start = shownAt.current[itemId] ?? now;
      meta.current[itemId] = { elapsedMs: Math.max(0, now - start), changedCount: 0 };
    }
    setAnswers((a) => ({ ...a, [itemId]: value }));
    setError(null);
  }

  // 이 문항이 화면에 나타난 시각. 첫 렌더에 한 번만 찍는다.
  for (const it of items) shownAt.current[it.id] ??= Date.now();

  const missing = items.filter((i) => answers[i.id] === undefined);
  const isLast = section === sectionCount;

  function next() {
    if (missing.length) {
      setError(`${missing.length}개 문항이 비어 있습니다`);
      document
        .getElementById(`item-${missing[0].id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    start(async () => {
      const drafts = items.map((i) => ({
        itemId: i.id,
        value: answers[i.id],
        elapsedMs: meta.current[i.id]?.elapsedMs ?? 0,
        changedCount: meta.current[i.id]?.changedCount ?? 0,
      }));
      const r = await saveSectionAction(sessionId, section, drafts);
      if (r.nextSection) {
        window.location.href = `/survey?section=${r.nextSection}`;
      } else {
        const s = await submitAction(sessionId);
        if (s?.error) setError(s.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-12">
      {items.map((item, idx) => {
        const answered = answers[item.id] !== undefined;
        return (
          <div key={item.id} id={`item-${item.id}`} className="flex flex-col gap-4">
            <p
              className={`text-item transition-opacity ${
                answered || item.id === firstUnanswered ? "opacity-100" : "opacity-45"
              }`}
            >
              <span className="text-ink-muted tabular mr-2">{idx + 1}.</span>
              {item.content}
            </p>
            <LikertScale
              name={item.id}
              value={answers[item.id]}
              onChange={(v) => pick(item.id, v)}
              dimmed={!answered && item.id !== firstUnanswered}
            />
          </div>
        );
      })}

      {error && (
        <p role="alert" className="text-table" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      <div className="flex justify-end pb-16">
        <Button onClick={next} disabled={pending}>
          {pending ? "저장 중…" : isLast ? "제출하고 결과 보기" : "다음 묶음"}
        </Button>
      </div>
    </div>
  );
}
