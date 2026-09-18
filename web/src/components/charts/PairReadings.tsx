import type { PairReading } from "@/lib/interpretation/pairs";

/**
 * 두 축을 같이 보기 — 실무 해석이 실제로 쓰는 방식.
 * 세 축을 묶어 8칸으로 나누지 않고, 두 축이 어떻게 맞물리는지를 말한다.
 */
/**
 * 척도 이름 뒤 조사를 **받침에 맞게** 고른다 — 「자극추구가」·「인내력이」.
 * 둘이면 「자극추구와 위험회피가」. 기계적으로 「이(가)」를 병기하면 문장이 아니다.
 */
function joinKo(names: string[]): string {
  const jong = (w: string) => {
    const c = w.charCodeAt(w.length - 1);
    return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  };
  const subj = (w: string) => w + (jong(w) ? "이" : "가");
  if (names.length === 1) return subj(names[0]);
  const head = names.slice(0, -1).map((n) => n + (jong(n) ? "과" : "와")).join(" ");
  return `${head} ${subj(names[names.length - 1])}`;
}

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
              {joinKo(r.unclear)} 가운데에 가까워서 이 부분은 덜 확실합니다.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
