/**
 * 관리자 화면의 카드 (2026-10-07 사용자 결정).
 *
 * 관리자 화면은 덩어리마다 카드 하나로 나눈다 — 바탕(`--canvas`)보다 한 단
 * 밝은 칸, 가는 테두리, 옅은 그림자. 머리줄에 제목과 오른쪽 동작(링크·버튼)을
 * 두고 가는 선 아래에 내용이 온다.
 *
 * **카드 안에 카드를 넣지 않는다.** 안에서는 지금처럼 여백과 가는 선으로만
 * 나눈다 — 겹겹이 두르면 다시 상자 모음이 된다. 아이콘도 쓰지 않는다.
 *
 * 직원 화면은 이걸 쓰지 않는다. 그쪽은 `Card`(상자 없는 구역) 그대로다.
 */
export function Panel({
  title,
  aside,
  children,
  className = "",
  bodyClassName = "",
  flush = false,
  id,
}: {
  title?: React.ReactNode;
  /** 머리줄 오른쪽 — 「자세히」 링크, 토글, 버튼 */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** 안쪽 여백 없이 — 표처럼 카드 끝까지 닿아야 하는 것 */
  flush?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`admin-card ${panelClass} ${className}`}>
      {(title || aside) && (
        <header className="flex min-h-13 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-(--border) px-5 py-3">
          {title && <h2 className="text-card-title">{title}</h2>}
          {aside && (
            <div className="text-axis text-ink-secondary flex items-center gap-3">
              {aside}
            </div>
          )}
        </header>
      )}
      <div className={`${flush ? "" : "p-5"} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** 카드 겉모양만 — 숫자 카드·목록 줄처럼 머리줄이 없는 것도 같은 모양을 쓴다 */
export const panelClass =
  "rounded-xl border border-(--border) bg-card shadow-(--card-shadow)";
