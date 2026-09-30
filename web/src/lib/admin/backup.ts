import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

/**
 * DB 백업 (D-28 · 2026-08-25 구현).
 *
 * ## 왜 필요한가
 *
 * 데이터가 **한 곳에만** 있다. Docker 볼륨 하나다. 그 디스크가 죽으면 전원의
 * 응답·결과·대표님 평가가 사라지고, 되살릴 방법은 50명에게 다시 응시를 시키는
 * 것뿐이다. 그마저도 첫 응답과 다른 결과가 나온다.
 *
 * ## 두 겹
 *
 * | | 무엇을 막나 | 못 막는 것 |
 * |---|---|---|
 * | 서버 안 자동 덤프 | 실수로 지웠거나 데이터가 깨진 경우 | **서버가 죽으면 같이 죽는다** |
 * | 관리자가 손으로 받아 두기 | 서버가 죽는 경우 | 몇 달간 아무도 안 누르면 그 사이는 없다 |
 *
 * 서버 밖 자동 복사는 두지 않기로 했다 (2026-08-25 사용자 결정) — 받아 두는
 * 정도로 충분하다는 판단이다. 그래서 **실질적인 방어는 손으로 받는 쪽**이고,
 * 자동 덤프는 되돌리기용이다.
 *
 * ## 왜 컨테이너 안의 pg_dump 인가
 *
 * 호스트에 `pg_dump`가 없다. 깔아도 **서버의 PostgreSQL과 버전이 어긋나면
 * 덤프가 거부된다.** 컨테이너 것을 쓰면 그 DB가 뜬 바로 그 바이너리라 버전이
 * 항상 맞는다. 배포 단위가 docker-compose 하나인 것과도 맞는다 (D-04).
 *
 * 다른 환경에서는 `BACKUP_DUMP_CMD`로 통째로 바꿀 수 있다.
 */

/**
 * 백업 종류 (2026-09-30). 관리자 쪽과 설문 제출 쪽을 **따로 센다** —
 * 응시가 몰린 날 제출 백업이 관리자 백업을 밀어내지 않게.
 */
export type BackupKind = "admin" | "submit";

/** 몇 벌 남길지 */
export const KEEP_COUNT: Record<BackupKind, number> = { admin: 15, submit: 30 };

/** 관리자 화면: 이 시간이 안 지났으면 새로 뜨지 않는다 */
export const INTERVAL_HOURS = 24;

/** 설문 제출: 한 시간에 한 벌까지만 */
export const SUBMIT_INTERVAL_HOURS = 1;

export const BACKUP_DIR =
  process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");

/**
 * 여기서 백업을 받을 수 있는가.
 *
 * 백업은 **DB 옆에서 도는 서버**를 전제로 한다 — `pg_dump` 를 부르고 그
 * 결과를 디스크에 쓴다. 서버리스(Vercel 등)에는 **둘 다 없다.** 요청 하나
 * 처리하고 사라지므로 디스크에 쓴 것이 다음 요청 때 없고, 도커도 없다.
 *
 * 그런 곳에서는 **끄는 것이 맞다.** 되지도 않을 일을 화면 열 때마다
 * 시도하면 느려지기만 하고, 「백업이 없습니다」가 뜨면 관리자는 뭔가
 * 잘못된 줄 안다. 대신 그런 서비스는 **자기들이 백업을 해준다.**
 *
 * ⚠️ **사내 서버로 옮기면 저절로 켜진다.** `BACKUP_OFF` 를 안 주면 되고,
 * `VERCEL` 은 Vercel 이 스스로 넣는 값이라 사내에서는 없다. 되돌릴 것이
 * 없다는 뜻이다 (`13-backup-restore.md`).
 */
export function backupSupported(): boolean {
  if (process.env.BACKUP_OFF === "1") return false;
  if (process.env.VERCEL) return false;
  return true;
}

export type Backup = {
  name: string;
  kind: BackupKind;
  path: string;
  /** 압축된 크기 (바이트) */
  size: number;
  at: Date;
};

/** 이름으로 종류를 안다. 예전 이름(`survey-…`)은 관리자 백업이다 */
export function backupKind(name: string): BackupKind {
  return name.startsWith("submit-") ? "submit" : "admin";
}

