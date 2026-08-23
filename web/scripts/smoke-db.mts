import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** DB 연결과 쓰기/읽기가 실제로 되는지 한 번 확인한다. 남는 데이터는 지운다. */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rows = await prisma.roster.createManyAndReturn({
  data: [{ name: "테스트", phone: "01000000000" }],
});
console.log("쓰기 OK:", rows[0].name, rows[0].phone);
console.log("읽기 OK: Roster", await prisma.roster.count(), "건");

await prisma.roster.deleteMany({ where: { phone: "01000000000" } });
console.log("정리 OK: Roster", await prisma.roster.count(), "건");

await prisma.$disconnect();
