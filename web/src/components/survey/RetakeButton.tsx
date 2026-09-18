"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

/**
 * 「다시 응시하기」 — 결과지 모든 장 오른쪽 아래의 노란 버튼 (2026-09-18).
 *
 * 누르면 바로 가지 않고 **한 번 묻는다**(사용자 요청). 다시 응시하면 화면의
 * 결과가 새 응답 기준으로 바뀌므로, 실수로 누른 사람이 지금 결과를 잃은
 * 것처럼 느끼지 않게 한다.
 *
 * 브라우저의 `confirm()` 은 쓰지 않는다 — 스타일을 못 입히고, 화면 낭독기와
 * 자동화 도구를 막는다. 페이지 안 `<dialog>` 로 묻는다.
 */
export function RetakeButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-table rounded-lg px-4 py-2 font-semibold shadow-sm transition hover:brightness-95"
        style={{ background: "var(--status-warn)", color: "#22201d" }}
      >
        다시 응시하기
      </button>

      <dialog
        ref={ref}
        className="result-dialog m-auto w-[min(92vw,26rem)] rounded-2xl border border-[--border] p-6 shadow-xl"
        style={{ background: "var(--page)", color: "var(--ink)" }}
        onClick={(e) => {
          // 바깥(배경)을 누르면 닫는다
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <h2 className="text-section-title mb-2">다시 응시하시겠습니까?</h2>
        <p className="text-table text-ink-secondary mb-6">
          다시 응시하면 이 결과 대신 새로 답한 결과가 보이게 됩니다.
          120문항, 20분 정도 걸립니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="text-table rounded-lg px-4 py-2 transition hover:brightness-95"
            style={{ background: "var(--wash)", color: "var(--ink)" }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              ref.current?.close();
              router.push("/survey");
            }}
            className="text-table rounded-lg px-4 py-2 font-semibold transition hover:brightness-95"
            style={{ background: "var(--status-warn)", color: "#22201d" }}
          >
            다시 응시하기
          </button>
        </div>
      </dialog>
    </>
  );
}
