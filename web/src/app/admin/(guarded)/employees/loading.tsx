export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <p className="text-ink-muted text-item" role="status" aria-live="polite">
        구성원을 불러오는 중입니다…
      </p>
    </div>
  );
}
