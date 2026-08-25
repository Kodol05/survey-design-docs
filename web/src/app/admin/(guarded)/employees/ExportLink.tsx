/**
 * CSV 내보내기 (2026-08-25 사용자 결정).
 *
 * ## 왜 경고를 옆에 두는가
 *
 * 화면 안에서는 로그인한 관리자만 볼 수 있다. **파일로 나가는 순간 그 울타리가
 * 없어진다** — 메일에 붙고, 공유 폴더에 올라가고, 지우기로 한 사람의 값도
 * 남아 있는다. 지금까지 이 시스템이 지킨 것(퇴사자 완전 삭제, D-48)이
 * 파일 하나로 무너질 수 있다.
 *
 * 막지는 않는다. 필요하니까 만든 기능이다. 다만 **무엇이 나가는지 한 줄로
 * 말하고** 파일 이름에 날짜를 박아 어느 시점 것인지 남긴다.
 */
export function ExportLink({ href, count }: { href: string; count: number }) {
  return (
    <div className="text-axis text-right">
      <a
        href={href}
        className="text-table inline-flex h-11 items-center rounded-lg border border-[--border] px-4 font-medium"
      >
        CSV로 내보내기
      </a>
      <p className="text-ink-muted mt-2 max-w-[26rem] leading-snug">
        지금 목록의 <span className="tabular">{count}</span>명 · 이름·번호·성향
        7축·직무능력이 들어갑니다.{" "}
        <strong className="text-ink-secondary">
          파일로 나가면 이 화면의 잠금이 따라가지 않습니다.
        </strong>
      </p>
    </div>
  );
}
