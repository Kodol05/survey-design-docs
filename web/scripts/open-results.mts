import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
/** 개발용 — 국면을 결과 공개로 연다. 운영에서는 화면에서만 연다 (D-33). */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
await prisma.appState.upsert({
  where: { id: 1 },
  create: { id: 1, ratingPhase: "OPEN", openedAt: new Date(), openedBy: "dev" },
  update: { ratingPhase: "OPEN", openedAt: new Date(), openedBy: "dev" },
});
console.log("국면을 결과 공개로 열었습니다 (개발용)");
await prisma.$disconnect();
