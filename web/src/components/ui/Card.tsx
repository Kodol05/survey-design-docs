/**
 * 구역 — docs/11-ui-guide.md §2.5
 *
 * **테두리와 바탕색을 두지 않는다.** 요소마다 상자를 두르면 화면이
 * 상자 모음처럼 보이고, 실제로 나뉜 것도 아닌데 나뉜 것처럼 읽힌다.
 * 구분은 **여백과 제목**으로 한다. 가는 선은 정말 경계일 때만 쓴다.
 */
export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title && (
        <h2 className="text-section-title mb-5 border-b border-[--border] pb-2">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** 빈 상태 — 아이콘 없이 한 문장 */
export function EmptyState({ message }: { message: string }) {
  return <p className="text-ink-muted py-10 text-center">{message}</p>;
}