/** 새것부터. 백업 폴더가 아직 없으면 빈 배열. `kind` 를 주면 그 종류만 */
export async function listBackups(kind?: BackupKind): Promise<Backup[]> {
  let names: string[];
  try {
    names = await readdir(BACKUP_DIR);
  } catch {
    return [];
  }

  const found = await Promise.all(
    names
      .filter((n) => n.endsWith(".sql.gz"))
      .filter((n) => !kind || backupKind(n) === kind)
      .map(async (name) => {
        const full = path.join(BACKUP_DIR, name);
        const s = await stat(full);
        return { name, kind: backupKind(name), path: full, size: s.size, at: s.mtime };
      }),
  );
  return found.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/**
 * 덤프를 뜬다.
 *
 * **`.part`로 쓰다가 다 끝나면 이름을 바꾼다.** 도중에 실패한 파일이
 * `.sql.gz`로 남으면 목록에서는 멀쩡한 백업으로 보이고, 정작 복구할 때
 * 반쪽짜리인 것을 알게 된다.
 */
export async function createBackup(kind: BackupKind = "admin"): Promise<Backup> {
  await mkdir(BACKUP_DIR, { recursive: true });

  const name = backupName(new Date(), kind);
  const full = path.join(BACKUP_DIR, name);
  const part = `${full}.part`;

  const [cmd, ...args] = dumpCommand();
  const child = spawn(cmd, args, { windowsHide: true });

  // stderr 를 모아 둔다 — 실패했을 때 이유가 여기에만 있다
  let err = "";
  child.stderr.on("data", (c: Buffer) => {
    err += c.toString();
  });

  const done = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`pg_dump 실패 (코드 ${code}) ${err.trim()}`)),
    );
  });

  try {
    await Promise.all([
      pipeline(child.stdout, createGzip(), createWriteStream(part)),
      done,
    ]);
  } catch (e) {
    // 파이프가 먼저 깨지면 pg_dump 는 아직 돌고 있다. 안 죽이면
    // 아무도 안 읽는 출력을 계속 뱉는 프로세스가 남는다
    child.kill();
    await rm(part, { force: true });
    throw e;
  }

  await rename(part, full);
  await pruneOld(kind);

  const s = await stat(full);
  return { name, kind, path: full, size: s.size, at: s.mtime };
}

/**
 * 마지막 백업이 오래됐으면 뜬다.
 *
 * 별도 스케줄러를 두지 않는다 — 「14일 지난 세션 정리」와 같은 방식으로,
 * 관리자가 대시보드를 열 때 확인한다. 프로세스를 하나 더 띄우고 살아 있는지
 * 지켜보는 것보다 이쪽이 이 규모에 맞는다.
 *
 * **절대 던지지 않는다.** 백업이 안 됐다고 대시보드가 안 열리면 안 된다.
 * 실패는 화면의 「마지막 백업」 시각이 그대로인 것으로 드러난다.
 */
export async function ensureBackup(): Promise<Backup | null> {
  if (!backupSupported()) return null;
  try {
    const [latest] = await listBackups("admin");
    if (
      latest &&
      Date.now() - latest.at.getTime() < INTERVAL_HOURS * 3_600_000
    ) {
      return latest;
    }
    return await createBackup("admin");
  } catch {
    return null;
  }
}

/** 한 프로세스 안에서 제출 백업이 겹쳐 뜨지 않게 */
let submitRunning = false;

/**
 * 설문 제출 뒤 백업 (2026-09-30). 관리자가 한동안 안 들어와도 응답이 백업에
 * 남게 한다. 마지막 제출 백업이 한 시간 안이면 건너뛴다. `ensureBackup` 처럼
 * **절대 던지지 않는다** — 제출은 이미 끝났다.
 */
export async function backupAfterSubmit(): Promise<void> {
  if (!backupSupported() || submitRunning) return;
  submitRunning = true;
  try {
    const [latest] = await listBackups("submit");
    if (
      latest &&
      Date.now() - latest.at.getTime() < SUBMIT_INTERVAL_HOURS * 3_600_000
    ) {
      return;
    }
    await createBackup("submit");
  } catch {
    // 다음 제출 때 다시 시도된다
  } finally {
    submitRunning = false;
  }
}

/** 같은 종류 안에서 오래된 것부터 지운다 */
async function pruneOld(kind: BackupKind): Promise<void> {
  const all = await listBackups(kind);
  await Promise.all(
    all.slice(KEEP_COUNT[kind]).map((b) => rm(b.path, { force: true })),
  );
}

/**
 * "survey-2026-08-25-2313.sql.gz" (관리자) · "submit-2026-08-25-2313.sql.gz"
 * (설문 제출) — 어느 시점, 어느 쪽 것인지 이름만 보고 안다
 */
export function backupName(d: Date, kind: BackupKind = "admin"): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(d)
    .reduce<Record<string, string>>(
      (a, x) => ({ ...a, [x.type]: x.value }),
      {},
    );
  const prefix = kind === "submit" ? "submit" : "survey";
  return `${prefix}-${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}.sql.gz`;
}

/**
 * `--clean --if-exists` 는 복구할 때 **기존 표를 지우고 다시 만든다**는 뜻이다.
 * 없으면 이미 표가 있는 DB에 부으려 할 때 전부 「already exists」로 막힌다.
 *
 * `--no-owner --no-privileges` 는 소유자·권한 구문을 빼는 것이다. 다른 서버로
 * 옮길 때 그 서버에 같은 역할 이름이 없으면 거기서 걸린다.
 */
function dumpCommand(): string[] {
  const custom = process.env.BACKUP_DUMP_CMD?.trim();
  if (custom) return custom.split(/\s+/);

  const url = new URL(process.env.DATABASE_URL ?? "");
  return [
    "docker",
    "exec",
    process.env.DB_CONTAINER ?? "survey-db",
    "pg_dump",
    "-U",
    decodeURIComponent(url.username),
    "-d",
    url.pathname.slice(1),
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
  ];
}
