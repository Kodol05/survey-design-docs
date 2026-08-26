"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ABILITY_SOURCES,
  SOURCE_LABEL,
  SOURCE_NOTE,
  SOURCE_PARAM,
  type AbilitySource,
} from "@/lib/admin/abilitySource";

/**
 * 직무능력 값의 출처를 고르는 제목.
 *
 * **제목 자체가 버튼이다.** 옆에 따로 고르는 칸을 두면 "이 숫자가 무엇인지"와
 * "무엇으로 바꿀지"가 떨어져 놓여, 지금 보고 있는 게 뭔지 알기 어려워진다.
 * 제목을 누르면 그 자리에서 펼쳐진다.
 *
 * 고른 것은 **주소에 남긴다** (`?src=boss`). 목록에서 상세로 넘어가도 유지되고
 * 링크로 그대로 보낼 수 있다. `scroll: false`로 두어 눌러도 화면이 위로
 * 튀지 않게 한다 — 표 한가운데서 바꾸는 일이 많다.
 */
export function SourcePicker({
  value,
  bossCount,
  className = "",
}: {
  value: AbilitySource;
  /** 대표님이 평가한 사람 수. 0이면 고를 수 없다 */
  bossCount: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (s: AbilitySource) => {
    const next = new URLSearchParams(params.toString());
    if (s === "self") next.delete(SOURCE_PARAM);
    else next.set(SOURCE_PARAM, s);
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    setOpen(false);
  };

  const ready = bossCount > 0;

  return (
    <div ref={box} className={`relative ${className}`}>
      {/*
        **바꿀 수 있다는 것이 보여야 한다.** 처음에는 제목 옆에 작은 ▾ 하나만
        뒀는데, 그게 여닫는 표시인지 그냥 장식인지 알 수 없어 아무도 누르지
        않았다. 지금은 「지금 보는 값」이라는 딱지와 테두리를 같이 둬서
        고르는 자리라는 것이 먼저 읽히게 한다.
      */}
      <p className="text-axis text-ink-muted mb-1">지금 보는 값</p>
      <button
        type="button"
        onClick={() => ready && setOpen(!open)}
        disabled={!ready}
        className="text-section-title inline-flex items-center gap-3 rounded-lg px-4 py-2 disabled:cursor-default"
        style={{
          background: open ? "var(--wash)" : "transparent",
          outline: "1px solid var(--border)",
        }}
        title={ready ? "눌러서 바꿉니다" : "관리자 평가가 아직 없습니다"}
      >
        {SOURCE_LABEL[value]}
        {ready ? (
          <span
            aria-hidden
            className="text-axis rounded-md px-2 py-0.5"
            style={{ background: "var(--wash)", color: "var(--ink-secondary)" }}
          >
            바꾸기 {open ? "▴" : "▾"}
          </span>
        ) : (
          <span className="text-axis text-ink-muted">관리자 평가 없음</span>
        )}
      </button>

      {open && (
        <ul
          className="absolute top-full left-0 z-10 mt-2 w-[26rem] overflow-hidden rounded-xl py-1 shadow-sm"
          style={{ background: "var(--page)", outline: "1px solid var(--border)" }}
        >
          {ABILITY_SOURCES.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="w-full px-4 py-3 text-left"
                style={{ background: s === value ? "var(--wash)" : "transparent" }}
              >
                <span className="text-table font-medium">{SOURCE_LABEL[s]}</span>
                <span className="text-axis text-ink-muted mt-0.5 block leading-snug">
                  {SOURCE_NOTE[s]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
