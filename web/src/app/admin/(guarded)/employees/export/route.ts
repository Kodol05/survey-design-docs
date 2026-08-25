import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/auth/phone";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import {
  SOURCE_LABEL,
  parseSource,
  resolveAbilities,
} from "@/lib/admin/abilitySource";
import { pickBossScores } from "@/lib/admin/ratings";
import { abilityMean } from "@/components/analysis/TraitStrip";
import type { StoredAbilities, StoredTraits } from "@/lib/survey/result";

/**
 * 구성원 CSV (2026-08-25 사용자 결정).
 *
 * ## 엑셀이 한글을 깨뜨리지 않게
 *
 * 윈도우 엑셀은 CSV를 열 때 **UTF-8이라고 말해주지 않으면 시스템 코드페이지로
 * 읽는다.** 그러면 한글이 전부 깨진다. 파일 맨 앞에 BOM(`﻿`)을 붙이면
 * 엑셀이 UTF-8로 알아본다. 이 세 글자가 이 파일이 실제로 열리느냐를 가른다.
 *
 * ## 줄바꿈은 CRLF
 *
 * RFC 4180이 그렇게 정하고 있고, 옛 엑셀은 LF만 있으면 한 줄로 붙여 읽는다.
 *
 * ## 무엇을 넣지 않는가
 *
 * **비밀번호 해시, 세션, 문항별 응답은 넣지 않는다.** 해시는 파일로 나갈
 * 이유가 없고, 문항별 응답은 이 파일의 목적(사람을 훑는 것)과 다르다 —
 * 그건 나가면 「누가 몇 번 문항에 뭐라 답했는지」가 통째로 나가는 것이다.
 */
export async function GET(req: Request) {
  await requireAdmin();

  const source = parseSource(
    new URL(req.url).searchParams.get("src") ?? undefined,
  );

  const employees = await prisma.employee.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    include: {
      testSessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { result: true, qualityFlag: true },
      },
      ratings: true,
    },
  });

  const STATUS: Record<string, string> = {
    COMPLETED: "완료",
    IN_PROGRESS: "진행 중",
    ABANDONED: "중단",
  };

  const head = [
    "이름",
    "번호",
    "상태",
    "응시일",
    "응답 신뢰도",
    "신뢰도 판정",
    ...TRAIT_SCALES,
    ...ABILITY_AXES.map((a) => `${a}(${SOURCE_LABEL[source]})`),
    `세 능력 평균(${SOURCE_LABEL[source]})`,
  ];

  const body = employees.map((e) => {
    const s = e.testSessions[0];
    const stored = (s?.result?.scoresJson ?? null) as StoredTraits | null;
    const ability = (s?.result?.abilityScoresJson ??
      null) as StoredAbilities | null;

    const self = ability
      ? Object.fromEntries(
          Object.entries(ability).map(([k, v]) => [k, v.percent]),
        )
      : {};
    const abilities = resolveAbilities(source, self, pickBossScores(e.ratings));

    return [
      e.name,
      e.phone ? formatPhone(e.phone) : "",
      s ? (STATUS[s.status] ?? s.status) : "미응시",
      s?.completedAt ? isoDay(s.completedAt) : "",
      s?.qualityFlag
        ? String(Math.round(s.qualityFlag.antonymAgreement * 100))
        : "",
      s?.qualityFlag?.flag ?? "",
      ...TRAIT_SCALES.map((t) =>
        stored?.[t] ? String(Math.round(stored[t].percent)) : "",
      ),
      ...ABILITY_AXES.map((a) =>
        typeof abilities[a] === "number" ? String(Math.round(abilities[a])) : "",
      ),
      // 한 축이라도 없으면 비워 둔다 — 있는 것만 평균 내면 다른 잣대가 된다
      (() => {
        const m = abilityMean(abilities);
        return m === null ? "" : String(Math.round(m));
      })(),
    ];
  });

  const csv =
    "﻿" +
    [head, ...body].map((r) => r.map(quote).join(",")).join("\r\n") +
    "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename()}"`,
      // 사람 정보다. 중간 어디에도 남지 않게 한다
      "Cache-Control": "no-store, private",
    },
  });
}

/**
 * CSV 한 칸 감싸기.
 *
 * 쉼표·따옴표·줄바꿈이 든 값을 그대로 쓰면 **칸이 밀린다.** 이름에 쉼표가
 * 들어갈 일은 없어 보여도, 값 하나가 표 전체를 어긋나게 만드는 것은 막아
 * 두는 편이 싸다. 따옴표는 두 번 적어 벗어난다(RFC 4180).
 */
function quote(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 서버 시간대와 무관하게 한국 날짜로 적는다 */
function isoDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** 언제 뽑은 파일인지 이름에 남긴다 — 여러 벌이 돌아다니면 어느 것이 최신인지 모른다 */
function filename(): string {
  return `구성원_${isoDay(new Date())}.csv`;
}
