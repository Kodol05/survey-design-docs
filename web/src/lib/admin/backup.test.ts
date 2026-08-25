import { describe, expect, it } from "vitest";
import { INTERVAL_HOURS, KEEP_COUNT, backupName } from "./backup";

/*
  실제 덤프는 여기서 뜨지 않는다 — Docker가 돌고 있어야 하고, 테스트가
  DB 상태에 얹히면 CI에서 이유 없이 빨개진다. 복구가 실제로 되는지는
  `docs/13-backup-restore.md` §5에 한 번 확인해 적어 뒀다.

  여기서는 **파일 이름과 상수**만 본다. 이름이 흐트러지면 「어느 것이 최신인가」를
  이름으로 알 수 없게 되고, 정렬도 어긋난다.
*/

describe("백업 파일 이름", () => {
  const at = (iso: string) => backupName(new Date(iso));

  it("한국 시간으로 적는다 — 서버 시간대와 무관해야 한다", () => {
    // 2026-08-25 14:09 UTC = 한국 23:09
    expect(at("2026-08-25T14:09:00Z")).toBe("survey-2026-08-25-2309.sql.gz");
  });

  it("자정을 넘기면 날짜도 한국 기준으로 넘어간다", () => {
    // UTC로는 25일 저녁이지만 한국은 이미 26일 새벽
    expect(at("2026-08-25T16:30:00Z")).toBe("survey-2026-08-26-0130.sql.gz");
  });

  it("한 자리 수에 0을 붙인다 — 안 그러면 이름순 정렬이 어긋난다", () => {
    expect(at("2026-01-02T00:04:00Z")).toBe("survey-2026-01-02-0904.sql.gz");
  });

  it("이름순이 곧 시간순이다", () => {
    const names = [
      at("2026-08-25T02:00:00Z"),
      at("2026-01-02T00:04:00Z"),
      at("2026-08-25T14:09:00Z"),
    ];
    expect([...names].sort()).toEqual([
      "survey-2026-01-02-0904.sql.gz",
      "survey-2026-08-25-1100.sql.gz",
      "survey-2026-08-25-2309.sql.gz",
    ]);
  });

  it("`.sql.gz`로 끝난다 — 목록이 이 확장자로 파일을 고른다", () => {
    expect(at("2026-08-25T14:09:00Z")).toMatch(/\.sql\.gz$/);
  });
});

describe("보관 규칙", () => {
  it("하루 한 벌 · 14벌이면 2주치가 남는다", () => {
    expect((KEEP_COUNT * INTERVAL_HOURS) / 24).toBe(14);
  });
});
