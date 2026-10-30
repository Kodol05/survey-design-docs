"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";

export type FinderPerson = { employeeId: string; name: string; tail: string };

/**
 * 분포 화면 오른쪽 **「개인 검색」** (2026-10-30 사용자 요청).
 *
 * 이름으로 걸러 한 사람을 고르면 왼쪽 분포 그림이 그 사람 자리를 주황 선과
 * 점수로 표시한다. 같은 이름이 여럿이면 휴대폰번호 뒤 네 자리로 가른다.
 * 넓은 화면에서는 내려가도 화면에 붙어 따라온다.
 *
 * 고른 사람은 목록 안에서 **주황 바탕**으로 띄우고, 카드 머리줄에 「해제」를
 * 둔다. 목록 스크롤바는 가늘고 둥글게(`.soft-scroll`).
 */
export function PersonFinder({
  persons,
  selected,
  onSelect,
}: {
  persons: FinderPerson[];
  selected: string | null;
  onSelect: (employeeId: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim();
  const shown = query
    ? persons.filter((p) => p.name.includes(query) || p.tail.includes(query))
    : persons;
  const picked = persons.find((p) => p.employeeId === selected) ?? null;

  return (
    <Panel
      title="개인 검색"
      aside={
        picked ? (
          <button
            type="button"
            onClick={() => onSelect(picked.employeeId)}
            className="text-axis hover:text-ink underline underline-offset-4"
          >
            해제
          </button>
        ) : (
          <span className="tabular">{persons.length}명</span>
        )
      }
      className="xl:sticky xl:top-[calc(var(--admin-top)+1rem)]"
      bodyClassName="px-3! pt-3! pb-2!"
    >
      {/* 고른 사람 */}
      <div
        className="mb-3 rounded-xl px-3.5 py-3 transition-colors"
        style={{
          background: picked
            ? "color-mix(in oklab, var(--focus) 12%, var(--card))"
            : "var(--wash)",
        }}
      >
        {picked ? (
          <>
            <p className="text-table font-semibold" style={{ color: "var(--focus)" }}>
              {picked.name}
              <span className="text-axis text-ink-muted ml-1.5 font-normal tabular">
                {picked.tail}
              </span>
            </p>
          </>
        ) : (
          <p className="text-axis text-ink-muted">선택한 사람 없음</p>
        )}
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름 또는 번호 끝자리"
        aria-label="이름 검색"
        className="text-table w-full rounded-lg bg-(--wash)/60 px-3 py-2 placeholder:text-(--ink-muted) focus:bg-(--wash) focus:outline-none"
      />

      <ul className="soft-scroll mt-2 -mr-1 flex max-h-[26rem] flex-col gap-0.5 overflow-y-auto pr-1">
        {shown.map((p) => {
          const on = p.employeeId === selected;
          return (
            <li key={p.employeeId}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(p.employeeId)}
                className={`text-table flex w-full items-baseline justify-between rounded-lg px-3 py-1.5 text-left transition-colors ${
                  on ? "font-semibold" : "hover:bg-(--wash)/70"
                }`}
                style={
                  on
                    ? {
                        background: "color-mix(in oklab, var(--focus) 14%, var(--card))",
                        color: "var(--focus)",
                      }
                    : undefined
                }
              >
                <span>{p.name}</span>
                <span className="text-axis text-ink-muted tabular font-normal">{p.tail}</span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="text-axis text-ink-muted px-3 py-2">찾는 사람이 없습니다</li>
        )}
      </ul>
    </Panel>
  );
}
