/**
 * 분포 위치 막대 — docs/11-ui-guide.md §2.1
 *
 * 관리자 개인 상세 · 직무능력 옆 병기 · 사내 분포 세 군데에서 쓴다. 규격은 하나다.
 *
 * 세 단계로만 표현하는 이유 — 백분위 숫자는 사람이 늘 때마다 흔들려서
 * 정밀해 보이는 만큼 신뢰를 잃는다.
 *
 * 개인 화면에는 절대 쓰지 않는다 (00 D-09).
 */
import { MIN_N, WARNINGS } from "./NBadge.helpers";

export type Band = "lower" | "middle" | "upper";

export const BAND_LABEL: Record<Band, string> = {
  lower: "아래쪽",
  middle: "가운데",
  upper: "위쪽",
};

type Props = {
  /** 0~100 고정 스케일. 자동 눈금 금지 */
  score: number;
  band: Band;
  /** 이 분포를 만든 표본 수 */
  n: number;
  label?: string;
};

export function DistributionBar({ score, band, n, label }: Props) {
  if (n < MIN_N) {
    return (
      <span className="text-axis text-ink-muted">{WARNINGS.smallSample}</span>
    );
  }

  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-2 w-40 rounded-full"
        style={{ background: "var(--grid)" }}
        role="img"
        aria-label={`${label ? label + " " : ""}${score}점, 사내 위치 ${BAND_LABEL[band]}, ${n}명 기준`}
      >
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
          style={{
            left: `${clamped}%`,
            background: "var(--series-1)",
            // 겹칠 때 서로 분리되도록 바탕색 링을 두른다 (11 §3.3)
            ["--tw-ring-color" as string]: "var(--surface)",
          }}
        />
      </div>
      <span className="text-axis text-ink-secondary">
        사내 위치 {BAND_LABEL[band]}
      </span>
    </div>
  );
}
