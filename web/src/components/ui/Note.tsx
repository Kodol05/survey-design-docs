"use client";

import { useState } from "react";

/**
 * 접히는 설명.
 *
 * 화면마다 문단을 서너 개씩 쌓아 두면 **읽는 사람은 아무것도 안 읽는다.**
 * 설명이 필요 없는 게 아니라, 필요할 때만 있으면 된다.
 *
 * 그래서 한 줄로 접어 두고 누를 때만 편다. 접힌 상태에서도 무엇에 대한
 * 설명인지는 보이게 제목을 단다 — `설명 보기`처럼 내용 없는 말은 쓰지 않는다.
 */
export function Note({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-axis text-ink-muted inline-flex items-center gap-1.5"
      >
        <span aria-hidden style={{ fontSize: "0.8em" }}>
          {open ? "▾" : "▸"}
        </span>
        {label}
      </button>
      {open && (
        <div className="text-axis text-ink-secondary mt-2 max-w-[52rem] border-l-2 border-[--border] pl-4 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}
