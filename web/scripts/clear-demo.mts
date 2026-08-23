import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const r = await prisma.employee.deleteMany({ where: { phone: { startsWith: "0109000" } } });
await prisma.appState.updateMany({ where: { id: 1 }, data: { ratingPhase: "COLLECTING", openedAt: null, openedBy: null } });
console.log(`데모 계정 ${r.count}명 삭제, 국면을 평가 수집 중으로 되돌림`);
await prisma.$disconnect();
