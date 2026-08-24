import type { PairReading } from "@/lib/interpretation/pairs";

/**
 * 두 축을 같이 보기 — 실무 해석이 실제로 쓰는 방식.
 * 세 축을 묶어 8칸으로 나누지 않고, 두 축이 어떻게 맞물리는지를 말한다.
 */
export function PairReadings({
  readings,
  scores,
}: {
  readings: PairReading[];
  scores: Record<string, { percent: number }>;
}) {
  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
      {readings.map((r) => (
        <section key={r.pair.title}>
          <h3 className="mb-1 text-2xl font-medium">{r.pair.title}</h3>
          <p className="text-table text-ink-muted mb-3 tabular">
            {r.pair.a} {Math.round(scores[r.pair.a]?.percent ?? 0)} · {r.pair.b}{" "}
            {Math.round(scores[r.pair.b]?.percent ?? 0)}
          </p>
          <p className="text-item">{r.text}</p>
          {r.unclear.length > 0 && (
            <p className="text-table text-ink-muted mt-2">
              {r.unclear.join(" · ")}이(가) 가운데에 가까워서 이 부분은 덜 확실합니다.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
