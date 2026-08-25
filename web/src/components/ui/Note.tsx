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
        aria-expanded={open}
        className="text-axis text-ink-muted hover:text-ink-secondary inline-flex items-center gap-1.5 transition"
      >
        {/*
          ⚠️ 삼각형을 **작게 두면 점으로 뭉개진다.** 0.8em으로 줄였더니
          화면에서는 「▸」가 아니라 「•」로 보여서, 목록의 불릿과 구분이 안 되고
          **누를 수 있다는 것 자체가 전해지지 않았다.** 크기를 줄이지 않고,
          제목에 밑줄을 얹어 누를 곳임을 한 번 더 말한다.
        */}
        <span
          aria-hidden
          className="inline-block transition-transform"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        >
          ▸
        </span>
        <span className="underline decoration-dotted underline-offset-4">
          {label}
        </span>
      </button>
      {open && (
        <div className="text-axis text-ink-secondary mt-2 max-w-[52rem] border-l-2 border-[--border] pl-4 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}
