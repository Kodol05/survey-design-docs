import Link from "next/link";

/**
 * 없는 주소.
 *
 * 전에는 Next 기본 화면이 떴다 — **영어로 「404 This page could not be found」.**
 * 없는 사람 id로 들어가면(`notFound()`) 이게 나온다.
 */
export default function NotFound() {
  return (
    <main className="reading-column flex flex-1 flex-col justify-center py-32">
      <h1 className="text-screen-title mb-4">찾는 화면이 없습니다</h1>
      <p className="text-ink-secondary text-item mb-10">
        주소가 바뀌었거나, 지워진 사람일 수 있습니다.
      </p>
      <p className="text-table">
        <Link href="/" className="underline">
          처음으로
        </Link>
      </p>
    </main>
  );
}
