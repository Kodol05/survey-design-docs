import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata = { title: "7차원 성향 설문" };

/**
 * 첫 화면 (Task 27).
 *
 * 전에는 곧장 `/login`으로 넘겼다. 그러면 링크를 받은 사람이 **아무 설명 없이
 * 로그인 상자만** 보게 된다 — 이게 뭔지, 왜 하는지, 얼마나 걸리는지 모른 채로.
 *
 * 이미 들어와 있는 사람은 그대로 보내 준다. 로그인한 사람에게 소개 화면을
 * 다시 보여줄 이유가 없다.
 *
 * ⚠️ **길이를 늘리지 않는다 (01 §2.9).** 안내가 길면 읽지 않고 넘어간다.
 *    「인사평가에 쓰지 않습니다」 같은 말도 넣지 않는다 — 굳이 꺼내면
 *    반감만 산다는 것이 그때의 결정이었다. 개인정보 고지는 동의를 받는
 *    자리인 가입 화면에 있다 (D-14).
 */
export default async function Home() {
  const me = await currentUser();
  if (me) redirect(me.role === "ADMIN" ? "/admin" : "/me");

  return (
    <main className="reading-column flex flex-1 flex-col justify-center py-20">
      <div className="mb-10 flex justify-end">
        <ThemeToggle />
      </div>

      <h1 className="text-screen-title mb-4">7차원 성향 설문</h1>

      <p className="text-item text-ink-secondary mb-10">
        일하는 방식과 성향을 일곱 개 축으로 나눠 봅니다. 끝내면 바로 자기 결과를
        보실 수 있습니다.
      </p>

      <ul className="text-item mb-12 flex flex-col gap-3">
        <Point>약 17분 · 114문항</Point>
        <Point>중간에 그만두어도 이어서 하실 수 있습니다</Point>
        <Point>정답과 오답이 없습니다</Point>
      </ul>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/signup"
          className="text-item inline-flex h-14 items-center rounded-lg px-8 font-medium"
          style={{ background: "var(--series-1)", color: "#fff" }}
        >
          시작하기
        </Link>
        <Link href="/login" className="text-table text-ink-secondary underline">
          이미 계정이 있습니다
        </Link>
      </div>

      <p className="text-axis text-ink-muted mt-16 border-t border-[--border] pt-6">
        클로닝거의 기질·성격 이론을 참고해 사내에서 만든 설문입니다. 공개된 검사를
        그대로 쓴 것이 아니라 문항을 직접 만들었고,{" "}
        <strong>아직 다듬는 중입니다.</strong> 참고 자료로 봐 주시면 됩니다.
      </p>

      <p className="text-axis text-ink-muted mt-6">
        <Link href="/admin/login" className="underline">
          관리자 로그인
        </Link>
      </p>
    </main>
  );
}

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="text-ink-muted">
        ·
      </span>
      <span>{children}</span>
    </li>
  );
}
