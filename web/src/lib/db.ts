import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7은 접속을 드라이버 어댑터로 한다.
 * URL은 .env 에만 있고 schema.prisma 에는 없다 (prisma.config.ts 참고).
 *
 * 개발 중 핫리로드로 커넥션이 계속 늘어나는 것을 막기 위해 전역에 하나만 둔다.
 */
const makeClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof makeClient>;
};

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
