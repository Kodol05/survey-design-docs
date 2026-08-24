import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** 시험용으로 넣은 대표님 평가를 지운다. 화면에서 직접 매긴 것도 같이 지워진다 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const r = await prisma.managerRating.deleteMany({});
console.log(`대표님 평가 ${r.count}칸을 지웠습니다`);

await prisma.$disconnect();
