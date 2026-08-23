import type { CubeResult } from "@/lib/interpretation/cube";

/**
 * 큐브 해석 표시 — 00 §2.2
 * 기질과 성격을 나란히 놓는다. 두 큐브를 곱한 하나의 서술이 아니다.
 */
export function CubeReading({
  temperament,
  character,
}: {
  temperament: CubeResult | null;
  character: CubeResult | null;
}) {
  if (!temperament && !character) return null;

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      {temperament && <Block title="기질을 묶어 보면" result={temperament} />}
      {character && <Block title="성격을 묶어 보면" result={character} />}
    </div>
  );
}

function Block({ title, result }: { title: string; result: CubeResult }) {
  return (
    <section>
      <h3 className="text-ink-secondary mb-3 font-medium">{title}</h3>
      <p className="leading-relaxed">{result.text}</p>
      {result.unclear.length > 0 && (
        <p className="text-axis text-ink-muted mt-3">
          다만 {result.unclear.join(" · ")}은(는) 가운데에 가까워서 어느 쪽이라고 하기
          어렵습니다. 위 설명에서 그 부분은 덜 확실합니다.
        </p>
      )}
    </section>
  );
}
