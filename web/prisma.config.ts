import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Prisma 7 — 접속 URL은 schema.prisma 가 아니라 여기에 둔다.
// 실제 값은 .env 에만 있고 커밋되지 않는다.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
