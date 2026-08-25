"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * 화면을 그리다 오류가 났을 때.
 *
 * 서버 액션은 전부 감쌌지만(`guarded`) **화면 렌더링 쪽은 안 감쌌다.**
 * DB가 끊긴 채로 분석 화면에 들어가면 Next 기본 오류 화면이 뜬다.
 *
 * ⚠️ **오류 원문을 화면에 찍지 않는다.** 파일 경로와 내부 구조가 그대로
 *    들어 있다. 로그인 화면에서 한 번 새어나간 적이 있다 (2026-08-24).
 *    사람에게는 다시 해보라는 말만 하고, 원문은 콘솔로 보낸다.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[render]", error);
  }, [error]);

  return (
    <main className="reading-column flex flex-1 flex-col justify-center py-32">
      <h1 className="text-screen-title mb-4">화면을 열지 못했습니다</h1>
      <p className="text-ink-secondary text-item mb-10">
        잠시 후 다시 시도해 주세요. 계속 같으면 관리자에게 알려주시면 됩니다.
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button size="lg" onClick={reset}>
          다시 시도
        </Button>
        <Link href="/" className="text-table text-ink-secondary underline">
          처음으로
        </Link>
      </div>

      {/* 원문 대신 추적용 번호만. 이것만으로 서버 기록에서 찾을 수 있다 */}
      {error.digest && (
        <p className="text-axis text-ink-muted tabular mt-16">오류 번호 {error.digest}</p>
      )}
    </main>
  );
}
