import { panelClass } from "@/components/ui/Panel";

/*
  불러오는 동안에도 **제목과 도구줄 자리를 먼저 그려 둔다** (2026-10-07).
  가운데 글자 한 줄만 있다가 다 그려지면 화면 전체가 뒤바뀌어 덜컥였다.
  자리만 잡아 두면 다 불러왔을 때 내용만 채워진다.
*/
export default function Loading() {
  return (
    <>
      <h1 className="text-screen-title mb-4">구성원</h1>
      <div className={`${panelClass} flex h-28 items-center px-5`}>
        <p className="text-ink-muted text-axis" role="status" aria-live="polite">
          구성원을 불러오는 중입니다…
        </p>
      </div>
    </>
  );
}
