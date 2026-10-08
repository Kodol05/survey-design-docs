import Link from "next/link";

/**
 * 도구줄(`StickyToolbar`) 안의 칩 묶음 (2026-10-07 사용자 결정).
 *
 * 전에는 갈래마다 한 줄씩 쌓았다(정렬 줄, 성향 줄, 직무능력 줄). 카드 안에
 * 넣고 나니 줄 셋이 카드 키를 키워 붙어 다니기에 무거웠다. 그래서 **한 흐름에
 * 늘어놓고 갈래 사이에 가는 세로선**을 둔다. 좁은 화면에서는 갈래째로 다음
 * 줄로 넘어간다.
 *
 * 줄 맨 앞에 온 갈래의 세로선은 보이면 안 된다 — 앞에 아무것도 없는데 선만
 * 서 있게 된다. 그래서 묶음 전체를 왼쪽으로 (간격 + 1px) 당기고 바깥에서
 * 잘라 낸다. 어느 갈래가 줄 맨 앞에 오든 그 선은 잘린 쪽에 놓인다.
 */
export function ChipGroups({ children }: { children: React.ReactNode }) {
  return (
    // 칩 초점 테두리까지 잘리지 않도록 자르는 선을 바깥으로 조금 민다
    <div className="-m-1 overflow-hidden p-1">
      <div className="text-axis -ml-[calc(1rem+1px)] flex flex-wrap items-center gap-y-2.5">
        {children}
      </div>
    </div>
  );
}

/** 갈래 하나 — 앞에 이름, 왼쪽에 세로선 */
export function ChipGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1.5 border-l border-(--border) pr-4 pl-4"
    >
      <span className="text-ink-muted mr-1 whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

/**
 * 칩 하나.
 *
 * **고른 칩만 먹색으로 채운다.** 안 고른 칩은 가는 테두리만 — 열한 개가
 * 다 칠해져 있으면 어느 것이 켜졌는지 안 보인다.
 *
 * 화살표도 **고른 칩에만** 붙는다. 화살표는 지금 보이는 순서를 말한다 —
 * `▼`면 큰 값이 위, `▲`면 작은 값이 위다. 이름은 `▲`가 가나다순이다.
 */
export function Chip({
  href,
  on,
  dir,
  title,
  children,
}: {
  href: string;
  on: boolean;
  /** 정렬이 걸린 칩이면 방향 */
  dir?: "asc" | "desc";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      // 고르개를 바꿔도 보던 자리에 머문다
      scroll={false}
      aria-current={on ? "true" : undefined}
      title={title}
      className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 whitespace-nowrap transition-colors ${
        on
          ? "border-transparent font-semibold"
          : "text-ink-secondary hover:text-ink border-(--border) hover:border-(--ink-muted)"
      }`}
      style={on ? { background: "var(--ink)", color: "var(--page)" } : undefined}
    >
      {children}
      {on && dir && (
        <>
          <span aria-hidden style={{ fontSize: "0.75em" }}>
            {dir === "desc" ? "▼" : "▲"}
          </span>
          <span className="sr-only">{dir === "desc" ? ", 큰 값부터" : ", 작은 값부터"}</span>
        </>
      )}
    </Link>
  );
}

/** 도구줄 왼쪽 검색 칸 — 서버로 가는 평범한 GET 폼 */
export function ToolbarSearch({
  name = "q",
  defaultValue,
  placeholder,
  hidden,
}: {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  /** 검색해도 따라가야 하는 다른 값 (정렬·축 등) */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="flex items-center gap-2">
      <input
        name={name}
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="text-table h-10 w-52 rounded-lg border border-(--border) bg-(--page) px-3"
      />
      {Object.entries(hidden ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <button className="text-table text-ink-secondary hover:text-ink h-10 rounded-lg px-2 underline">
        찾기
      </button>
    </form>
  );
}
