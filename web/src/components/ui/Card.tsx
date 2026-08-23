/** 카드 — docs/11-ui-guide.md §2.5. 테두리 1px, 모서리 8px, 안쪽 여백 24 */
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
    <section
      className={`rounded-lg border border-[--border] bg-surface p-6 ${className}`}
    >
      {title && <h2 className="text-section-title mb-4">{title}</h2>}
      {children}
    </section>
  );
}

/** 빈 상태 — 아이콘 없이 한 문장 (11 §2.5) */
export function EmptyState({ message }: { message: string }) {
  return <p className="text-ink-muted py-8 text-center">{message}</p>;
}
