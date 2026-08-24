import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const r = await prisma.employee.deleteMany({ where: { phone: { startsWith: "0109000" } } });
console.log(`데모 계정 ${r.count}명 삭제 (대표님 평가도 같이 지워집니다)`);
await prisma.$disconnect();
