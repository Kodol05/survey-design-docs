import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * 밖에서 볼 수 있게 올린다 — `npm run share`.
 *
 * ## 무엇을 하나
 *
 *   1. DB가 떠 있는지 본다
 *   2. 만들어 둔 것이 없으면 만든다
 *   3. 앱을 띄운다 (개발 서버가 아니라 **완성본**으로)
 *   4. Cloudflare 터널을 붙이고 **주소를 크게 찍는다**
 *
 * 하나만 빠져도 대표님 화면이 안 열리는데, 손으로 넷을 띄우면 그중 하나를
 * 잊는다. 실제로 시험하다 옛 서버를 붙잡고 한참 헤맸다 (2026-08-26).
 *
 * ## ⚠️ 이 창을 닫으면 끊긴다
 *
 * 이 PC가 그대로 서버다. 창을 닫거나 PC가 꺼지면 **대표님도 못 본다.**
 * 사내 서버로 옮기기 전까지는 그렇다 (2026-08-26 사용자 결정).
 *
 * ## ⚠️ 주소가 매번 바뀐다
 *
 * 무료 터널은 열 때마다 새 주소를 준다. 껐다 켜면 대표님께 새 주소를 다시
 * 보내드려야 한다. 고정하려면 도메인이 하나 있어야 한다.
 */

const PORT = process.env.PORT ?? "3000";
const CF =
  process.env.CLOUDFLARED ?? "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe";

const say = (s = "") => process.stdout.write(s + "\n");
const die = (s) => {
  say("\n  ✖ " + s + "\n");
  process.exit(1);
};

// ── 1. DB ──
say("\n  [1/4] DB를 확인합니다…");
const db = spawnSync("docker", ["exec", process.env.DB_CONTAINER ?? "survey-db", "pg_isready", "-U", "survey"], {
  encoding: "utf8",
});
if (db.status !== 0)
  die("DB가 안 떠 있습니다. 먼저 `npm run db:up` 을 돌려 주세요.");
say("        떠 있습니다.");

// ── 2. 만들어 둔 것 ──
say("\n  [2/4] 완성본을 만듭니다…");
if (!existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
  const b = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true });
  if (b.status !== 0) die("만들기가 실패했습니다.");
} else {
  say("        이미 만들어져 있습니다. 코드를 고치셨다면 `npm run build` 를 먼저 돌리세요.");
}

// ── 3. 앱 ──
say(`\n  [3/4] 앱을 ${PORT} 번에 띄웁니다…`);
const app = spawn("npm", ["run", "start"], {
  env: { ...process.env, PORT },
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});
app.stdout.on("data", (c) => process.stdout.write("        " + c));
app.stderr.on("data", (c) => process.stderr.write("        " + c));

// ── 4. 터널 ──
if (!existsSync(CF))
  die(
    `cloudflared 를 못 찾았습니다: ${CF}\n    다른 곳에 있다면 CLOUDFLARED 환경변수로 알려 주세요.`,
  );

say("\n  [4/4] 터널을 붙입니다… (20초쯤 걸립니다)");
const tunnel = spawn(CF, ["tunnel", "--url", `http://localhost:${PORT}`, "--no-autoupdate"], {
  stdio: ["ignore", "pipe", "pipe"],
});

let shown = false;
const watch = (chunk) => {
  const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m && !shown) {
    shown = true;
    say("");
    say("  ┌──────────────────────────────────────────────────────────────┐");
    say("  │  대표님께 보내실 주소                                        │");
    say("  └──────────────────────────────────────────────────────────────┘");
    say("");
    say("      " + m[0]);
    say("");
    say("  ⚠ 이 창을 닫거나 PC가 꺼지면 대표님도 못 보십니다.");
    say("  ⚠ 껐다 켜면 주소가 바뀝니다. 그때는 새 주소를 다시 보내주세요.");
    say("");
    say("  끝내려면 Ctrl+C 를 두 번 누르세요.");
    say("");
  }
};
tunnel.stdout.on("data", watch);
tunnel.stderr.on("data", watch);

const stop = () => {
  say("\n  내립니다…");
  tunnel.kill();
  app.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
tunnel.on("close", () => die("터널이 끊겼습니다."));
