import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadItemFile } from "../src/lib/items/load";

/**
 * 문항 **문구만** DB 에 반영한다 — 응답은 건드리지 않는다.
 *
 * ## 왜 이게 따로 필요한가
 *
 * seed 는 응시 기록이 있으면 멈춘다(문항을 갈아엎으면 응답 근거가 사라지니까).
 * 그런데 이미 응답이 쌓인 뒤에 **문구만 다듬고 싶을 때**가 있다. 이 스크립트는
 * `data/items/v1.yaml` 의 문구·역채점 여부를 code 기준으로 기존 Item 에 덮어쓸
 * 뿐, 응답·결과·세션은 그대로 둔다.
 *
 * ⚠️ 채점에 쓰는 값(scale·subscale·축)까지 바꾸려면 이 스크립트로는 부족하다 —
 *    그건 문항 수정 화면이나 별도 경로로 한다. 여기서는 content·reverse 만 맞춘다.
 * ⚠️ 지난 결과지는 채점 시점 값으로 고정돼 그대로지만, 다시 채점하면 값이
 *    달라질 수 있다(문구만 바꾸면 대개 그대로).
 *
 *   사용:  npx tsx scripts/apply-item-content.mts [env파일]
 *
 *   - env파일을 주면 그 파일을 읽는다(예: `vercel env pull .env.vercel` 로 받은 파일 — `.env.production` 이라는 이름은 쓰지 않는다. next start 가 자동으로 읽어 로컬 서버가 운영 DB 를 보게 된다).
 *     안 주면 기본 `.env`.
 *   - 접속 주소는 DATABASE_URL 을 쓰되, 그 값이 없거나 가려져 있으면
 *     (`vercel env pull` 은 URL 을 가리고 개별 값만 채워준다) DATABASE_PG* 개별
 *     값으로 **직접(unpooled)** 주소를 만들어 쓴다. 쓰기라서 직접 연결이 낫다.
 */

const envFile = process.argv[2];
loadEnv(envFile ? { path: envFile } : {});

const e = process.env;
const looksLikeUrl = (v?: string) => !!v && /^postgres(ql)?:\/\//i.test(v);

let url = e.DATABASE_URL;
if (!looksLikeUrl(url)) {
  const user = e.DATABASE_PGUSER;
  const pass = e.DATABASE_PGPASSWORD;
  const host = e.DATABASE_PGHOST_UNPOOLED ?? e.DATABASE_PGHOST;
  const db = e.DATABASE_PGDATABASE;
  if (user && pass && host && db)
    url = `postgresql://${user}:${pass}@${host}/${db}?sslmode=require`;
}
if (!looksLikeUrl(url))
  throw new Error(
    "접속 주소를 찾지 못했습니다. env 파일에 DATABASE_URL 또는 DATABASE_PG* 값이 있어야 합니다.",
  );

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const a = await prisma.assessment.findFirst({
  where: { isActive: true },
  orderBy: { version: "desc" },
});
if (!a) {
  console.error("활성 문항 세트가 없습니다. 먼저 seed 하세요.");
  process.exit(1);
}

const file = loadItemFile("data/items/v1.yaml", { strictCount: true });

let changed = 0;
let missing = 0;
for (const it of file.items) {
  const cur = await prisma.item.findFirst({
    where: { assessmentId: a.id, code: it.code },
    select: { id: true, content: true, isReverse: true },
  });
  if (!cur) {
    missing += 1;
    continue;
  }
  const reverse = Boolean((it as { reverse?: boolean }).reverse);
  if (cur.content === it.content && cur.isReverse === reverse) continue;
  await prisma.item.update({
    where: { id: cur.id },
    data: { content: it.content, isReverse: reverse },
  });
  changed += 1;
}

console.log(
  JSON.stringify({ version: a.version, changed, missing, total: file.items.length }),
);
await prisma.$disconnect();
