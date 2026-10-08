"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { formatPhone } from "@/lib/auth/phone";

export type SwitchTarget = { id: string; name: string; phone: string | null };

/** 한 번에 보여 줄 후보 수 — 더 많으면 더 쳐서 좁힌다 */
const LIMIT = 8;

/**
 * 이름 옆 찾기 칸 — 다른 사람으로 바로 건너간다 (2026-10-07 사용자 결정).
 *
 * 구성원 상세를 여러 명 차례로 볼 때 매번 목록으로 돌아갔다 오는 것이 번거롭다는
 * 요청이었다. 이름(또는 전화번호 숫자 일부)을 치면 아래에 후보가 뜨고, ↑↓로
 * 고르고 Enter로 간다. Esc는 닫는다.
 *
 * 건너가도 **보던 장은 그대로** 둔다 — 「척도별 결과」를 보다가 다음 사람으로
 * 넘어가면 그 사람의 척도별 결과가 열린다. 장은 넘길 때 주소의 `?p=`만 바뀌므로
 * (서버가 준 값은 낡았을 수 있다) 고르는 순간의 주소에서 읽는다.
 */
export function EmployeeSwitcher({
  people,
  currentId,
}: {
  people: SwitchTarget[];
  currentId: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const word = q.trim();
    if (!word) return [];
    const digits = word.replace(/\D/g, "");
    // 숫자만 친 경우에만 전화번호로 찾는다 — 이름 속 숫자와 섞이지 않게
    const byPhone = digits.length >= 2 && digits.length === word.replace(/[\s-]/g, "").length;
    return people
      .filter((p) => p.id !== currentId)
      .filter((p) =>
        byPhone ? (p.phone ?? "").includes(digits) : p.name.includes(word),
      )
      .slice(0, LIMIT);
  }, [q, people, currentId]);

  const shown = open && q.trim() !== "";

  const go = (p: SwitchTarget) => {
    const page = new URLSearchParams(window.location.search).get("p");
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(`/admin/employees/${p.id}${page ? `?p=${encodeURIComponent(page)}` : ""}`);
  };

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        다른 구성원 찾기
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          shown && matches[active] ? `${listId}-${matches[active].id}` : undefined
        }
        autoComplete="off"
        placeholder="다른 사람 찾기"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // 후보를 누르는 동안 칸이 먼저 닫히지 않게 — 후보는 onMouseDown 으로 받는다
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          // 한글 조합 중의 Enter·화살표는 조합을 끝내는 키다 — 고르기로 받지 않는다
          if (e.nativeEvent.isComposing) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            if (matches.length) setActive((a) => (a + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (matches.length)
              setActive((a) => (a - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            const p = matches[active];
            if (shown && p) {
              e.preventDefault();
              go(p);
            }
          } else if (e.key === "Escape") {
            if (q) setQ("");
            setOpen(false);
          }
        }}
        className="text-table bg-card h-10 w-56 rounded-lg border border-(--border) px-3"
      />

      {shown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="찾은 구성원"
          className="bg-card text-table absolute top-full left-0 z-40 mt-1 w-72 overflow-hidden rounded-lg border border-(--border) py-1 shadow-(--card-shadow)"
        >
          {matches.length === 0 ? (
            <li className="text-axis text-ink-muted px-3 py-2">맞는 사람이 없습니다</li>
          ) : (
            matches.map((p, n) => (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={n === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(p);
                }}
                onMouseEnter={() => setActive(n)}
                className="flex cursor-pointer items-baseline justify-between gap-3 px-3 py-1.5"
                style={{ background: n === active ? "var(--wash)" : undefined }}
              >
                <span className="truncate">{p.name}</span>
                <span className="text-axis text-ink-muted tabular shrink-0">
                  {p.phone ? formatPhone(p.phone) : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
