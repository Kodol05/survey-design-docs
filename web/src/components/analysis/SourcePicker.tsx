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
      <button
        type="button"
        onClick={() => ready && setOpen(!open)}
        disabled={!ready}
        className="text-section-title inline-flex items-baseline gap-2 disabled:cursor-default"
        title={ready ? undefined : "대표님 평가가 아직 없습니다"}
      >
        {SOURCE_LABEL[value]}
        {ready && (
          <span aria-hidden className="text-ink-muted text-axis">
            {open ? "▴" : "▾"}
          </span>
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
