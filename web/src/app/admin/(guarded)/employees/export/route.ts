import { requireAdmin } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/auth/phone";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { abilityMean } from "@/components/analysis/TraitStrip";
import { isoDay, loadRoster } from "@/lib/admin/roster";
import { FLAG_LABEL, type QualityFlag } from "@/lib/scoring/quality";

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

  /*
    **화면 목록과 같은 사람을 같은 순서로** 내보낸다 (2026-09-30).
    전에는 검색·거르개를 무시하고 전원을 뽑았고, 재응시를 시작한 사람은
    끝낸 결과 대신 빈 새 세션이 나갔다. 목록과 같은 `loadRoster` 를 쓴다.
  */
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const { rows } = await loadRoster(params);

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
    ...ABILITY_AXES.map((a) => `${a}(직원 설문)`),
    "세 능력 평균(직원 설문)",
  ];

  const num = (v: number | null | undefined) =>
    typeof v === "number" ? String(Math.round(v)) : "";

  const body = rows.map((r) => {
    const done = r.status === "COMPLETED";
    return [
      r.name,
      r.phone ? formatPhone(r.phone) : "",
      r.status ? (STATUS[r.status] ?? r.status) : "미응시",
      r.completedDay ?? "",
      done && r.agreement !== null ? num(r.agreement * 100) : "",
      done ? (FLAG_LABEL[r.flag as QualityFlag] ?? r.flag) : "",
      ...TRAIT_SCALES.map((t) => num(r.traits?.[t])),
      ...ABILITY_AXES.map((a) => num(r.abilities?.[a])),
      // 한 축이라도 없으면 비워 둔다 — 있는 것만 평균 내면 다른 잣대가 된다
      num(abilityMean(r.abilities)),
    ];
  });

  const csv =
    "\uFEFF" +
    [head, ...body].map((r) => r.map(quote).join(",")).join("\r\n") +
    "\r\n";

  /*
    파일 이름에 한글을 그대로 넣으면 헤더가 깨져 **내보내기가 500 으로 죽는다**
    (헤더는 ASCII 만 받는다). 한글 이름은 `filename*` 로 따로 싣는다.
  */
  const day = isoDay(new Date());
  const korean = encodeURIComponent(`구성원_${day}.csv`);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members_${day}.csv"; filename*=UTF-8''${korean}`,
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
