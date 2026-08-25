import Link from "next/link";
import type { Attendee } from "@/lib/admin/summary";

/**
 * 응시 현황 — **한 칸이 한 사람**.
 *
 * ## 누적 곡선을 대신한다 (2026-08-25 사용자 결정)
 *
 * 전에 이 자리에는 날짜별 누적 완료 곡선이 있었다. 수집하는 동안에는
 * 쓸모가 있는데 **다 끝나고 나면 영원히 평평한 선**이다. 대시보드 네 칸
 * 중 하나가 그것으로 차 있었다.
 *
 * 사람 단위로 세면 끝난 뒤에도 「누가 아직 안 했나」를 계속 말해준다.
 * 그리고 비율을 눈으로 재는 데는 막대보다 **칸을 세는 쪽**이 정확하다 —
 * 38 / 44가 얼마쯤인지 곡선의 높이로는 알 수 없지만, 빈 칸 여섯 개는 보인다.
 *
 * ## 남은 사람은 이름으로 적는다
 *
 * 칸 그림은 비율을 보여주고 **이름은 할 일을 보여준다.** 「진행 중 5명」만
 * 알면 누구에게 말해야 할지 모르니 화면을 한 번 더 뒤져야 한다.
 */

const KIND = {
  COMPLETED: { label: "완료", color: "var(--series-1)" },
  IN_PROGRESS: { label: "진행 중", color: "var(--series-2)" },
  ABANDONED: { label: "중단", color: "var(--ink-muted)" },
  NONE: { label: "미응시", color: "var(--grid)" },
} as const;

const ORDER = ["COMPLETED", "IN_PROGRESS", "ABANDONED", "NONE"] as const;

export function Attendance({ people }: { people: Attendee[] }) {
  if (people.length === 0)
    return <p className="text-ink-muted text-table">아직 가입한 사람이 없습니다.</p>;

  const count = (k: Attendee["status"]) =>
    people.filter((p) => p.status === k).length;
  const done = count("COMPLETED");

  // 아직 남은 사람 — 이름을 그대로 적는다
  const pending = people.filter((p) => p.status !== "COMPLETED");

  return (
    <div>
      <p className="mb-4">
        <span className="tabular text-4xl font-semibold">{done}</span>
        <span className="text-ink-secondary tabular ml-1 text-2xl">
          {" / "}
          {people.length}
        </span>
        <span className="text-axis text-ink-muted ml-3">가입한 사람 기준</span>
      </p>

      {/*
        칸 크기를 고정한다. 사람이 늘면 줄이 늘어나야지 칸이 작아지면
        안 된다 — 칸 하나가 한 사람이라는 약속이 깨진다.
      */}
      <div className="mb-5 flex flex-wrap gap-1.5" aria-hidden>
        {people.map((p) => (
          <span
            key={p.id}
            title={`${p.name} · ${KIND[p.status].label}`}
            className="block h-4 w-4 rounded-[3px]"
            style={{
              background: KIND[p.status].color,
              // 미응시 칸은 바탕색과 가까워 테두리가 없으면 사라진다
              outline:
                p.status === "NONE" ? "1px solid var(--border)" : undefined,
              outlineOffset: -1,
            }}
          />
        ))}
      </div>

      <ul className="text-axis flex flex-wrap gap-x-5 gap-y-1.5">
        {ORDER.filter((k) => count(k) > 0).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-3 w-3 rounded-[2px]"
              style={{
                background: KIND[k].color,
                outline: k === "NONE" ? "1px solid var(--border)" : undefined,
                outlineOffset: -1,
              }}
            />
            <span className="text-ink-secondary">{KIND[k].label}</span>
            <span className="tabular font-medium">{count(k)}</span>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <p className="text-axis text-ink-secondary mt-5 leading-relaxed">
          <span className="text-ink-muted">아직 안 끝난 사람 — </span>
          {pending.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <Link href={`/admin/employees/${p.id}`} className="underline">
                {p.name}
              </Link>
              {p.status === "NONE" && (
                <span className="text-ink-muted"> (시작 전)</span>
              )}
              {p.status === "ABANDONED" && (
                <span className="text-ink-muted"> (중단)</span>
              )}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
