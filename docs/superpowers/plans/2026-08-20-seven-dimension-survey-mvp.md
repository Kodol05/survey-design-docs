# 7차원 성향 설문 — MVP 구현 계획 (구판)

> ⚠️ **이 계획서는 `2026-08-23-mvp-v2.md`로 대체됐습니다.**
>
> 2026-08-23 기준으로 어긋난 것 — 직무능력 3가지 신설, 문항 105 → 114, 로그인이 이름+전화번호에서 휴대폰번호+비밀번호로 변경, 성향×직무능력 상관 화면 추가, Task 23의 30일 기준 제거.
>
> **버리지 않고 남겨둡니다.** Task 1·2·4·5·6·8·9·10·11은 v2에서 그대로 재사용하며, 상세 절차와 테스트 명세가 여기에만 있습니다.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사내 구성원이 웹에서 7차원 성향 설문을 응시하고, 제출 즉시 본인 결과를 확인하며, 관리자는 전체 응시자와 개인별 결과를 조회할 수 있는 시스템을 만든다.

**Architecture:** Next.js 16 App Router 단일 애플리케이션. 채점은 DB·네트워크에 의존하지 않는 순수 함수로 격리해 단위 테스트로 검증한다. 문항은 코드가 아닌 YAML 파일로 관리하고 seed 스크립트로 DB에 주입한다. 인증은 `AuthProvider` 인터페이스 뒤에 격리해 나중에 사번+비밀번호나 SSO로 교체할 수 있게 한다.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL 16 · Prisma · Tailwind CSS · Recharts · Vitest · Docker Compose

**Spec:**
- `docs/00-design-notes.md` — 의사결정 근거, 데이터 모델, 척도 구조
- `docs/01-features-ux.md` — 화면·상호작용·기능 명세

---

## Global Constraints

프로젝트 전체에 적용된다. 모든 태스크의 요구사항에 암묵적으로 포함된다.

| # | 제약 | 값 |
|---|---|---|
| G-01 | Node.js | 20 이상 (개발 환경 v24.16.0) |
| G-02 | 응답 척도 | **7점 리커트.** 값 `1`~`7` |
| G-03 | 역채점 공식 | **`8 - value`** |
| G-04 | 척도 | 7개 — `NS` `HA` `RD` `PS` `SD` `CO` `ST` |
| G-05 | ST 하위척도 | **`ST1` `ST2` `ST3` 세 개만.** ST4·ST5는 현행 모델에 없음 |
| G-06 | 문항 수 | 105문항 = 7섹션 (12·13·15·15·16·17·17) |
| G-07 | 검사 명칭 | `7차원 성향 설문`. **"TCI", "기질 및 성격검사" 문자열 사용 금지** |
| G-08 | 채점 위치 | **서버 전용.** 클라이언트는 점수 계산에 관여하지 않음 |
| G-09 | 결과 표시 층위 | **7대척도까지만.** 하위척도 점수는 DB 저장·관리자 전용 |
| G-10 | 금지 표현 | "당신은 ~한 사람", "높음/낮음", "미성숙", "취약", "개선이 필요" |
| G-11 | 구간 명칭 | `upper` / `middle` / `lower` (`high`/`low` 금지) |
| G-12 | 응시 횟수 | **재응시 허용 (D-10 변경).** 결과 화면에 재검사 버튼 **상시 활성**(기간·횟수 제한 없음). 이전 회차 결과는 삭제하지 않고 보존, `/me` 상단에서 회차 선택 조회. 관리자 목록·분포는 최신 회차 기준 |
| G-13 | 응시 의무 | 화면에 "필수" 표현 금지. 독려·리마인더·마감 카운트다운 기능 없음 |
| G-14 | 반응형 하한 | **1024px.** 고정 px 폭 금지, `clamp()`/`max-width`/`%` 사용 |
| G-15 | 라디오 구현 | 네이티브 `<input type="radio">` + `<fieldset>`/`<legend>`. div 커스텀 금지 |
| G-16 | 타이머 | 응시 화면에 경과 시간 표시 금지 |
| G-22 | 감사 로그 | ❌ **폐지 (D-29, 2026-08-21).** `AuditLog` 모델·`lib/audit.ts`·`recordAudit()`·`/admin/audit` 전부 만들지 않음. Task 14·18·20·22의 관련 코드 삭제 |
| G-23 | 관리자 사원 추가 | ❌ **폐지 (D-30).** 로그인 시 자동 생성되므로 불필요. **미응시자 집계 불가** → 대시보드는 완료·진행중 두 숫자만 |
| G-24 | 로그인 잠금 | **5분 내 10회**(사원) / **5분 내 5회**(관리자). 잠금 해제 5분. 관리자 초기 비밀번호 변경 강제는 **없음** |
| G-17 | 권한 검증 | 모든 API 핸들러·서버 컴포넌트 첫 줄. 프론트 숨김은 보안이 아님 |
| G-18 | 인증 분리 | **사원은 이름+전화번호(`/login`), 관리자는 아이디+비밀번호(`/admin/login`).** 관리자 비밀번호는 bcrypt 해시. 관리자 계정은 seed로만 생성, 화면에서 생성 불가 |
| G-19 | 관리자 초기 비밀번호 | `passwordChangedAt`이 null이면 `/admin/password`로 강제 이동. 변경 전 다른 관리자 화면 접근 차단 |
| G-20 | 통계 표시 하한 | 분포·평균·산점도·오버레이는 **응시 완료 30명 이상**에서만. 미만이면 비활성 + 안내 |
| G-21 | 상관 추론 금지 | 산점도에 **상관계수·회귀선·추세선 표시 금지.** 사실 나열만, 추론은 하지 않음 |

---

## File Structure

```
820/
├─ app/
│  ├─ layout.tsx                          루트 레이아웃
│  ├─ page.tsx                            랜딩 + 고지문
│  ├─ login/page.tsx                      로그인
│  ├─ test/
│  │  ├─ page.tsx                         응시 시작/이어하기 분기
│  │  └─ [section]/page.tsx               섹션 응시
│  ├─ me/page.tsx                         본인 결과
│  ├─ admin/
│  │  ├─ page.tsx                         관리자 홈(목록으로 리다이렉트)
│  │  └─ employees/
│  │     ├─ page.tsx                      사원 목록
│  │     └─ [id]/page.tsx                 개인 상세 + 감사 로그
│  └─ api/
│     ├─ auth/login/route.ts
│     ├─ auth/logout/route.ts
│     └─ sessions/
│        ├─ route.ts                      POST 세션 시작
│        ├─ current/route.ts              GET 진행 상황
│        └─ [id]/
│           ├─ sections/[n]/route.ts      PUT 섹션 배치 저장
│           └─ submit/route.ts            POST 제출→채점
├─ lib/
│  ├─ auth/
│  │  ├─ provider.ts                      AuthProvider 인터페이스 + 활성 구현 선택
│  │  ├─ name-phone.ts                    이름+전화번호 구현
│  │  └─ session.ts                       쿠키 세션 발급/검증/requireAuth/requireAdmin
│  ├─ scoring/
│  │  ├─ types.ts                         채점 도메인 타입
│  │  ├─ score.ts                         순수 채점 함수
│  │  └─ score.test.ts
│  ├─ quality/
│  │  ├─ types.ts
│  │  ├─ quality.ts                       응답 품질 지표
│  │  └─ quality.test.ts
│  ├─ items/
│  │  ├─ schema.ts                        YAML 스키마(Zod)
│  │  ├─ load.ts                          파일 → ItemDef[] 로더 + 검증
│  │  └─ load.test.ts
│  ├─ audit.ts                            감사 로그 기록
│  └─ db.ts                               Prisma 클라이언트 싱글턴
├─ components/
│  ├─ LikertGroup.tsx                     7점 라디오 그룹
│  ├─ ItemRow.tsx                         문항 한 줄 (표시 전용)
│  ├─ SectionForm.tsx                     섹션 상태 보유 + 자동저장
│  ├─ ProgressHeader.tsx
│  └─ result/
│     ├─ ScaleRadar.tsx
│     └─ ScaleBars.tsx
├─ data/items/
│  ├─ ns.yaml  ha.yaml  rd.yaml  ps.yaml  sd.yaml  co.yaml  st.yaml
│  └─ meta.yaml                           섹션 순서·문항 수 정의
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ docker-compose.yml                     개발용 postgres
├─ Dockerfile                             프로덕션 standalone 이미지
└─ vitest.config.ts
```

**책임 경계** — `lib/scoring`은 DB를 모른다. `lib/quality`는 응답 로그만 받는다. `lib/items`는 파일만 읽는다. `components/ItemRow`는 값과 콜백만 받는 표시 전용이며 상태는 `SectionForm`에만 있다.

---

## Task 1: 프로젝트 스캐폴드 + PostgreSQL + Prisma 스키마

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `docker-compose.yml`, `.env`, `.gitignore`
- Create: `prisma/schema.prisma`, `lib/db.ts`, `vitest.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces: `prisma` 클라이언트 타입 전체, `lib/db.ts`의 `export const db: PrismaClient`

- [ ] **Step 1: Docker 설치 확인**

Run: `docker --version`

설치돼 있지 않으면 Docker Desktop을 먼저 설치한다 (https://www.docker.com/products/docker-desktop/). 설치 후 Docker Desktop을 실행한 상태에서 위 명령이 버전을 출력해야 한다.

Expected: `Docker version 2x.x.x, build ...`

- [ ] **Step 2: Next.js 프로젝트 생성**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
```

- [ ] **Step 3: 의존성 추가**

```bash
npm install @prisma/client zod yaml recharts
npm install -D prisma vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom tsx
```

- [ ] **Step 4: `next.config.ts` 작성**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 5: `vitest.config.ts` 작성**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest",
"db:push": "prisma db push",
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 6: `docker-compose.yml` 작성**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: survey
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: survey
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 7: `.env` 작성**

```
DATABASE_URL="postgresql://survey:${POSTGRES_PASSWORD}@localhost:5432/survey?schema=public"
SESSION_COOKIE_NAME="sds_session"
SESSION_TTL_HOURS="12"
```

`.gitignore`에 `.env`가 포함돼 있는지 확인한다. 없으면 추가한다.

- [ ] **Step 8: DB 컨테이너 기동**

```bash
docker compose up -d db
```

Run: `docker compose ps`
Expected: `db` 서비스가 `running` 상태

- [ ] **Step 9: `prisma/schema.prisma` 작성**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum ItemStatus {
  DRAFT
  REVIEW
  ACTIVE
  RETIRED
}

enum SessionStatus {
  IN_PROGRESS
  COMPLETED
  ABANDONED
}

model Employee {
  id           String        @id @default(cuid())
  name         String
  phone        String
  employeeNo   String?       @unique
  department   String?
  position     String?
  role         Role          @default(USER)
  // D-05: 관리자만 채운다. 사원은 둘 다 null.
  loginId          String?   @unique
  passwordHash     String?
  // 비어 있으면 초기 비밀번호 상태 → 최초 로그인 시 변경 강제
  passwordChangedAt DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  authSessions AuthSession[]
  testSessions TestSession[]

  @@unique([name, phone])
}

model AuthSession {
  id         String   @id @default(cuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  @@index([employeeId])
}

model Assessment {
  id        String        @id @default(cuid())
  version   Int           @unique
  title     String
  itemCount Int
  isActive  Boolean       @default(false)
  createdAt DateTime      @default(now())
  items     Item[]
  sessions  TestSession[]
}

model Item {
  id            String     @id @default(cuid())
  assessmentId  String
  assessment    Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  code          String
  orderNo       Int
  section       Int
  scale         String
  subscale      String
  content       String
  isReverse     Boolean    @default(false)
  status        ItemStatus @default(ACTIVE)
  sourceRef     String
  antonymPairId String?
  responses     Response[]

  @@unique([assessmentId, code])
  @@unique([assessmentId, orderNo])
  @@index([assessmentId, section])
}

model TestSession {
  id                String        @id @default(cuid())
  employeeId        String
  employee          Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  assessmentId      String
  assessment        Assessment    @relation(fields: [assessmentId], references: [id])
  assessmentVersion Int
  status            SessionStatus @default(IN_PROGRESS)
  departmentAtTime  String?
  startedAt         DateTime      @default(now())
  completedAt       DateTime?
  durationSec       Int?
  responses         Response[]
  result            Result?
  qualityFlag       QualityFlag?

  @@index([employeeId, status])
}

model Response {
  id           String      @id @default(cuid())
  sessionId    String
  session      TestSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  itemId       String
  item         Item        @relation(fields: [itemId], references: [id])
  value        Int
  elapsedMs    Int
  changedCount Int         @default(0)
  answeredAt   DateTime    @default(now())

  @@unique([sessionId, itemId])
}

model Result {
  id           String      @id @default(cuid())
  sessionId    String      @unique
  session      TestSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  scoresJson   Json
  snapshotJson Json
  normBasisN   Int?
  computedAt   DateTime    @default(now())
}

model QualityFlag {
  id                String      @id @default(cuid())
  sessionId         String      @unique
  session           TestSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  meanElapsedMs     Int
  fastCount         Int
  antonymAgreement  Float
  flag              String
  computedAt        DateTime    @default(now())
}

model AuditLog {
  id               String   @id @default(cuid())
  actorId          String
  action           String
  targetEmployeeId String?
  // 삭제 시점의 이름 스냅샷. 사원을 지우면 targetEmployeeId로 조회할 대상이
  // 없어져 "누구를 지웠는지" 알 수 없게 되므로, DELETE_EMPLOYEE에서 반드시 채운다.
  targetName       String?
  createdAt        DateTime @default(now())

  @@index([targetEmployeeId])
  @@index([actorId])
}
```

- [ ] **Step 10: 스키마 반영 + 클라이언트 생성**

```bash
npx prisma db push
npx prisma generate
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 11: `lib/db.ts` 작성**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 12: 기동 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000`에서 기본 페이지가 뜬다. 확인 후 종료.

- [ ] **Step 13: 커밋**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 16 + PostgreSQL + Prisma schema"
```

---

## Task 2: 문항 파일 포맷 + 로더

**Files:**
- Create: `lib/items/schema.ts`, `lib/items/load.ts`, `lib/items/load.test.ts`
- Create: `data/items/meta.yaml`
- Create: `data/items/__fixture__.yaml` (테스트용)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type ItemDef = { code: string; scale: ScaleCode; subscale: string; content: string; isReverse: boolean; sourceRef: string; antonymPairId: string | null }`
  - `type ScaleCode = 'NS'|'HA'|'RD'|'PS'|'SD'|'CO'|'ST'`
  - `type ScaleFile = { scale: ScaleCode; scaleNameKo: string; section: number; subscales: SubscaleDef[]; items: ItemDef[] }`
  - `function loadScaleFile(path: string): ScaleFile` — 검증 실패 시 throw
  - `function loadAllItems(dir: string): ScaleFile[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/items/load.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseScaleFile } from './load'

const VALID = `
scale: NS
scaleNameKo: 자극추구
section: 1
subscales:
  - code: NS1
    nameKo: 탐색적 흥분 / 관습적 안정성
    sourceRef: "TCI-RS facet 정의 (이숙희·황순택 2011)"
items:
  - code: NS1-01
    subscale: NS1
    content: 나는 가보지 않은 길로 돌아가 보는 것을 좋아한다
    reverse: false
    sourceRef: "IPIP Variety-seeking 구성개념"
    antonymPair: NS1-02
  - code: NS1-02
    subscale: NS1
    content: 나는 늘 다니던 익숙한 길로만 다니는 편이다
    reverse: true
    sourceRef: "IPIP Variety-seeking 구성개념 (역방향)"
    antonymPair: NS1-01
`

describe('parseScaleFile', () => {
  it('유효한 파일을 파싱한다', () => {
    const result = parseScaleFile(VALID)
    expect(result.scale).toBe('NS')
    expect(result.section).toBe(1)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].isReverse).toBe(false)
    expect(result.items[1].isReverse).toBe(true)
    expect(result.items[0].antonymPairId).toBe('NS1-02')
  })

  it('알 수 없는 척도 코드를 거부한다', () => {
    const bad = VALID.replace('scale: NS', 'scale: XX')
    expect(() => parseScaleFile(bad)).toThrow()
  })

  it('items가 참조하는 subscale이 선언되지 않았으면 거부한다', () => {
    const bad = VALID.replace('subscale: NS1\n    content: 나는 가보지', 'subscale: NS9\n    content: 나는 가보지')
    expect(() => parseScaleFile(bad)).toThrow(/NS9/)
  })

  it('sourceRef가 비면 거부한다', () => {
    const bad = VALID.replace('sourceRef: "IPIP Variety-seeking 구성개념"', 'sourceRef: ""')
    expect(() => parseScaleFile(bad)).toThrow()
  })

  it('antonymPair가 존재하지 않는 문항을 가리키면 거부한다', () => {
    const bad = VALID.replace('antonymPair: NS1-02\n', 'antonymPair: NS1-99\n')
    expect(() => parseScaleFile(bad)).toThrow(/NS1-99/)
  })

  it('문항 코드가 중복되면 거부한다', () => {
    const bad = VALID.replace('code: NS1-02', 'code: NS1-01')
    expect(() => parseScaleFile(bad)).toThrow(/중복/)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/items/load.test.ts`
Expected: FAIL — `Failed to resolve import "./load"`

- [ ] **Step 3: `lib/items/schema.ts` 작성**

```ts
import { z } from 'zod'

export const SCALE_CODES = ['NS', 'HA', 'RD', 'PS', 'SD', 'CO', 'ST'] as const
export type ScaleCode = (typeof SCALE_CODES)[number]

export const subscaleSchema = z.object({
  code: z.string().min(1),
  nameKo: z.string().min(1),
  sourceRef: z.string().min(1),
})

export const rawItemSchema = z.object({
  code: z.string().regex(/^[A-Z]{2}\d-\d{2}$/, 'code는 NS1-01 형식이어야 합니다'),
  subscale: z.string().min(1),
  content: z.string().min(1),
  reverse: z.boolean(),
  sourceRef: z.string().min(1, 'sourceRef는 비울 수 없습니다'),
  antonymPair: z.string().nullable().optional(),
})

export const rawScaleFileSchema = z.object({
  scale: z.enum(SCALE_CODES),
  scaleNameKo: z.string().min(1),
  section: z.number().int().min(1).max(7),
  subscales: z.array(subscaleSchema).min(1),
  items: z.array(rawItemSchema).min(1),
})

export type SubscaleDef = z.infer<typeof subscaleSchema>

export type ItemDef = {
  code: string
  scale: ScaleCode
  subscale: string
  content: string
  isReverse: boolean
  sourceRef: string
  antonymPairId: string | null
}

export type ScaleFile = {
  scale: ScaleCode
  scaleNameKo: string
  section: number
  subscales: SubscaleDef[]
  items: ItemDef[]
}
```

- [ ] **Step 4: `lib/items/load.ts` 작성**

```ts
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { rawScaleFileSchema, type ScaleFile, type ItemDef } from './schema'

export function parseScaleFile(source: string): ScaleFile {
  const raw = rawScaleFileSchema.parse(parseYaml(source))

  const declared = new Set(raw.subscales.map((s) => s.code))
  const codes = new Set<string>()

  for (const item of raw.items) {
    if (codes.has(item.code)) {
      throw new Error(`문항 코드 중복: ${item.code}`)
    }
    codes.add(item.code)

    if (!declared.has(item.subscale)) {
      throw new Error(`선언되지 않은 하위척도 참조: ${item.subscale} (문항 ${item.code})`)
    }
  }

  for (const item of raw.items) {
    if (item.antonymPair && !codes.has(item.antonymPair)) {
      throw new Error(`존재하지 않는 antonymPair 참조: ${item.antonymPair} (문항 ${item.code})`)
    }
  }

  const items: ItemDef[] = raw.items.map((item) => ({
    code: item.code,
    scale: raw.scale,
    subscale: item.subscale,
    content: item.content,
    isReverse: item.reverse,
    sourceRef: item.sourceRef,
    antonymPairId: item.antonymPair ?? null,
  }))

  return {
    scale: raw.scale,
    scaleNameKo: raw.scaleNameKo,
    section: raw.section,
    subscales: raw.subscales,
    items,
  }
}

export function loadScaleFile(filePath: string): ScaleFile {
  return parseScaleFile(readFileSync(filePath, 'utf-8'))
}

export function loadAllItems(dir: string): ScaleFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') && f !== 'meta.yaml' && !f.startsWith('__'))
    .map((f) => loadScaleFile(path.join(dir, f)))
    .sort((a, b) => a.section - b.section)
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/items/load.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 6: `data/items/meta.yaml` 작성**

```yaml
assessment:
  version: 1
  title: 7차원 성향 설문
  itemCount: 105

sections:
  - section: 1
    scale: NS
    scaleNameKo: 자극추구
    itemCount: 12
  - section: 2
    scale: HA
    scaleNameKo: 위험회피
    itemCount: 13
  - section: 3
    scale: RD
    scaleNameKo: 사회적 민감성
    itemCount: 15
  - section: 4
    scale: PS
    scaleNameKo: 인내력
    itemCount: 15
  - section: 5
    scale: SD
    scaleNameKo: 자율성
    itemCount: 16
  - section: 6
    scale: CO
    scaleNameKo: 연대감
    itemCount: 17
  - section: 7
    scale: ST
    scaleNameKo: 자기초월
    itemCount: 17
```

- [ ] **Step 7: 커밋**

```bash
git add lib/items data/items/meta.yaml
git commit -m "feat: item YAML schema and loader with referential validation"
```

---

## Task 3: 문항 초안 105개 작성

이 태스크는 코드가 아니라 **콘텐츠 산출물**을 만든다. 검증은 Task 2의 로더와 아래 수용 기준으로 한다.

**Files:**
- Create: `data/items/ns.yaml` `ha.yaml` `rd.yaml` `ps.yaml` `sd.yaml` `co.yaml` `st.yaml`
- Create: `lib/items/coverage.test.ts`

**Interfaces:**
- Consumes: Task 2의 `loadAllItems`, `ItemDef`, `ScaleFile`
- Produces: 7개 YAML 파일. 총 105문항

### 작업 절차 (문항 1개당)

```
1. 하위척도의 한국판 공식 명칭을 확인한다 (아래 표)
   예: ST3 = "영성 수용 / 합리적 유물론"
        ↓
2. 양극 명칭에서 두 방향을 읽는다
   정방향 = "영성 수용" · 역방향 = "합리적 유물론"
        ↓
3. 그 방향의 구체적 행동·태도를 한 문장으로 진술한다
   - 1인칭 서술문, "나는 ~한 편이다" 계열
   - 한 문장에 한 가지만
   - 부정어는 문항당 최대 1개 (이중부정 금지)
   - 종교·정치·성역할·건강 관련 직접 언급 금지
        ↓
4. sourceRef에 근거를 적는다
   - 필수: 어느 하위척도 정의에서 나왔는지
   - 선택: IPIP 프록시 척도명(내용 참고했을 때만)
        ↓
5. 원문항과 나란히 놓았을 때 같은 문장으로 보이는지 자문한다
   그렇다면 다시 쓴다
```

### 하위척도 구성 — 한국판 TCI-RS 공식 명칭

| 척도 | 섹션 | 문항 | 하위척도 (양극) |
|---|---|---|---|
| NS 자극추구 | 1 | 12 | NS1 탐색적 흥분/관습적 안정성 · NS2 충동성/심사숙고 · NS3 무절제/절제 · NS4 자유분방/질서정연 |
| HA 위험회피 | 2 | 13 | HA1 예기불안 · HA2 불확실성에 대한 두려움 · HA3 낯선 사람에 대한 수줍음 · HA4 쉽게 지침 |
| RD 사회적 민감성 | 3 | 15 | RD1 정서적 감수성 · RD2 정서적 개방성 · RD3 친밀감/거리두기 · RD4 의존/독립 |
| PS 인내력 | 4 | 15 | PS1 근면 · PS2 끈기 · PS3 성취에 대한 야망 · PS4 완벽주의 |
| SD 자율성 | 5 | 16 | SD1 책임감/책임전가 · SD2 목적의식 · SD3 유능감/무능감 · SD4 자기수용/자기불만 · SD5 자기일치 |
| CO 연대감 | 6 | 17 | CO1 타인수용 · CO2 공감/둔감 · CO3 이타성/이기성 · CO4 관대함/복수심 · CO5 공평/편파 |
| ST 자기초월 | 7 | 17 | ST1 창조적 자기망각/자의식 · ST2 우주만물과의 일체감 · ST3 영성 수용/합리적 유물론 |

### 문항 배분 규칙

각 하위척도에 문항을 균등 배분하고, 나머지는 척도 내 앞 하위척도부터 하나씩 더 준다.

| 척도 | 하위척도 수 | 배분 |
|---|---|---|
| NS | 4 | 3·3·3·3 |
| HA | 4 | 4·3·3·3 |
| RD | 4 | 4·4·4·3 |
| PS | 4 | 4·4·4·3 |
| SD | 5 | 4·3·3·3·3 |
| CO | 5 | 4·4·3·3·3 |
| ST | 3 | 6·6·5 |

### 역채점 비율

각 척도에서 **역채점 문항이 30~40%** 가 되게 한다. 105문항 기준 32~42개.

> **비율 근거**: 성격검사의 표준 관행이다. NEO-PI-R, Big Five 계열, IPIP 등이 통상 이 선을 쓴다. 검토 중 "역채점이 신뢰도를 떨어뜨린다"는 비판(요인분석에서 역채점 문항끼리 뭉침, 부정문 오독)도 확인했으나 **그대로 유지 확정** — 응답 품질 지표 두 축 중 하나(반대 문항 일치도, Task 6)가 여기에 전적으로 의존하고, 없으면 전 문항 동일응답자를 걸러낼 수단이 사라진다.
>
> 위험은 문항 작성으로 줄인다 — 부정어는 문항당 최대 1개(위 절차 3단계), 억지 부정문 대신 하위척도 **양극 명칭에 이미 있는 반대편 개념**을 쓴다.

역채점 문항은 가능한 한 정방향 문항과 `antonymPair`로 짝지어 둔다. Task 6의 품질 지표가 이 쌍을 사용한다.

### 파일 형식 예시 — `data/items/st.yaml` 앞부분

```yaml
scale: ST
scaleNameKo: 자기초월
section: 7
subscales:
  - code: ST1
    nameKo: 창조적 자기망각 / 자의식
    sourceRef: "TCI-RS 하위척도 정의 (이숙희·황순택, 한국심리학회지: 임상 28(2))"
  - code: ST2
    nameKo: 우주만물과의 일체감
    sourceRef: "TCI-RS 하위척도 정의 (이숙희·황순택, 한국심리학회지: 임상 28(2))"
  - code: ST3
    nameKo: 영성 수용 / 합리적 유물론
    sourceRef: "TCI-RS 하위척도 정의 (이숙희·황순택, 한국심리학회지: 임상 28(2))"
items:
  - code: ST1-01
    subscale: ST1
    content: 무언가에 몰두하면 시간이 얼마나 지났는지 잊어버린다
    reverse: false
    sourceRef: "ST1 정방향(창조적 자기망각); IPIP Imagination 구성개념 참고"
    antonymPair: ST1-02
  - code: ST1-02
    subscale: ST1
    content: 어떤 일을 하는 중에도 내가 지금 어떻게 보일지 계속 의식한다
    reverse: true
    sourceRef: "ST1 역방향(자의식)"
    antonymPair: ST1-01
  - code: ST3-01
    subscale: ST3
    content: 나는 내가 하는 일이 나 개인을 넘어선 의미를 갖는다고 느낀다
    reverse: false
    sourceRef: "ST3 정방향(영성 수용) — 종교색 배제, 의미·목적 측면"
    antonymPair: ST3-02
  - code: ST3-02
    subscale: ST3
    content: 세상에서 일어나는 일은 결국 모두 과학으로 설명될 수 있다고 본다
    reverse: true
    sourceRef: "ST3 역방향(합리적 유물론)"
    antonymPair: ST3-01
```

- [ ] **Step 1: 7개 파일 작성**

위 절차·배분·형식에 따라 `ns.yaml` `ha.yaml` `rd.yaml` `ps.yaml` `sd.yaml` `co.yaml` `st.yaml`을 작성한다.

- [ ] **Step 2: 수용 기준 테스트 작성**

`lib/items/coverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { loadAllItems } from './load'

const DIR = path.resolve(__dirname, '../../data/items')
const meta = parseYaml(readFileSync(path.join(DIR, 'meta.yaml'), 'utf-8'))
const files = loadAllItems(DIR)
const all = files.flatMap((f) => f.items)

describe('문항 뱅크 수용 기준', () => {
  it('총 105문항이다', () => {
    expect(all).toHaveLength(105)
  })

  it('meta.yaml의 섹션별 문항 수와 일치한다', () => {
    for (const s of meta.sections) {
      const file = files.find((f) => f.scale === s.scale)
      expect(file, `${s.scale} 파일 없음`).toBeDefined()
      expect(file!.section).toBe(s.section)
      expect(file!.items).toHaveLength(s.itemCount)
    }
  })

  it('섹션 번호가 1~7로 중복 없이 채워진다', () => {
    expect(files.map((f) => f.section)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('문항 코드가 전체에서 유일하다', () => {
    expect(new Set(all.map((i) => i.code)).size).toBe(all.length)
  })

  it('역채점 비율이 30~40%다', () => {
    const ratio = all.filter((i) => i.isReverse).length / all.length
    expect(ratio).toBeGreaterThanOrEqual(0.3)
    expect(ratio).toBeLessThanOrEqual(0.4)
  })

  it('모든 문항에 sourceRef가 있다', () => {
    for (const i of all) expect(i.sourceRef.trim().length).toBeGreaterThan(0)
  })

  it('antonymPair는 서로를 가리킨다', () => {
    const byCode = new Map(all.map((i) => [i.code, i]))
    for (const i of all) {
      if (!i.antonymPairId) continue
      const pair = byCode.get(i.antonymPairId)
      expect(pair, `${i.code}의 짝 ${i.antonymPairId} 없음`).toBeDefined()
      expect(pair!.antonymPairId).toBe(i.code)
      expect(pair!.isReverse).not.toBe(i.isReverse)
    }
  })

  it('ST 하위척도는 ST1·ST2·ST3 세 개뿐이다', () => {
    const st = files.find((f) => f.scale === 'ST')!
    expect(st.subscales.map((s) => s.code).sort()).toEqual(['ST1', 'ST2', 'ST3'])
  })

  it('금지 문자열이 문항에 없다', () => {
    const banned = ['TCI', '기질 및 성격검사', '심리검사', '진단']
    for (const i of all) {
      for (const b of banned) {
        expect(i.content, `${i.code}에 금지어 "${b}"`).not.toContain(b)
      }
    }
  })

  it('문항당 부정 표현이 2개 이상 겹치지 않는다', () => {
    const negations = ['않', '못', '없']
    for (const i of all) {
      const count = negations.reduce(
        (n, w) => n + (i.content.match(new RegExp(w, 'g'))?.length ?? 0),
        0,
      )
      expect(count, `${i.code} 이중부정 의심: ${i.content}`).toBeLessThanOrEqual(1)
    }
  })

  it('문항 길이가 12~45자다', () => {
    for (const i of all) {
      expect(i.content.length, `${i.code}: ${i.content}`).toBeGreaterThanOrEqual(12)
      expect(i.content.length, `${i.code}: ${i.content}`).toBeLessThanOrEqual(45)
    }
  })
})
```

- [ ] **Step 3: 테스트 실행**

Run: `npx vitest run lib/items/coverage.test.ts`
Expected: PASS — 11 tests. 실패한 항목이 있으면 해당 문항을 고쳐서 다시 실행한다.

- [ ] **Step 4: 사람 검토 요청**

문항 파일 7개를 사용자에게 제시하고 검토를 요청한다. 이 태스크는 **사용자 확인 없이는 완료로 표시하지 않는다.** 수정 요청이 오면 파일을 고치고 Step 3을 다시 실행한다.

- [ ] **Step 5: 커밋**

```bash
git add data/items lib/items/coverage.test.ts
git commit -m "feat: 105-item draft bank with source attribution"
```

---

## Task 4: seed 스크립트

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: Task 2 `loadAllItems`, Task 1 `db`
- Produces: DB에 `Assessment(version=1, isActive=true)` 1건과 `Item` 105건, 관리자 계정 1건

- [ ] **Step 1: `prisma/seed.ts` 작성**

```ts
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { PrismaClient } from '@prisma/client'
import { loadAllItems } from '../lib/items/load'

const db = new PrismaClient()
const DIR = path.resolve(__dirname, '../data/items')

async function main() {
  const meta = parseYaml(readFileSync(path.join(DIR, 'meta.yaml'), 'utf-8'))
  const files = loadAllItems(DIR)
  const total = files.reduce((n, f) => n + f.items.length, 0)

  if (total !== meta.assessment.itemCount) {
    throw new Error(`문항 수 불일치: 파일 ${total}개, meta ${meta.assessment.itemCount}개`)
  }

  await db.assessment.deleteMany({ where: { version: meta.assessment.version } })

  const assessment = await db.assessment.create({
    data: {
      version: meta.assessment.version,
      title: meta.assessment.title,
      itemCount: total,
      isActive: true,
    },
  })

  let orderNo = 1
  for (const file of files) {
    for (const item of file.items) {
      await db.item.create({
        data: {
          assessmentId: assessment.id,
          code: item.code,
          orderNo: orderNo++,
          section: file.section,
          scale: item.scale,
          subscale: item.subscale,
          content: item.content,
          isReverse: item.isReverse,
          sourceRef: item.sourceRef,
          antonymPairId: item.antonymPairId,
          status: 'ACTIVE',
        },
      })
    }
  }

  await db.employee.upsert({
    where: { name_phone: { name: '관리자', phone: '01000000000' } },
    update: { role: 'ADMIN' },
    create: { name: '관리자', phone: '01000000000', role: 'ADMIN' },
  })

  console.log(`seeded: assessment v${assessment.version}, ${total} items, 1 admin`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
```

- [ ] **Step 2: 실행**

Run: `npm run db:seed`
Expected: `seeded: assessment v1, 105 items, 1 admin`

- [ ] **Step 3: 확인**

```bash
npx prisma studio
```

`Item` 테이블에 105행, `section` 값이 1~7에 분포하는지 확인한다. 확인 후 종료.

- [ ] **Step 4: 커밋**

```bash
git add prisma/seed.ts
git commit -m "feat: seed script for assessment v1"
```

---

## Task 5: 채점 엔진

**Files:**
- Create: `lib/scoring/types.ts`, `lib/scoring/score.ts`, `lib/scoring/score.test.ts`

**Interfaces:**
- Consumes: Task 2 `ScaleCode`
- Produces:
  - `type ResponseInput = { itemCode: string; value: number }`
  - `type ScoringItem = { code: string; scale: ScaleCode; subscale: string; isReverse: boolean }`
  - `type ScaleScore = { scale: ScaleCode; raw: number; max: number; percent: number; band: Band }`
  - `type SubscaleScore = { subscale: string; scale: ScaleCode; raw: number; max: number; percent: number }`
  - `type Band = 'lower' | 'middle' | 'upper'`
  - `type ScoreResult = { scales: ScaleScore[]; subscales: SubscaleScore[] }`
  - `function applyReverse(value: number, isReverse: boolean): number`
  - `function scoreResponses(items: ScoringItem[], responses: ResponseInput[]): ScoreResult`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/scoring/score.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyReverse, scoreResponses } from './score'
import type { ScoringItem, ResponseInput } from './types'

const items: ScoringItem[] = [
  { code: 'NS1-01', scale: 'NS', subscale: 'NS1', isReverse: false },
  { code: 'NS1-02', scale: 'NS', subscale: 'NS1', isReverse: true },
  { code: 'NS2-01', scale: 'NS', subscale: 'NS2', isReverse: false },
  { code: 'HA1-01', scale: 'HA', subscale: 'HA1', isReverse: false },
]

describe('applyReverse', () => {
  it('정문항은 값을 그대로 둔다', () => {
    expect(applyReverse(5, false)).toBe(5)
  })

  it('역문항은 8에서 뺀다', () => {
    expect(applyReverse(1, true)).toBe(7)
    expect(applyReverse(7, true)).toBe(1)
    expect(applyReverse(4, true)).toBe(4)
  })
})

describe('scoreResponses', () => {
  it('역채점을 적용해 척도 원점수를 합산한다', () => {
    const responses: ResponseInput[] = [
      { itemCode: 'NS1-01', value: 6 },
      { itemCode: 'NS1-02', value: 2 }, // 역채점 → 6
      { itemCode: 'NS2-01', value: 3 },
      { itemCode: 'HA1-01', value: 1 },
    ]
    const result = scoreResponses(items, responses)
    const ns = result.scales.find((s) => s.scale === 'NS')!
    expect(ns.raw).toBe(15)
    expect(ns.max).toBe(21)
  })

  it('만점 대비 퍼센트를 소수 첫째 자리까지 계산한다', () => {
    const responses: ResponseInput[] = [
      { itemCode: 'NS1-01', value: 7 },
      { itemCode: 'NS1-02', value: 1 },
      { itemCode: 'NS2-01', value: 7 },
      { itemCode: 'HA1-01', value: 4 },
    ]
    const result = scoreResponses(items, responses)
    expect(result.scales.find((s) => s.scale === 'NS')!.percent).toBe(100)
    expect(result.scales.find((s) => s.scale === 'HA')!.percent).toBe(57.1)
  })

  it('하위척도 점수도 함께 낸다', () => {
    const responses: ResponseInput[] = [
      { itemCode: 'NS1-01', value: 6 },
      { itemCode: 'NS1-02', value: 2 },
      { itemCode: 'NS2-01', value: 3 },
      { itemCode: 'HA1-01', value: 1 },
    ]
    const result = scoreResponses(items, responses)
    const ns1 = result.subscales.find((s) => s.subscale === 'NS1')!
    expect(ns1.raw).toBe(12)
    expect(ns1.max).toBe(14)
  })

  it('구간을 lower/middle/upper로 판정한다', () => {
    const low: ResponseInput[] = [
      { itemCode: 'NS1-01', value: 1 },
      { itemCode: 'NS1-02', value: 7 },
      { itemCode: 'NS2-01', value: 1 },
      { itemCode: 'HA1-01', value: 4 },
    ]
    expect(scoreResponses(items, low).scales.find((s) => s.scale === 'NS')!.band).toBe('lower')

    const high: ResponseInput[] = [
      { itemCode: 'NS1-01', value: 7 },
      { itemCode: 'NS1-02', value: 1 },
      { itemCode: 'NS2-01', value: 7 },
      { itemCode: 'HA1-01', value: 4 },
    ]
    expect(scoreResponses(items, high).scales.find((s) => s.scale === 'NS')!.band).toBe('upper')
    expect(scoreResponses(items, high).scales.find((s) => s.scale === 'HA')!.band).toBe('middle')
  })

  it('미응답이 있으면 던진다', () => {
    const partial: ResponseInput[] = [{ itemCode: 'NS1-01', value: 5 }]
    expect(() => scoreResponses(items, partial)).toThrow(/미응답/)
  })

  it('범위를 벗어난 값은 던진다', () => {
    const bad: ResponseInput[] = [
      { itemCode: 'NS1-01', value: 8 },
      { itemCode: 'NS1-02', value: 2 },
      { itemCode: 'NS2-01', value: 3 },
      { itemCode: 'HA1-01', value: 1 },
    ]
    expect(() => scoreResponses(items, bad)).toThrow(/1~7/)
  })

  it('문항 목록에 없는 응답은 던진다', () => {
    const bad: ResponseInput[] = [
      { itemCode: 'NS1-01', value: 5 },
      { itemCode: 'NS1-02', value: 2 },
      { itemCode: 'NS2-01', value: 3 },
      { itemCode: 'HA1-01', value: 1 },
      { itemCode: 'ZZ9-99', value: 4 },
    ]
    expect(() => scoreResponses(items, bad)).toThrow(/ZZ9-99/)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/scoring/score.test.ts`
Expected: FAIL — `Failed to resolve import "./score"`

- [ ] **Step 3: `lib/scoring/types.ts` 작성**

```ts
import type { ScaleCode } from '../items/schema'

export type { ScaleCode }

export const MIN_VALUE = 1
export const MAX_VALUE = 7

export type Band = 'lower' | 'middle' | 'upper'

export type ScoringItem = {
  code: string
  scale: ScaleCode
  subscale: string
  isReverse: boolean
}

export type ResponseInput = {
  itemCode: string
  value: number
}

export type ScaleScore = {
  scale: ScaleCode
  raw: number
  max: number
  percent: number
  band: Band
}

export type SubscaleScore = {
  subscale: string
  scale: ScaleCode
  raw: number
  max: number
  percent: number
}

export type ScoreResult = {
  scales: ScaleScore[]
  subscales: SubscaleScore[]
}
```

- [ ] **Step 4: `lib/scoring/score.ts` 작성**

```ts
import {
  MAX_VALUE,
  MIN_VALUE,
  type Band,
  type ResponseInput,
  type ScaleCode,
  type ScaleScore,
  type ScoreResult,
  type ScoringItem,
  type SubscaleScore,
} from './types'

const LOWER_BOUND = 50   // D-26 확정 — 50/65. 40/60이면 중립 응답(57.1%)이 upper 근처로 몰릴 위험이 있어 보정
const UPPER_BOUND = 65

export function applyReverse(value: number, isReverse: boolean): number {
  return isReverse ? MIN_VALUE + MAX_VALUE - value : value
}

export function bandOf(percent: number): Band {
  if (percent < LOWER_BOUND) return 'lower'
  if (percent > UPPER_BOUND) return 'upper'
  return 'middle'
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function scoreResponses(
  items: ScoringItem[],
  responses: ResponseInput[],
): ScoreResult {
  const byCode = new Map(items.map((i) => [i.code, i]))
  const answered = new Map<string, number>()

  for (const r of responses) {
    const item = byCode.get(r.itemCode)
    if (!item) throw new Error(`문항 목록에 없는 응답: ${r.itemCode}`)
    if (!Number.isInteger(r.value) || r.value < MIN_VALUE || r.value > MAX_VALUE) {
      throw new Error(`응답 값은 1~7이어야 합니다: ${r.itemCode}=${r.value}`)
    }
    answered.set(r.itemCode, applyReverse(r.value, item.isReverse))
  }

  const missing = items.filter((i) => !answered.has(i.code)).map((i) => i.code)
  if (missing.length > 0) {
    throw new Error(`미응답 문항: ${missing.join(', ')}`)
  }

  const scaleAcc = new Map<ScaleCode, { raw: number; count: number }>()
  const subAcc = new Map<string, { scale: ScaleCode; raw: number; count: number }>()

  for (const item of items) {
    const value = answered.get(item.code)!

    const s = scaleAcc.get(item.scale) ?? { raw: 0, count: 0 }
    s.raw += value
    s.count += 1
    scaleAcc.set(item.scale, s)

    const sub = subAcc.get(item.subscale) ?? { scale: item.scale, raw: 0, count: 0 }
    sub.raw += value
    sub.count += 1
    subAcc.set(item.subscale, sub)
  }

  const scales: ScaleScore[] = [...scaleAcc.entries()].map(([scale, a]) => {
    const max = a.count * MAX_VALUE
    const percent = round1((a.raw / max) * 100)
    return { scale, raw: a.raw, max, percent, band: bandOf(percent) }
  })

  const subscales: SubscaleScore[] = [...subAcc.entries()].map(([subscale, a]) => {
    const max = a.count * MAX_VALUE
    return { subscale, scale: a.scale, raw: a.raw, max, percent: round1((a.raw / max) * 100) }
  })

  return { scales, subscales }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/scoring/score.test.ts`
Expected: PASS — 10 tests

- [ ] **Step 6: 실제 문항 뱅크로 골든 테스트 추가**

`lib/scoring/score.test.ts` 끝에 추가:

```ts
import path from 'node:path'
import { loadAllItems } from '../items/load'

describe('실제 문항 뱅크 채점', () => {
  const files = loadAllItems(path.resolve(__dirname, '../../data/items'))
  const realItems: ScoringItem[] = files.flatMap((f) =>
    f.items.map((i) => ({
      code: i.code,
      scale: i.scale,
      subscale: i.subscale,
      isReverse: i.isReverse,
    })),
  )

  it('전 문항에 중립(4)을 답하면 모든 척도가 50%가 된다', () => {
    const responses = realItems.map((i) => ({ itemCode: i.code, value: 4 }))
    const result = scoreResponses(realItems, responses)
    expect(result.scales).toHaveLength(7)
    for (const s of result.scales) {
      expect(s.percent).toBeCloseTo(57.1, 1)
      expect(s.band).toBe('middle')
    }
  })

  it('정문항 7 / 역문항 1이면 모든 척도가 100%가 된다', () => {
    const responses = realItems.map((i) => ({ itemCode: i.code, value: i.isReverse ? 1 : 7 }))
    const result = scoreResponses(realItems, responses)
    for (const s of result.scales) {
      expect(s.percent).toBe(100)
      expect(s.band).toBe('upper')
    }
  })
})
```

> **주의**: 7점 척도에서 중립값 `4`의 만점 대비 비율은 `4/7 = 57.1%`이지 50%가 아니다. 첫 번째 테스트의 기대값이 `57.1`인 이유다. 구간 경계(50/65, D-26 확정)도 이 점을 고려해 정한 값이다.

- [ ] **Step 7: 전체 테스트 실행**

Run: `npx vitest run`
Expected: PASS — 전 테스트

- [ ] **Step 8: 커밋**

```bash
git add lib/scoring
git commit -m "feat: pure scoring engine with reverse-keying and band classification"
```

---

## Task 6: 응답 품질 지표

**Files:**
- Create: `lib/quality/types.ts`, `lib/quality/quality.ts`, `lib/quality/quality.test.ts`

**Interfaces:**
- Consumes: Task 5 `applyReverse`, Task 2 `ItemDef`
- Produces:
  - `type QualityItem = { code: string; isReverse: boolean; antonymPairId: string | null }`
  - `type QualityResponse = { itemCode: string; value: number; elapsedMs: number }`
  - `type QualityResult = { meanElapsedMs: number; fastCount: number; antonymAgreement: number; flag: 'ok' | 'review' }`
  - `function evaluateQuality(items: QualityItem[], responses: QualityResponse[]): QualityResult`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/quality/quality.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { evaluateQuality } from './quality'
import type { QualityItem, QualityResponse } from './types'

const items: QualityItem[] = [
  { code: 'A-01', isReverse: false, antonymPairId: 'A-02' },
  { code: 'A-02', isReverse: true, antonymPairId: 'A-01' },
  { code: 'B-01', isReverse: false, antonymPairId: 'B-02' },
  { code: 'B-02', isReverse: true, antonymPairId: 'B-01' },
]

function withTime(values: number[], ms: number): QualityResponse[] {
  return items.map((i, n) => ({ itemCode: i.code, value: values[n], elapsedMs: ms }))
}

describe('evaluateQuality', () => {
  it('평균 응답시간을 계산한다', () => {
    const r = evaluateQuality(items, withTime([6, 2, 5, 3], 4000))
    expect(r.meanElapsedMs).toBe(4000)
  })

  it('1500ms 미만 응답을 빠른 응답으로 센다', () => {
    const responses: QualityResponse[] = [
      { itemCode: 'A-01', value: 6, elapsedMs: 900 },
      { itemCode: 'A-02', value: 2, elapsedMs: 1200 },
      { itemCode: 'B-01', value: 5, elapsedMs: 5000 },
      { itemCode: 'B-02', value: 3, elapsedMs: 4000 },
    ]
    expect(evaluateQuality(items, responses).fastCount).toBe(2)
  })

  it('역채점 쌍이 완전히 일치하면 antonymAgreement가 1이다', () => {
    // A-01=6 정방향 → 6, A-02=2 역채점 → 6. 차이 0
    // B-01=5 정방향 → 5, B-02=3 역채점 → 5. 차이 0
    const r = evaluateQuality(items, withTime([6, 2, 5, 3], 4000))
    expect(r.antonymAgreement).toBe(1)
  })

  it('역채점 쌍이 정반대면 antonymAgreement가 0이다', () => {
    // A-01=7 → 7, A-02=7 역채점 → 1. 차이 6
    // B-01=1 → 1, B-02=1 역채점 → 7. 차이 6
    const r = evaluateQuality(items, withTime([7, 7, 1, 1], 4000))
    expect(r.antonymAgreement).toBe(0)
  })

  it('빠른 응답이 10%를 넘으면 review 플래그를 세운다', () => {
    const responses: QualityResponse[] = [
      { itemCode: 'A-01', value: 6, elapsedMs: 500 },
      { itemCode: 'A-02', value: 2, elapsedMs: 5000 },
      { itemCode: 'B-01', value: 5, elapsedMs: 5000 },
      { itemCode: 'B-02', value: 3, elapsedMs: 5000 },
    ]
    expect(evaluateQuality(items, responses).flag).toBe('review')
  })

  it('역채점 일치도가 0.5 미만이면 review 플래그를 세운다', () => {
    const r = evaluateQuality(items, withTime([7, 6, 1, 2], 5000))
    expect(r.antonymAgreement).toBeLessThan(0.5)
    expect(r.flag).toBe('review')
  })

  it('정상 응답은 ok 플래그다', () => {
    expect(evaluateQuality(items, withTime([6, 2, 5, 3], 5000)).flag).toBe('ok')
  })

  it('짝이 없는 문항만 있으면 antonymAgreement는 1로 둔다', () => {
    const solo: QualityItem[] = [{ code: 'C-01', isReverse: false, antonymPairId: null }]
    const r = evaluateQuality(solo, [{ itemCode: 'C-01', value: 4, elapsedMs: 5000 }])
    expect(r.antonymAgreement).toBe(1)
    expect(r.flag).toBe('ok')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/quality/quality.test.ts`
Expected: FAIL — `Failed to resolve import "./quality"`

- [ ] **Step 3: `lib/quality/types.ts` 작성**

```ts
export const FAST_RESPONSE_MS = 1500
export const FAST_RATIO_LIMIT = 0.1
export const AGREEMENT_LIMIT = 0.5

export type QualityItem = {
  code: string
  isReverse: boolean
  antonymPairId: string | null
}

export type QualityResponse = {
  itemCode: string
  value: number
  elapsedMs: number
}

export type QualityResult = {
  meanElapsedMs: number
  fastCount: number
  antonymAgreement: number
  flag: 'ok' | 'review'
}
```

- [ ] **Step 4: `lib/quality/quality.ts` 작성**

```ts
import { applyReverse } from '../scoring/score'
import { MAX_VALUE, MIN_VALUE } from '../scoring/types'
import {
  AGREEMENT_LIMIT,
  FAST_RATIO_LIMIT,
  FAST_RESPONSE_MS,
  type QualityItem,
  type QualityResponse,
  type QualityResult,
} from './types'

const MAX_DIFF = MAX_VALUE - MIN_VALUE

export function evaluateQuality(
  items: QualityItem[],
  responses: QualityResponse[],
): QualityResult {
  const byCode = new Map(items.map((i) => [i.code, i]))
  const adjusted = new Map<string, number>()

  for (const r of responses) {
    const item = byCode.get(r.itemCode)
    if (!item) continue
    adjusted.set(r.itemCode, applyReverse(r.value, item.isReverse))
  }

  const times = responses.map((r) => r.elapsedMs)
  const meanElapsedMs =
    times.length === 0 ? 0 : Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  const fastCount = times.filter((t) => t < FAST_RESPONSE_MS).length

  const seen = new Set<string>()
  const diffs: number[] = []

  for (const item of items) {
    if (!item.antonymPairId) continue
    const key = [item.code, item.antonymPairId].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)

    const a = adjusted.get(item.code)
    const b = adjusted.get(item.antonymPairId)
    if (a === undefined || b === undefined) continue
    diffs.push(Math.abs(a - b))
  }

  const antonymAgreement =
    diffs.length === 0
      ? 1
      : Math.round((1 - diffs.reduce((x, y) => x + y, 0) / diffs.length / MAX_DIFF) * 100) / 100

  const fastRatio = responses.length === 0 ? 0 : fastCount / responses.length
  const flag: 'ok' | 'review' =
    fastRatio > FAST_RATIO_LIMIT || antonymAgreement < AGREEMENT_LIMIT ? 'review' : 'ok'

  return { meanElapsedMs, fastCount, antonymAgreement, flag }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/quality/quality.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 6: 커밋**

```bash
git add lib/quality
git commit -m "feat: response quality metrics (elapsed time + antonym agreement)"
```

---

## Task 7: 인증 — AuthProvider + 이름·전화번호 + 세션 쿠키

**Files:**
- Create: `lib/auth/provider.ts`, `lib/auth/name-phone.ts`, `lib/auth/session.ts`, `lib/auth/name-phone.test.ts`
- Create: `lib/auth/rate-limit.ts`, `lib/auth/rate-limit.test.ts`
- Create: `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: Task 1 `db`
- Produces:
  - `interface AuthProvider { credentialSchema: ZodTypeAny; authenticate(input: unknown): Promise<string | null> }` — 반환은 `employeeId`
  - `const authProvider: AuthProvider` (활성 구현)
  - `function normalizePhone(raw: string): string`
  - `async function createSession(employeeId: string): Promise<void>`
  - `async function destroySession(): Promise<void>`
  - `async function getCurrentEmployee(): Promise<Employee | null>`
  - `async function requireAuth(): Promise<Employee>` — 없으면 `/login`으로 redirect
  - `async function requireAdmin(): Promise<Employee>` — USER면 `/me`로 redirect
  - `function isLocked(key: string): boolean`, `function recordFailure(key: string): void`, `function clearAttempts(key: string): void`

> ✅ **로그인 입력은 이름 + 전화번호, 이 둘뿐입니다 (D-05 확정).** 접근 코드·비밀번호·PIN 어느 것도 넣지 않습니다 — 검토했으나 채택하지 않은 이유는 `00` §1의 "접근 코드·PIN을 넣지 않기로 한 이유" 절에 있습니다.
>
> ✅ **사원 레코드는 A안(자율 등록)으로 만듭니다 (D-25 확정).** 사전 명단(CSV 화이트리스트)이 없으므로, `authenticate()`는 **조회가 아니라 upsert**입니다 — (이름, 전화번호) 조합이 없으면 그 자리에서 새로 만들고 로그인시킵니다. 아래 Step 4 코드가 이 방식입니다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/auth/name-phone.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizePhone, nameePhoneCredentialSchema } from './name-phone'

describe('normalizePhone', () => {
  it('하이픈을 제거한다', () => {
    expect(normalizePhone('010-1234-5678')).toBe('01012345678')
  })

  it('공백과 괄호를 제거한다', () => {
    expect(normalizePhone(' (010) 1234 5678 ')).toBe('01012345678')
  })

  it('국가번호 +82를 0으로 바꾼다', () => {
    expect(normalizePhone('+82 10-1234-5678')).toBe('01012345678')
  })
})

describe('nameePhoneCredentialSchema', () => {
  it('정상 입력을 통과시킨다', () => {
    const r = nameePhoneCredentialSchema.parse({ name: '홍길동', phone: '010-1234-5678' })
    expect(r.name).toBe('홍길동')
    expect(r.phone).toBe('01012345678')
  })

  it('이름 앞뒤 공백을 제거한다', () => {
    expect(nameePhoneCredentialSchema.parse({ name: ' 홍길동 ', phone: '01012345678' }).name).toBe('홍길동')
  })

  it('전화번호가 10~11자리가 아니면 거부한다', () => {
    expect(() => nameePhoneCredentialSchema.parse({ name: '홍길동', phone: '0101234' })).toThrow()
  })

  it('빈 이름을 거부한다', () => {
    expect(() => nameePhoneCredentialSchema.parse({ name: '  ', phone: '01012345678' })).toThrow()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/auth/name-phone.test.ts`
Expected: FAIL — `Failed to resolve import "./name-phone"`

- [ ] **Step 3: `lib/auth/provider.ts` 작성**

```ts
import type { ZodTypeAny } from 'zod'

export interface AuthProvider {
  /** 로그인 폼 입력을 검증하는 스키마 */
  credentialSchema: ZodTypeAny
  /** 성공하면 employeeId, 실패하면 null */
  authenticate(input: unknown): Promise<string | null>
}

// 활성 구현을 여기서 고른다.
// 나중에 사번+비밀번호나 SSO로 바꿀 때 이 import 한 줄만 교체한다.
export { namePhoneProvider as authProvider } from './name-phone'
```

- [ ] **Step 4: `lib/auth/name-phone.ts` 작성**

```ts
import { z } from 'zod'
import { db } from '../db'
import type { AuthProvider } from './provider'

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  const withoutCountry = digits.startsWith('+82')
    ? '0' + digits.slice(3)
    : digits.replace(/^\+/, '')
  return withoutCountry
}

export const nameePhoneCredentialSchema = z.object({
  name: z.string().transform((s) => s.trim()).pipe(z.string().min(1, '이름을 입력해 주세요')),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^\d{10,11}$/, '전화번호를 확인해 주세요')),
})

export const namePhoneProvider: AuthProvider = {
  credentialSchema: nameePhoneCredentialSchema,

  async authenticate(input: unknown): Promise<string | null> {
    const parsed = nameePhoneCredentialSchema.safeParse(input)
    if (!parsed.success) return null

    // D-25 A안(자율 등록): 없으면 그 자리에서 만든다.
    // 화이트리스트가 없으므로 "등록된 사람인지" 검사하지 않는다.
    const employee = await db.employee.upsert({
      where: { name_phone: { name: parsed.data.name, phone: parsed.data.phone } },
      create: { name: parsed.data.name, phone: parsed.data.phone },
      update: {},
      select: { id: true },
    })

    return employee.id
  },
}
```

> **`authenticate()`가 실질적으로 실패하지 않는다는 점에 주의.** 스키마 검증(이름 비어 있음, 전화번호 자릿수 오류)만 `null`을 반환하고, 그 외에는 항상 로그인에 성공합니다. A안의 정의상 당연한 결과이며, 이것이 `00` §5에 기록된 "동료 사칭" 리스크의 구조적 원인입니다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/auth/name-phone.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 6: `lib/auth/session.ts` 작성**

```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Employee } from '@prisma/client'
import { db } from '../db'

const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'sds_session'
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? '12')

export async function createSession(employeeId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000)
  const session = await db.authSession.create({ data: { employeeId, expiresAt } })

  const store = await cookies()
  store.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const id = store.get(COOKIE)?.value
  if (id) await db.authSession.deleteMany({ where: { id } })
  store.delete(COOKIE)
}

export async function getCurrentEmployee(): Promise<Employee | null> {
  const store = await cookies()
  const id = store.get(COOKIE)?.value
  if (!id) return null

  const session = await db.authSession.findUnique({
    where: { id },
    include: { employee: true },
  })
  if (!session || session.expiresAt < new Date()) return null

  return session.employee
}

export async function requireAuth(): Promise<Employee> {
  const employee = await getCurrentEmployee()
  if (!employee) redirect('/login')
  return employee
}

export async function requireAdmin(): Promise<Employee> {
  const employee = await requireAuth()
  if (employee.role !== 'ADMIN') redirect('/me')
  return employee
}
```

- [ ] **Step 6.5: 로그인 실패 제한 (`00` §1 확정 기능)**

`00-design-notes.md` §1이 "✅ 확정, 널널하게"로 못박은 기능입니다 — 접근 코드와 달리 이건 D-25/D-27과 무관하게 바로 넣습니다. (이름, 전화번호) 조합 기준, 15분 내 10회 실패 시 잠금, 인메모리 Map(서버 하나뿐인 배포라 재시작으로 초기화돼도 문제없음, `00` §1).

`lib/auth/rate-limit.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isLocked, recordFailure, clearAttempts } from './rate-limit'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

describe('로그인 실패 제한', () => {
  it('10회 미만 실패는 잠기지 않는다', () => {
    for (let i = 0; i < 9; i += 1) recordFailure('홍길동|01012345678')
    expect(isLocked('홍길동|01012345678')).toBe(false)
  })

  it('15분 내 10회 실패하면 잠긴다', () => {
    for (let i = 0; i < 10; i += 1) recordFailure('홍길동|01012345678')
    expect(isLocked('홍길동|01012345678')).toBe(true)
  })

  it('다른 (이름,전화번호) 조합은 영향받지 않는다', () => {
    for (let i = 0; i < 10; i += 1) recordFailure('홍길동|01012345678')
    expect(isLocked('김철수|01099998888')).toBe(false)
  })

  it('15분이 지나면 잠금이 풀린다', () => {
    for (let i = 0; i < 10; i += 1) recordFailure('홍길동|01012345678')
    expect(isLocked('홍길동|01012345678')).toBe(true)
    vi.advanceTimersByTime(15 * 60 * 1000 + 1)
    expect(isLocked('홍길동|01012345678')).toBe(false)
  })

  it('clearAttempts로 즉시 초기화한다 (로그인 성공 시 사용)', () => {
    for (let i = 0; i < 10; i += 1) recordFailure('홍길동|01012345678')
    clearAttempts('홍길동|01012345678')
    expect(isLocked('홍길동|01012345678')).toBe(false)
  })
})
```

`lib/auth/rate-limit.ts`:

```ts
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

// 서버 하나뿐인 배포(D-04) 전제. 인메모리라 재시작하면 초기화되지만 그걸로 충분하다 (`00` §1).
const attempts = new Map<string, number[]>()

function recentFailures(key: string): number[] {
  const now = Date.now()
  const filtered = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  attempts.set(key, filtered)
  return filtered
}

export function isLocked(key: string): boolean {
  return recentFailures(key).length >= MAX_ATTEMPTS
}

export function recordFailure(key: string): void {
  const filtered = recentFailures(key)
  filtered.push(Date.now())
  attempts.set(key, filtered)
}

export function clearAttempts(key: string): void {
  attempts.delete(key)
}
```

Run: `npx vitest run lib/auth/rate-limit.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 7: 로그인 API 작성**

`app/api/auth/login/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { authProvider } from '@/lib/auth/provider'
import { createSession } from '@/lib/auth/session'
import { isLocked, recordFailure, clearAttempts } from '@/lib/auth/rate-limit'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
  const rawPhone = typeof body?.phone === 'string' ? body.phone : ''
  const key = `${rawName}|${rawPhone}`

  if (isLocked(key)) {
    return NextResponse.json(
      { error: '실패 횟수가 많아 잠시 후 다시 시도해 주세요.' },
      { status: 429 },
    )
  }

  const employeeId = await authProvider.authenticate(body)

  if (!employeeId) {
    recordFailure(key)
    // A안(D-25)에서는 "등록 안 된 사람"이라는 실패가 없다. 여기 오는 건 입력 형식 오류뿐이다.
    return NextResponse.json(
      { error: '이름 또는 전화번호를 확인해 주세요.' },
      { status: 401 },
    )
  }

  clearAttempts(key)
  await createSession(employeeId)
  return NextResponse.json({ ok: true })
}
```

> **잠금 판정 키가 정규화 전 원본 입력이라는 점에 주의.** `010-1234-5678`과 `01012345678`을 같은 사람으로 묶고 싶으면 `normalizePhone(rawPhone)`을 키에 써야 한다. 지금은 폼에 입력한 그대로를 키로 쓰므로, 같은 사람이 하이픈을 넣었다 뺐다 하며 시도하면 별개 카운터로 취급된다 — 공격 방지 목적상 치명적이지 않지만(오히려 시도 경로가 더 쪼개질 뿐), 나중에 필요하면 `normalizePhone` import 한 줄로 고칠 수 있다.

`app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth/session'

export async function POST() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 8: 로그인 화면 작성**

`app/login/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })

    if (res.ok) {
      router.push('/test')
      return
    }

    const data = await res.json().catch(() => ({}))
    setError(data.error ?? '로그인에 실패했습니다.')
    setPending(false)
  }

  return (
    <main className="mx-auto w-full max-w-md px-[clamp(1rem,4vw,3rem)] py-16">
      <h1 className="text-2xl font-semibold">7차원 성향 설문</h1>
      <p className="mt-2 text-sm text-neutral-600">이름과 전화번호를 입력해 주세요.</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">전화번호</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="010-1234-5678"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? '확인 중…' : '시작하기'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 9: 수동 확인**

```bash
npm run dev
```

`http://localhost:3000/login`에서 `관리자` / `010-0000-0000`으로 로그인한다.
Expected: `/test`로 이동한다 (아직 페이지가 없으므로 404가 떠도 된다). 브라우저 개발자도구 Application 탭에서 `sds_session` 쿠키가 생겼는지 확인한다.

- [ ] **Step 10: 커밋**

```bash
git add lib/auth app/api/auth app/login
git commit -m "feat: pluggable auth with name+phone provider and cookie sessions"
```

---

## Task 8: 세션 API

**Files:**
- Create: `app/api/sessions/route.ts`, `app/api/sessions/current/route.ts`
- Create: `app/api/sessions/[id]/sections/[n]/route.ts`
- Create: `lib/session-service.ts`

**Interfaces:**
- Consumes: Task 1 `db`, Task 7 `getCurrentEmployee`
- Produces:
  - `async function getOrCreateSession(employeeId: string): Promise<{ sessionId: string; assessmentId: string; version: number }>`
  - `async function getSectionItems(assessmentId: string, section: number): Promise<Item[]>`
  - `async function saveSection(sessionId, section, entries): Promise<void>`
  - `type SectionEntry = { itemCode: string; value: number; elapsedMs: number; changedCount: number }`

- [ ] **Step 1: `lib/session-service.ts` 작성**

```ts
import type { Item } from '@prisma/client'
import { db } from './db'

export type SectionEntry = {
  itemCode: string
  value: number
  elapsedMs: number
  changedCount: number
}

export async function getActiveAssessment() {
  const assessment = await db.assessment.findFirst({ where: { isActive: true } })
  if (!assessment) throw new Error('활성 assessment가 없습니다. seed를 실행하세요.')
  return assessment
}

export async function getOrCreateSession(employeeId: string) {
  const existing = await db.testSession.findFirst({
    where: { employeeId, status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
  })
  if (existing) {
    return {
      sessionId: existing.id,
      assessmentId: existing.assessmentId,
      version: existing.assessmentVersion,
    }
  }

  const completed = await db.testSession.findFirst({
    where: { employeeId, status: 'COMPLETED' },
  })
  if (completed) {
    return {
      sessionId: completed.id,
      assessmentId: completed.assessmentId,
      version: completed.assessmentVersion,
      alreadyCompleted: true as const,
    }
  }

  const assessment = await getActiveAssessment()
  const employee = await db.employee.findUniqueOrThrow({ where: { id: employeeId } })

  const created = await db.testSession.create({
    data: {
      employeeId,
      assessmentId: assessment.id,
      assessmentVersion: assessment.version,
      departmentAtTime: employee.department,
    },
  })

  return { sessionId: created.id, assessmentId: assessment.id, version: assessment.version }
}

export async function getSectionItems(assessmentId: string, section: number): Promise<Item[]> {
  return db.item.findMany({
    where: { assessmentId, section, status: 'ACTIVE' },
    orderBy: { orderNo: 'asc' },
  })
}

export async function getAnsweredCodes(sessionId: string): Promise<Set<string>> {
  const rows = await db.response.findMany({
    where: { sessionId },
    select: { item: { select: { code: true } } },
  })
  return new Set(rows.map((r) => r.item.code))
}

export async function saveSection(
  sessionId: string,
  section: number,
  entries: SectionEntry[],
): Promise<void> {
  const session = await db.testSession.findUniqueOrThrow({ where: { id: sessionId } })
  if (session.status !== 'IN_PROGRESS') {
    throw new Error('이미 제출된 설문입니다.')
  }

  const items = await getSectionItems(session.assessmentId, section)
  const byCode = new Map(items.map((i) => [i.code, i]))

  for (const entry of entries) {
    const item = byCode.get(entry.itemCode)
    if (!item) throw new Error(`섹션 ${section}에 없는 문항: ${entry.itemCode}`)
    if (!Number.isInteger(entry.value) || entry.value < 1 || entry.value > 7) {
      throw new Error(`응답 값은 1~7이어야 합니다: ${entry.itemCode}`)
    }
  }

  await db.$transaction(
    entries.map((entry) => {
      const item = byCode.get(entry.itemCode)!
      return db.response.upsert({
        where: { sessionId_itemId: { sessionId, itemId: item.id } },
        create: {
          sessionId,
          itemId: item.id,
          value: entry.value,
          elapsedMs: entry.elapsedMs,
          changedCount: entry.changedCount,
        },
        update: {
          value: entry.value,
          elapsedMs: entry.elapsedMs,
          changedCount: entry.changedCount,
          answeredAt: new Date(),
        },
      })
    }),
  )
}
```

- [ ] **Step 2: `app/api/sessions/route.ts` 작성**

```ts
import { NextResponse } from 'next/server'
import { getCurrentEmployee } from '@/lib/auth/session'
import { getOrCreateSession } from '@/lib/session-service'

export async function POST() {
  const employee = await getCurrentEmployee()
  if (!employee) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const session = await getOrCreateSession(employee.id)
  return NextResponse.json(session)
}
```

- [ ] **Step 3: `app/api/sessions/current/route.ts` 작성**

```ts
import { NextResponse } from 'next/server'
import { getCurrentEmployee } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getAnsweredCodes } from '@/lib/session-service'

export async function GET() {
  const employee = await getCurrentEmployee()
  if (!employee) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const session = await db.testSession.findFirst({
    where: { employeeId: employee.id },
    orderBy: { startedAt: 'desc' },
  })
  if (!session) return NextResponse.json({ session: null })

  const answered = await getAnsweredCodes(session.id)
  return NextResponse.json({
    session: { id: session.id, status: session.status },
    answeredCount: answered.size,
    answeredCodes: [...answered],
  })
}
```

- [ ] **Step 4: `app/api/sessions/[id]/sections/[n]/route.ts` 작성**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentEmployee } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { saveSection } from '@/lib/session-service'

const bodySchema = z.object({
  entries: z.array(
    z.object({
      itemCode: z.string(),
      value: z.number().int().min(1).max(7),
      elapsedMs: z.number().int().min(0),
      changedCount: z.number().int().min(0),
    }),
  ),
})

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; n: string }> },
) {
  const employee = await getCurrentEmployee()
  if (!employee) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id, n } = await context.params
  const section = Number(n)
  if (!Number.isInteger(section) || section < 1 || section > 7) {
    return NextResponse.json({ error: '잘못된 섹션 번호' }, { status: 400 })
  }

  const session = await db.testSession.findUnique({ where: { id } })
  if (!session || session.employeeId !== employee.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  try {
    await saveSection(id, section, parsed.data.entries)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
```

> **소유권 검증이 여기 핵심이다.** `session.employeeId !== employee.id`면 403이다. 세션 ID를 알아도 남의 세션에 쓸 수 없다.

- [ ] **Step 5: 수동 확인**

```bash
npm run dev
```

브라우저에서 로그인한 뒤 개발자도구 콘솔에서:

```js
await (await fetch('/api/sessions', { method: 'POST' })).json()
await (await fetch('/api/sessions/current')).json()
```

Expected: 첫 호출이 `{ sessionId, assessmentId, version: 1 }`을 반환하고, 두 번째가 `answeredCount: 0`을 반환한다.

- [ ] **Step 6: 커밋**

```bash
git add lib/session-service.ts app/api/sessions
git commit -m "feat: session lifecycle API with per-section batch save"
```

---

## Task 9: 7점 리커트 컴포넌트

**Files:**
- Create: `components/LikertGroup.tsx`, `components/ItemRow.tsx`
- Create: `components/LikertGroup.test.tsx`
- Create: `app/globals.css`에 `.sr-only` 추가

**Interfaces:**
- Consumes: 없음
- Produces:
  - `const LIKERT_LABELS: readonly string[]` — 7개
  - `<LikertGroup name value onChange disabled />`
  - `<ItemRow item index total value active onAnswer />`
  - `type ItemRowData = { code: string; content: string }`

- [ ] **Step 1: 실패하는 테스트 작성**

`components/LikertGroup.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LikertGroup, LIKERT_LABELS } from './LikertGroup'

describe('LikertGroup', () => {
  it('7개의 라디오를 렌더한다', () => {
    render(<LikertGroup name="q1" value={null} onChange={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(7)
  })

  it('7개 라벨을 모두 표시한다', () => {
    render(<LikertGroup name="q1" value={null} onChange={() => {}} />)
    for (const label of LIKERT_LABELS) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('선택하면 1~7 값을 콜백으로 넘긴다', async () => {
    const onChange = vi.fn()
    render(<LikertGroup name="q1" value={null} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(LIKERT_LABELS[6]))
    expect(onChange).toHaveBeenCalledWith(7)
  })

  it('현재 값에 해당하는 라디오가 체크돼 있다', () => {
    render(<LikertGroup name="q1" value={3} onChange={() => {}} />)
    expect((screen.getByLabelText(LIKERT_LABELS[2]) as HTMLInputElement).checked).toBe(true)
  })

  it('disabled면 모든 라디오가 비활성이다', () => {
    render(<LikertGroup name="q1" value={null} onChange={() => {}} disabled />)
    for (const radio of screen.getAllByRole('radio')) {
      expect((radio as HTMLInputElement).disabled).toBe(true)
    }
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/LikertGroup.test.tsx`
Expected: FAIL — `Failed to resolve import "./LikertGroup"`

- [ ] **Step 3: `components/LikertGroup.tsx` 작성**

```tsx
'use client'

export const LIKERT_LABELS = [
  '전혀 아니다',
  '아니다',
  '약간 아니다',
  '보통',
  '약간 그렇다',
  '그렇다',
  '매우 그렇다',
] as const

type Props = {
  name: string
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

export function LikertGroup({ name, value, onChange, disabled = false }: Props) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-1 md:grid-cols-7 md:gap-2">
      {LIKERT_LABELS.map((label, index) => {
        const optionValue = index + 1
        const id = `${name}-${optionValue}`
        const checked = value === optionValue

        return (
          <div key={id} className="contents md:block">
            <input
              type="radio"
              id={id}
              name={name}
              value={optionValue}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(optionValue)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className={[
                'flex min-h-[44px] cursor-pointer items-center justify-center gap-2',
                'rounded border px-3 py-2 text-center text-sm transition',
                'md:min-h-[76px] md:flex-col md:justify-center md:px-1 md:text-xs',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                checked
                  ? 'border-neutral-900 bg-neutral-900 font-semibold text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
            >
              <span aria-hidden="true" className="text-base md:text-lg">
                {checked ? '●' : '○'}
              </span>
              <span>{label}</span>
            </label>
          </div>
        )
      })}
    </div>
  )
}
```

> **G-15 준수**: 네이티브 `<input type="radio">`를 `sr-only`로 숨기고 `<label>`을 시각적으로 그린다. 화살표키 이동, 스크린리더 읽기, 폼 제출이 전부 브라우저 기본 동작으로 작동한다.
> **색 의존 금지**: 선택 상태를 배경색 + 글자 굵기 + `●` 기호 세 가지로 동시에 표현한다.

- [ ] **Step 4: `app/globals.css`에 `.sr-only` 추가**

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run components/LikertGroup.test.tsx`
Expected: PASS — 5 tests

- [ ] **Step 6: `components/ItemRow.tsx` 작성**

```tsx
'use client'

import { LikertGroup } from './LikertGroup'

export type ItemRowData = {
  code: string
  content: string
}

type Props = {
  item: ItemRowData
  index: number
  total: number
  value: number | null
  active: boolean
  onAnswer: (value: number) => void
}

export function ItemRow({ item, index, total, value, active, onAnswer }: Props) {
  return (
    <fieldset
      id={`item-${item.code}`}
      className={[
        'border-b border-neutral-200 py-6 transition-opacity duration-200',
        active || value !== null ? 'opacity-100' : 'opacity-40',
      ].join(' ')}
    >
      <legend className="text-base font-medium text-neutral-900 md:text-lg">
        <span className="sr-only">{`${index + 1}번 문항, 전체 ${total}문항 중. `}</span>
        {item.content}
      </legend>

      <LikertGroup name={item.code} value={value} onChange={onAnswer} />
    </fieldset>
  )
}
```

- [ ] **Step 7: 커밋**

```bash
git add components/LikertGroup.tsx components/LikertGroup.test.tsx components/ItemRow.tsx app/globals.css
git commit -m "feat: accessible 7-point Likert group and item row"
```

---

## Task 10: 섹션 응시 화면 — 포커스/디밍 + 자동저장

**Files:**
- Create: `components/ProgressHeader.tsx`, `components/SectionForm.tsx`, `components/SectionForm.test.tsx`
- Create: `app/test/page.tsx`, `app/test/[section]/page.tsx`
- Create: `lib/local-draft.ts`

**Interfaces:**
- Consumes: Task 9 `ItemRow` `ItemRowData`, Task 8 세션 API
- Produces:
  - `<SectionForm sessionId section totalSections items initialAnswers />`
  - `function saveDraft(sessionId, itemCode, entry): void`
  - `function loadDraft(sessionId): Record<string, DraftEntry>`
  - `function clearDraft(sessionId): void`

- [ ] **Step 1: 실패하는 테스트 작성**

`components/SectionForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionForm } from './SectionForm'
import { LIKERT_LABELS } from './LikertGroup'

const items = [
  { code: 'NS1-01', content: '첫 번째 문항입니다' },
  { code: 'NS1-02', content: '두 번째 문항입니다' },
  { code: 'NS1-03', content: '세 번째 문항입니다' },
]

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }))))
  Element.prototype.scrollIntoView = vi.fn()
})

function setup() {
  return render(
    <SectionForm
      sessionId="sess-1"
      section={1}
      totalSections={7}
      scaleNameKo="자극추구"
      items={items}
      initialAnswers={{}}
    />,
  )
}

describe('SectionForm', () => {
  it('첫 문항만 활성 상태다', () => {
    setup()
    const fieldsets = screen.getAllByRole('group')
    expect(fieldsets[0].className).toContain('opacity-100')
    expect(fieldsets[1].className).toContain('opacity-40')
  })

  it('답하면 다음 문항이 활성화된다', async () => {
    setup()
    await userEvent.click(screen.getByLabelText(`${items[0].content} ${LIKERT_LABELS[5]}`, { exact: false }))
    const fieldsets = screen.getAllByRole('group')
    expect(fieldsets[1].className).toContain('opacity-100')
  })

  it('미응답이 있으면 다음 버튼이 비활성이다', () => {
    setup()
    expect((screen.getByRole('button', { name: /다음/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('전부 답하면 다음 버튼이 활성화된다', async () => {
    setup()
    for (const item of items) {
      const radios = screen.getAllByRole('radio')
      const target = radios.find((r) => (r as HTMLInputElement).name === item.code && (r as HTMLInputElement).value === '5')!
      await userEvent.click(target)
    }
    expect((screen.getByRole('button', { name: /다음/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('응답을 localStorage에 저장한다', async () => {
    setup()
    const radios = screen.getAllByRole('radio')
    const target = radios.find((r) => (r as HTMLInputElement).name === 'NS1-01' && (r as HTMLInputElement).value === '6')!
    await userEvent.click(target)
    const raw = window.localStorage.getItem('sds-draft:sess-1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)['NS1-01'].value).toBe(6)
  })

  it('진행률에 섹션 번호를 표시한다', () => {
    setup()
    expect(screen.getByText('섹션 1 / 7')).toBeDefined()
  })

  it('경과 시간 타이머를 표시하지 않는다', () => {
    const { container } = setup()
    expect(container.textContent).not.toMatch(/\d{2}:\d{2}/)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/SectionForm.test.tsx`
Expected: FAIL — `Failed to resolve import "./SectionForm"`

- [ ] **Step 3: `lib/local-draft.ts` 작성**

```ts
export type DraftEntry = {
  value: number
  elapsedMs: number
  changedCount: number
}

const PREFIX = 'sds-draft:'

export function draftKey(sessionId: string): string {
  return `${PREFIX}${sessionId}`
}

export function loadDraft(sessionId: string): Record<string, DraftEntry> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(draftKey(sessionId)) ?? '{}')
  } catch {
    return {}
  }
}

export function saveDraft(sessionId: string, itemCode: string, entry: DraftEntry): void {
  if (typeof window === 'undefined') return
  const draft = loadDraft(sessionId)
  draft[itemCode] = entry
  window.localStorage.setItem(draftKey(sessionId), JSON.stringify(draft))
}

export function clearDraft(sessionId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(draftKey(sessionId))
}
```

- [ ] **Step 4: `components/ProgressHeader.tsx` 작성**

```tsx
type Props = {
  section: number
  totalSections: number
  scaleNameKo: string
  answered: number
  total: number
}

export function ProgressHeader({ section, totalSections, scaleNameKo, answered, total }: Props) {
  const ratio = ((section - 1) / totalSections) * 100 + (answered / total) * (100 / totalSections)

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-[clamp(1rem,4vw,3rem)] py-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio)}
          aria-label="설문 진행률"
        >
          <div className="h-full bg-neutral-900 transition-all" style={{ width: `${ratio}%` }} />
        </div>
        <span className="shrink-0 text-sm font-medium text-neutral-700">
          섹션 {section} / {totalSections}
        </span>
      </div>
      <p className="mx-auto w-full max-w-3xl px-[clamp(1rem,4vw,3rem)] pb-3 text-sm text-neutral-500">
        {scaleNameKo} · {total}문항 중 {Math.min(answered + 1, total)}번째
      </p>
    </header>
  )
}
```

- [ ] **Step 5: `components/SectionForm.tsx` 작성**

```tsx
'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ItemRow, type ItemRowData } from './ItemRow'
import { ProgressHeader } from './ProgressHeader'
import { saveDraft, type DraftEntry } from '@/lib/local-draft'

type Props = {
  sessionId: string
  section: number
  totalSections: number
  scaleNameKo: string
  items: ItemRowData[]
  initialAnswers: Record<string, number>
}

export function SectionForm({
  sessionId,
  section,
  totalSections,
  scaleNameKo,
  items,
  initialAnswers,
}: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, DraftEntry>>(() =>
    Object.fromEntries(
      Object.entries(initialAnswers).map(([code, value]) => [
        code,
        { value, elapsedMs: 0, changedCount: 0 },
      ]),
    ),
  )
  const [visited, setVisited] = useState<Set<string>>(() => new Set(Object.keys(initialAnswers)))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activatedAt = useRef<number>(Date.now())

  // 활성 문항 = "방문한 적 없는 것 중 가장 앞".
  // "미응답 중 가장 앞"으로 하면 답을 고칠 때 포커스가 위로 튄다.
  const activeIndex = useMemo(() => {
    const idx = items.findIndex((i) => !visited.has(i.code))
    return idx === -1 ? items.length : idx
  }, [items, visited])

  const allAnswered = items.every((i) => answers[i.code] !== undefined)

  const handleAnswer = useCallback(
    (item: ItemRowData, index: number, value: number) => {
      const previous = answers[item.code]
      const entry: DraftEntry = {
        value,
        elapsedMs: previous ? previous.elapsedMs : Date.now() - activatedAt.current,
        changedCount: previous ? previous.changedCount + 1 : 0,
      }

      setAnswers((prev) => ({ ...prev, [item.code]: entry }))
      saveDraft(sessionId, item.code, entry)

      const wasUnvisited = !visited.has(item.code)
      if (wasUnvisited) {
        setVisited((prev) => new Set(prev).add(item.code))
        activatedAt.current = Date.now()

        const next = items[index + 1]
        if (next) {
          requestAnimationFrame(() => {
            document
              .getElementById(`item-${next.code}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          })
        }
      }
    },
    [answers, items, sessionId, visited],
  )

  async function goNext() {
    setPending(true)
    setError(null)

    const entries = items.map((i) => ({
      itemCode: i.code,
      value: answers[i.code].value,
      elapsedMs: answers[i.code].elapsedMs,
      changedCount: answers[i.code].changedCount,
    }))

    const res = await fetch(`/api/sessions/${sessionId}/sections/${section}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? '저장에 실패했습니다. 다시 시도해 주세요.')
      setPending(false)
      return
    }

    if (section < totalSections) {
      router.push(`/test/${section + 1}`)
    } else {
      router.push('/test/submit')
    }
  }

  const answeredCount = items.filter((i) => answers[i.code] !== undefined).length

  return (
    <>
      <ProgressHeader
        section={section}
        totalSections={totalSections}
        scaleNameKo={scaleNameKo}
        answered={answeredCount}
        total={items.length}
      />

      <main className="mx-auto w-full max-w-3xl px-[clamp(1rem,4vw,3rem)] pb-24 pt-6">
        {items.map((item, index) => (
          <ItemRow
            key={item.code}
            item={item}
            index={index}
            total={items.length}
            value={answers[item.code]?.value ?? null}
            active={index === activeIndex}
            onAnswer={(value) => handleAnswer(item, index, value)}
          />
        ))}

        {error && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {error}
          </p>
        )}

        {!allAnswered && (
          <p className="mt-6 text-sm text-neutral-500">
            아직 답하지 않은 문항이 {items.length - answeredCount}개 있습니다.
          </p>
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={!allAnswered || pending}
          className="mt-6 rounded bg-neutral-900 px-6 py-3 text-white disabled:opacity-40"
        >
          {pending ? '저장 중…' : section < totalSections ? '다음 섹션' : '제출하기'}
        </button>
      </main>
    </>
  )
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run components/SectionForm.test.tsx`
Expected: PASS — 7 tests

- [ ] **Step 7: `app/test/page.tsx` 작성**

```tsx
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getOrCreateSession, getAnsweredCodes, getSectionItems } from '@/lib/session-service'
import { db } from '@/lib/db'

export default async function TestEntryPage() {
  const employee = await requireAuth()
  const session = await getOrCreateSession(employee.id)

  if ('alreadyCompleted' in session) redirect('/me')

  const answered = await getAnsweredCodes(session.sessionId)
  if (answered.size === 0) redirect('/test/1')

  for (let section = 1; section <= 7; section += 1) {
    const items = await getSectionItems(session.assessmentId, section)
    if (items.some((i) => !answered.has(i.code))) redirect(`/test/${section}`)
  }

  redirect('/test/submit')
}
```

- [ ] **Step 8: `app/test/[section]/page.tsx` 작성**

```tsx
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getOrCreateSession, getSectionItems } from '@/lib/session-service'
import { SectionForm } from '@/components/SectionForm'

const SCALE_NAMES: Record<string, string> = {
  NS: '자극추구',
  HA: '위험회피',
  RD: '사회적 민감성',
  PS: '인내력',
  SD: '자율성',
  CO: '연대감',
  ST: '자기초월',
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section: raw } = await params
  const section = Number(raw)
  if (!Number.isInteger(section) || section < 1 || section > 7) notFound()

  const employee = await requireAuth()
  const session = await getOrCreateSession(employee.id)
  if ('alreadyCompleted' in session) redirect('/me')

  const items = await getSectionItems(session.assessmentId, section)
  if (items.length === 0) notFound()

  const existing = await db.response.findMany({
    where: { sessionId: session.sessionId, item: { section } },
    select: { value: true, item: { select: { code: true } } },
  })

  const initialAnswers = Object.fromEntries(existing.map((r) => [r.item.code, r.value]))

  return (
    <SectionForm
      sessionId={session.sessionId}
      section={section}
      totalSections={7}
      scaleNameKo={SCALE_NAMES[items[0].scale] ?? items[0].scale}
      items={items.map((i) => ({ code: i.code, content: i.content }))}
      initialAnswers={initialAnswers}
    />
  )
}
```

- [ ] **Step 9: 수동 확인**

```bash
npm run dev
```

로그인 후 `/test`로 이동한다.
Expected: 섹션 1이 뜨고, 첫 문항만 진하게 보이며, 답하면 그 줄이 흐려지고 다음 문항으로 스크롤된다. 12문항을 다 답하면 "다음 섹션" 버튼이 활성화된다. 클릭하면 `/test/2`로 이동한다. 브라우저를 새로고침해도 답한 내용이 남아 있다.

- [ ] **Step 10: 커밋**

```bash
git add components/SectionForm.tsx components/SectionForm.test.tsx components/ProgressHeader.tsx lib/local-draft.ts app/test
git commit -m "feat: section test flow with focus-dim pattern and two-tier autosave"
```

---

## Task 11: 제출 → 채점 → 결과 생성

**Files:**
- Create: `app/api/sessions/[id]/submit/route.ts`
- Create: `lib/result-service.ts`
- Create: `app/test/submit/page.tsx`

**Interfaces:**
- Consumes: Task 5 `scoreResponses`, Task 6 `evaluateQuality`, Task 1 `db`
- Produces:
  - `async function submitSession(sessionId: string, employeeId: string): Promise<{ resultId: string }>`
  - `type ResultSnapshot = { computedAt: string; assessmentVersion: number; scales: ScaleScore[] }`

- [ ] **Step 1: `lib/result-service.ts` 작성**

```ts
import { db } from './db'
import { scoreResponses } from './scoring/score'
import type { ScoringItem, ResponseInput, ScaleScore } from './scoring/types'
import { evaluateQuality } from './quality/quality'
import type { QualityItem, QualityResponse } from './quality/types'

export type ResultSnapshot = {
  computedAt: string
  assessmentVersion: number
  scales: ScaleScore[]
}

export async function submitSession(sessionId: string, employeeId: string) {
  const session = await db.testSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { responses: { include: { item: true } } },
  })

  if (session.employeeId !== employeeId) throw new Error('권한이 없습니다.')
  if (session.status === 'COMPLETED') {
    const existing = await db.result.findUniqueOrThrow({ where: { sessionId } })
    return { resultId: existing.id }
  }

  const items = await db.item.findMany({
    where: { assessmentId: session.assessmentId, status: 'ACTIVE' },
  })

  const scoringItems: ScoringItem[] = items.map((i) => ({
    code: i.code,
    scale: i.scale as ScoringItem['scale'],
    subscale: i.subscale,
    isReverse: i.isReverse,
  }))

  const responses: ResponseInput[] = session.responses.map((r) => ({
    itemCode: r.item.code,
    value: r.value,
  }))

  // 미응답이 있으면 여기서 throw 된다. 이것이 완결성 검증이다.
  const scores = scoreResponses(scoringItems, responses)

  const qualityItems: QualityItem[] = items.map((i) => ({
    code: i.code,
    isReverse: i.isReverse,
    antonymPairId: i.antonymPairId,
  }))

  const qualityResponses: QualityResponse[] = session.responses.map((r) => ({
    itemCode: r.item.code,
    value: r.value,
    elapsedMs: r.elapsedMs,
  }))

  const quality = evaluateQuality(qualityItems, qualityResponses)

  const completedAt = new Date()
  const durationSec = Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000)

  const snapshot: ResultSnapshot = {
    computedAt: completedAt.toISOString(),
    assessmentVersion: session.assessmentVersion,
    scales: scores.scales,
  }

  const normBasisN = await db.testSession.count({ where: { status: 'COMPLETED' } })

  const result = await db.$transaction(async (tx) => {
    await tx.testSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt, durationSec },
    })

    await tx.qualityFlag.create({
      data: {
        sessionId,
        meanElapsedMs: quality.meanElapsedMs,
        fastCount: quality.fastCount,
        antonymAgreement: quality.antonymAgreement,
        flag: quality.flag,
      },
    })

    return tx.result.create({
      data: {
        sessionId,
        scoresJson: scores as unknown as object,
        snapshotJson: snapshot as unknown as object,
        normBasisN: normBasisN + 1,
      },
    })
  })

  return { resultId: result.id }
}
```

> **스냅샷의 의미**: `snapshotJson`은 사원에게 보여준 그 시점의 값이다. 이후 응시자가 늘어도 이 값은 바뀌지 않는다. `scoresJson`은 하위척도까지 포함한 전체 원자료로 관리자 분석에 쓴다.

- [ ] **Step 2: `app/api/sessions/[id]/submit/route.ts` 작성**

```ts
import { NextResponse } from 'next/server'
import { getCurrentEmployee } from '@/lib/auth/session'
import { submitSession } from '@/lib/result-service'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const employee = await getCurrentEmployee()
  if (!employee) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await context.params

  try {
    const result = await submitSession(id, employee.id)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 3: `app/test/submit/page.tsx` 작성**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearDraft } from '@/lib/local-draft'

export default function SubmitPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function run() {
      const current = await (await fetch('/api/sessions/current')).json()
      const sessionId = current?.session?.id
      if (!sessionId) {
        router.replace('/test')
        return
      }

      const res = await fetch(`/api/sessions/${sessionId}/submit`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '채점 중 문제가 발생했습니다.')
        return
      }

      clearDraft(sessionId)
      router.replace('/me')
    }

    run()
  }, [router])

  return (
    <main className="mx-auto w-full max-w-md px-[clamp(1rem,4vw,3rem)] py-24 text-center">
      {error ? (
        <>
          <p role="alert" className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/test')}
            className="mt-6 rounded border border-neutral-300 px-4 py-2"
          >
            응시 화면으로 돌아가기
          </button>
        </>
      ) : (
        <p className="text-neutral-600">결과를 계산하고 있습니다…</p>
      )}
    </main>
  )
}
```

- [ ] **Step 4: 수동 확인**

`npm run dev` 후 105문항을 전부 응시하고 제출한다.
Expected: `/me`로 이동한다 (아직 화면이 없어 404여도 된다). `npx prisma studio`에서 `Result` 1건, `QualityFlag` 1건, `TestSession.status = COMPLETED`를 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add lib/result-service.ts app/api/sessions/\[id\]/submit app/test/submit
git commit -m "feat: submit pipeline with scoring, quality metrics and result snapshot"
```

---

## Task 12: 개인 결과 화면

**Files:**
- Create: `components/result/ScaleRadar.tsx`, `components/result/ScaleBars.tsx`
- Create: `app/me/page.tsx`
- Create: `lib/scale-meta.ts`

**Interfaces:**
- Consumes: Task 11 `ResultSnapshot`, Task 5 `ScaleScore`
- Produces:
  - `const SCALE_META: Record<ScaleCode, { nameKo: string; group: '기질' | '성격' }>`
  - `<ScaleRadar scales={ScaleScore[]} />`
  - `<ScaleBars scales={ScaleScore[]} />`

- [ ] **Step 1: `lib/scale-meta.ts` 작성**

```ts
import type { ScaleCode } from './scoring/types'

export const SCALE_META: Record<ScaleCode, { nameKo: string; group: '기질' | '성격' }> = {
  NS: { nameKo: '자극추구', group: '기질' },
  HA: { nameKo: '위험회피', group: '기질' },
  RD: { nameKo: '사회적 민감성', group: '기질' },
  PS: { nameKo: '인내력', group: '기질' },
  SD: { nameKo: '자율성', group: '성격' },
  CO: { nameKo: '연대감', group: '성격' },
  ST: { nameKo: '자기초월', group: '성격' },
}

export const SCALE_ORDER: ScaleCode[] = ['NS', 'HA', 'RD', 'PS', 'SD', 'CO', 'ST']

// G-11: high/low가 아니라 upper/middle/lower.
// 표시 문구도 우열 함의를 피한다.
export const BAND_LABEL: Record<'lower' | 'middle' | 'upper', string> = {
  lower: '상대적으로 덜 두드러짐',
  middle: '중간 범위',
  upper: '상대적으로 두드러짐',
}
```

- [ ] **Step 2: `components/result/ScaleRadar.tsx` 작성**

```tsx
'use client'

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import type { ScaleScore } from '@/lib/scoring/types'
import { SCALE_META, SCALE_ORDER } from '@/lib/scale-meta'

export function ScaleRadar({ scales }: { scales: ScaleScore[] }) {
  const byScale = new Map(scales.map((s) => [s.scale, s]))
  const data = SCALE_ORDER.filter((code) => byScale.has(code)).map((code) => ({
    label: SCALE_META[code].nameKo,
    percent: byScale.get(code)!.percent,
  }))

  return (
    <div className="w-full" style={{ aspectRatio: '1 / 0.85' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#d4d4d4" />
          <PolarAngleAxis dataKey="label" tick={{ fill: '#404040', fontSize: 13 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#a3a3a3', fontSize: 11 }} />
          <Radar dataKey="percent" stroke="#171717" fill="#171717" fillOpacity={0.18} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

> **축 스케일을 `[0, 100]`으로 고정한다.** 자동 스케일을 쓰면 사람마다 축 범위가 달라져 프로파일 모양이 왜곡된다.

- [ ] **Step 3: `components/result/ScaleBars.tsx` 작성**

```tsx
import type { ScaleScore } from '@/lib/scoring/types'
import { BAND_LABEL, SCALE_META, SCALE_ORDER } from '@/lib/scale-meta'

export function ScaleBars({ scales }: { scales: ScaleScore[] }) {
  const byScale = new Map(scales.map((s) => [s.scale, s]))

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">척도별 점수</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">척도</th>
          <th scope="col">점수</th>
          <th scope="col">구간</th>
        </tr>
      </thead>
      <tbody>
        {SCALE_ORDER.filter((code) => byScale.has(code)).map((code) => {
          const score = byScale.get(code)!
          return (
            <tr key={code} className="border-b border-neutral-100">
              <th scope="row" className="w-32 py-3 text-left font-medium text-neutral-800">
                {SCALE_META[code].nameKo}
              </th>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full bg-neutral-800" style={{ width: `${score.percent}%` }} />
                  </div>
                  <span className="w-14 shrink-0 tabular-nums text-neutral-600">
                    {score.percent}%
                  </span>
                </div>
              </td>
              <td className="w-44 py-3 text-neutral-500">{BAND_LABEL[score.band]}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

> **표로 만든 이유**: 스크린리더가 척도별 수치를 읽을 수 있어야 한다. 레이더 차트만으로는 접근이 불가능하다.

- [ ] **Step 4: `app/me/page.tsx` 작성**

```tsx
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { ScaleRadar } from '@/components/result/ScaleRadar'
import { ScaleBars } from '@/components/result/ScaleBars'
import type { ResultSnapshot } from '@/lib/result-service'

export default async function MyResultPage() {
  const employee = await requireAuth()

  const result = await db.result.findFirst({
    where: { session: { employeeId: employee.id, status: 'COMPLETED' } },
    orderBy: { computedAt: 'desc' },
  })

  if (!result) {
    return (
      <main className="mx-auto w-full max-w-3xl px-[clamp(1rem,4vw,3rem)] py-16">
        <h1 className="text-2xl font-semibold">아직 결과가 없습니다</h1>
        <Link href="/test" className="mt-6 inline-block rounded bg-neutral-900 px-5 py-2.5 text-white">
          설문 시작하기
        </Link>
      </main>
    )
  }

  const snapshot = result.snapshotJson as unknown as ResultSnapshot
  const shownAt = new Date(snapshot.computedAt).toLocaleDateString('ko-KR')

  return (
    <main className="mx-auto w-full max-w-3xl px-[clamp(1rem,4vw,3rem)] py-12">
      <header>
        <h1 className="text-2xl font-semibold">{employee.name} 님의 결과</h1>
        <p className="mt-1 text-sm text-neutral-500">{shownAt} 기준</p>
      </header>

      <section className="mt-10" aria-labelledby="radar-heading">
        <h2 id="radar-heading" className="text-lg font-medium">
          전체 프로파일
        </h2>
        <ScaleRadar scales={snapshot.scales} />
      </section>

      <section className="mt-10" aria-labelledby="bars-heading">
        <h2 id="bars-heading" className="text-lg font-medium">
          척도별 점수
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          각 척도의 획득 점수를 만점 대비 비율로 나타낸 값입니다.
        </p>
        <div className="mt-4">
          <ScaleBars scales={snapshot.scales} />
        </div>
      </section>

      <footer className="mt-12 rounded border border-neutral-200 bg-neutral-50 p-5 text-sm leading-relaxed text-neutral-600">
        <p>
          본 설문은 클로닝거(C. R. Cloninger)의 기질·성격 이론을 참고하여 사내에서 자체 제작한
          도구입니다. 공인된 심리검사가 아니며, 임상적 진단이나 인사평가의 근거로 사용될 수
          없습니다. 결과는 자기이해를 위한 참고 자료로만 활용해 주세요.
        </p>
      </footer>
    </main>
  )
}
```

> **G-09 준수**: `snapshot.scales`에는 7대척도만 들어 있다. 하위척도는 `result.scoresJson`에 있지만 이 화면에서 읽지 않는다.
> ⚠️ **G-12 변경 반영 필요**: D-10이 재응시 허용으로 바뀌었다. 이 화면에 다음을 추가해야 한다 — ① 결과 화면 하단 "다시 검사받기" 버튼(상시 활성) ② 상단 회차 선택(완료 세션이 2건 이상일 때만 노출). 현재 코드는 `findFirst` + `orderBy: completedAt desc`로 최신 1건만 읽으므로, 회차 목록 조회를 추가해야 한다.

- [ ] **Step 5: 수동 확인**

`npm run dev` 후 응시를 마치고 `/me`를 연다.
Expected: 레이더 차트에 7축이 표시되고, 막대 표에 척도별 퍼센트와 구간 문구가 나온다. 브라우저를 200%로 확대해도 가로 스크롤이 생기지 않는다. 새로고침해도 숫자가 동일하다.

- [ ] **Step 6: 커밋**

```bash
git add components/result lib/scale-meta.ts app/me
git commit -m "feat: personal result page with radar chart and accessible score table"
```

---

## Task 13: 관리자 사원 목록 — 보기 방식 전환 (훑어보기 / 사내 분포 위치 / 유형별)

`01-features-ux.md` §4.3 전체 구현. **익명 모드는 제외 확정**(`00` §2.8)이라 이름은 항상 그대로 표시한다 — `SHOW_NAMES` 같은 스위치를 두지 않는다.

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/employees/page.tsx`
- Create: `lib/admin-service.ts`

**Interfaces:**
- Consumes: Task 7 `requireAdmin`, Task 1 `db`
- Produces:
  - `type EmployeeRow = { id, name, status, completedAt, percents, qualityFlag }`
  - `async function listEmployees(filter): Promise<EmployeeRow[]>` — `filter.sortBy`로 특정 척도 정렬 (§4.3 보기1)
  - `async function getScaleDistribution(scale): Promise<ScaleDistribution>` — 히스토그램·평균·표준편차·높은순/낮은순 (§4.3 보기2)
  - `async function getCubeGroups(cube): Promise<CubeGroup[]>` — 기질/성격 큐브 8칸 (§4.3 보기3)

- [ ] **Step 1: `lib/admin-service.ts` 작성**

```ts
import { db } from './db'
import type { ResultSnapshot } from './result-service'
import type { ScaleCode } from './scoring/types'

export type EmployeeRow = {
  id: string
  name: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED'
  completedAt: Date | null
  percents: Partial<Record<ScaleCode, number>>
  qualityFlag: string | null
}

export type EmployeeFilter = {
  status?: EmployeeRow['status']
  query?: string
  sortBy?: ScaleCode // §4.3 보기1 — 열 머리 클릭 정렬
}

export async function listEmployees(filter: EmployeeFilter = {}): Promise<EmployeeRow[]> {
  const employees = await db.employee.findMany({
    orderBy: { name: 'asc' },
    include: {
      testSessions: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        include: { result: true, qualityFlag: true },
      },
    },
  })

  const rows: EmployeeRow[] = employees.map((employee) => {
    const session = employee.testSessions[0]
    const status: EmployeeRow['status'] = !session
      ? 'NOT_STARTED'
      : session.status === 'COMPLETED'
        ? 'COMPLETED'
        : 'IN_PROGRESS'

    const percents: Partial<Record<ScaleCode, number>> = {}
    if (session?.result) {
      const snapshot = session.result.snapshotJson as unknown as ResultSnapshot
      for (const s of snapshot.scales) percents[s.scale] = s.percent
    }

    return {
      id: employee.id,
      name: employee.name,
      status,
      completedAt: session?.completedAt ?? null,
      percents,
      qualityFlag: session?.qualityFlag?.flag ?? null,
    }
  })

  const filtered = rows.filter((row) => {
    if (filter.status && row.status !== filter.status) return false
    if (filter.query && !row.name.includes(filter.query)) return false
    return true
  })

  if (filter.sortBy) {
    const scale = filter.sortBy
    filtered.sort((a, b) => (b.percents[scale] ?? -1) - (a.percents[scale] ?? -1))
  }

  return filtered
}

export async function getSummary() {
  const [total, completed, inProgress] = await Promise.all([
    db.employee.count(),
    db.testSession.count({ where: { status: 'COMPLETED' } }),
    db.testSession.count({ where: { status: 'IN_PROGRESS' } }),
  ])
  return { total, completed, inProgress, notStarted: total - completed - inProgress }
}

// ── 보기 2: 사내 분포에서의 위치 (`01` §4.3 보기2) ──────────────────

const DISTRIBUTION_MIN_N = 30 // D-24 잠정값(`00` §1). 미만이면 평균·분포 비활성.

export type ScaleDistribution = {
  scale: ScaleCode
  n: number
  showStats: boolean
  mean: number | null
  stddev: number | null
  histogram: { bucketLabel: string; count: number }[]
  highest: { id: string; name: string; percent: number }[]
  lowest: { id: string; name: string; percent: number }[]
}

export async function getScaleDistribution(scale: ScaleCode): Promise<ScaleDistribution> {
  const rows = await listEmployees({ status: 'COMPLETED' })
  const scored = rows
    .filter((r) => r.percents[scale] !== undefined)
    .map((r) => ({ id: r.id, name: r.name, percent: r.percents[scale]! }))

  const n = scored.length
  const showStats = n >= DISTRIBUTION_MIN_N

  let mean: number | null = null
  let stddev: number | null = null
  const histogram = Array.from({ length: 5 }, (_, i) => ({
    bucketLabel: `${i * 20}-${i * 20 + 20}`,
    count: 0,
  }))

  if (n > 0) {
    const sum = scored.reduce((a, s) => a + s.percent, 0)
    mean = Math.round((sum / n) * 10) / 10
    const variance = scored.reduce((a, s) => a + (s.percent - mean!) ** 2, 0) / n
    stddev = Math.round(Math.sqrt(variance) * 10) / 10
    for (const s of scored) histogram[Math.min(4, Math.floor(s.percent / 20))].count += 1
  }

  const sorted = [...scored].sort((a, b) => b.percent - a.percent)

  // 정렬 리스트(높은순/낮은순)는 n과 무관하게 항상 표시한다 — `01` §4.3 보기2 규칙.
  return { scale, n, showStats, mean, stddev, histogram, highest: sorted.slice(0, 5), lowest: sorted.slice(-5).reverse() }
}

// ── 보기 3: 유형별 (기질/성격 큐브, `01` §4.3 보기3, `00` §2.2) ─────

// ⚠️ 고/저를 가르는 경계값이 `00`/`01`에 명시돼 있지 않다. 잠정적으로 척도 점수
// 50%를 기준으로 삼는다(D-26의 중립값 57.1%보다 낮게 잡음 — 중립 응답이 대부분
// "고" 쪽으로 쏠리지 않도록). 나중에 확정 필요 시 `00` §2.2에 별도 항목으로 추가한다.
const CUBE_SPLIT = 50

const TEMPERAMENT_AXES: ScaleCode[] = ['NS', 'HA', 'RD']
const CHARACTER_AXES: ScaleCode[] = ['SD', 'CO', 'ST']

export type CubeGroup = {
  key: string // 예: "NhR" — `00` §2.2 표기법
  members: { id: string; name: string }[]
}

export async function getCubeGroups(cube: 'temperament' | 'character'): Promise<CubeGroup[]> {
  const axes = cube === 'temperament' ? TEMPERAMENT_AXES : CHARACTER_AXES
  const rows = await listEmployees({ status: 'COMPLETED' })

  const groups = new Map<string, CubeGroup>()
  for (const row of rows) {
    if (axes.some((a) => row.percents[a] === undefined)) continue

    const key = axes
      .map((axis) => ((row.percents[axis] ?? 0) >= CUBE_SPLIT ? axis[0] : axis[0].toLowerCase()))
      .join('')

    const group = groups.get(key) ?? { key, members: [] }
    group.members.push({ id: row.id, name: row.name })
    groups.set(key, group)
  }

  return [...groups.values()].sort((a, b) => b.members.length - a.members.length)
}
```

- [ ] **Step 2: `app/admin/page.tsx` 작성**

```tsx
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/session'

export default async function AdminHome() {
  await requireAdmin()
  redirect('/admin/employees')
}
```

- [ ] **Step 3: `app/admin/employees/page.tsx` 작성 — 보기 전환 포함**

```tsx
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/session'
import {
  listEmployees,
  getSummary,
  getScaleDistribution,
  getCubeGroups,
  type EmployeeRow,
} from '@/lib/admin-service'
import { SCALE_META, SCALE_ORDER } from '@/lib/scale-meta'
import type { ScaleCode } from '@/lib/scoring/types'

const STATUS_LABEL = { COMPLETED: '완료', IN_PROGRESS: '진행 중', NOT_STARTED: '미응시' } as const
const VIEW_LABEL = { overview: '훑어보기', distribution: '사내 분포에서의 위치', cube: '유형별' } as const
type ViewMode = keyof typeof VIEW_LABEL

type SearchParams = {
  status?: string
  q?: string
  sortBy?: string
  view?: string
  scale?: string
  cube?: string
}

export default async function EmployeeListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const params = await searchParams

  const view: ViewMode = (Object.keys(VIEW_LABEL) as ViewMode[]).includes(params.view as ViewMode)
    ? (params.view as ViewMode)
    : 'overview'

  const summary = await getSummary()

  return (
    <main className="mx-auto w-full px-[clamp(1rem,4vw,3rem)] py-10">
      <h1 className="text-2xl font-semibold">사원 목록</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['전체 인원', summary.total],
          ['응시 완료', summary.completed],
          ['진행 중', summary.inProgress],
          ['미응시', summary.notStarted],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded border border-neutral-200 p-4">
            <dt className="text-sm text-neutral-500">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <nav className="mt-8 flex gap-1 border-b border-neutral-200" aria-label="사원 목록 보기 방식">
        {(Object.keys(VIEW_LABEL) as ViewMode[]).map((v) => (
          <Link
            key={v}
            href={`/admin/employees?view=${v}`}
            aria-current={v === view ? 'page' : undefined}
            className={[
              'border-b-2 px-3 py-2 text-sm',
              v === view ? 'border-neutral-900 font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-800',
            ].join(' ')}
          >
            {VIEW_LABEL[v]}
          </Link>
        ))}
      </nav>

      {view === 'overview' && <OverviewView params={params} />}
      {view === 'distribution' && (
        <DistributionView scale={SCALE_ORDER.find((s) => s === params.scale) ?? 'NS'} />
      )}
      {view === 'cube' && <CubeView cube={params.cube === 'character' ? 'character' : 'temperament'} />}
    </main>
  )
}

// ── 보기 1: 훑어보기 ──────────────────────────────────────────────

async function OverviewView({ params }: { params: SearchParams }) {
  const status = (['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED'] as const).find((s) => s === params.status)
  const sortBy = SCALE_ORDER.find((s) => s === params.sortBy)
  const rows = await listEmployees({ status, query: params.q, sortBy })

  function sortLink(code: ScaleCode) {
    const qs = new URLSearchParams({ view: 'overview', sortBy: code })
    if (params.q) qs.set('q', params.q)
    if (status) qs.set('status', status)
    return `/admin/employees?${qs.toString()}`
  }

  return (
    <>
      <form className="mt-6 flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value="overview" />
        <label className="flex flex-col gap-1 text-sm">
          <span>이름 검색</span>
          <input name="q" defaultValue={params.q ?? ''} className="rounded border border-neutral-300 px-3 py-1.5" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>상태</span>
          <select name="status" defaultValue={params.status ?? ''} className="rounded border border-neutral-300 px-3 py-1.5">
            <option value="">전체</option>
            <option value="COMPLETED">완료</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="NOT_STARTED">미응시</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">적용</button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left">
              <th scope="col" className="py-2 pr-4">이름</th>
              <th scope="col" className="py-2 pr-4">상태</th>
              <th scope="col" className="py-2 pr-4">응시일</th>
              {SCALE_ORDER.map((code) => (
                <th key={code} scope="col" className="py-2 pr-3 text-right">
                  <Link href={sortLink(code)} className={sortBy === code ? 'underline' : 'hover:underline'}>
                    {SCALE_META[code].nameKo}
                  </Link>
                </th>
              ))}
              <th scope="col" className="py-2 pr-4">품질</th>
              <th scope="col" className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                <td className="py-2.5 pr-4">{STATUS_LABEL[row.status]}</td>
                <td className="py-2.5 pr-4 tabular-nums text-neutral-500">
                  {row.completedAt ? new Date(row.completedAt).toLocaleDateString('ko-KR') : '—'}
                </td>
                {SCALE_ORDER.map((code) => (
                  <td key={code} className="py-2.5 pr-3">
                    {row.percents[code] === undefined ? (
                      <span className="block text-right text-neutral-300">—</span>
                    ) : (
                      // 색 없이 막대 높이만으로 표현 (`01` §2.2·§4.3 원칙)
                      <div className="ml-auto flex h-4 w-16 items-end gap-px" title={`${row.percents[code]}%`}>
                        <div
                          className="w-full bg-neutral-700"
                          style={{ height: `${Math.max(8, row.percents[code]!)}%` }}
                        />
                      </div>
                    )}
                  </td>
                ))}
                <td className="py-2.5 pr-4">
                  {row.qualityFlag === 'review' ? '검토 필요' : row.qualityFlag === 'ok' ? '정상' : '—'}
                </td>
                <td className="py-2.5">
                  {row.status === 'COMPLETED' && (
                    <Link href={`/admin/employees/${row.id}`} className="underline">상세</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── 보기 2: 사내 분포에서의 위치 ───────────────────────────────────

async function DistributionView({ scale }: { scale: ScaleCode }) {
  const dist = await getScaleDistribution(scale)
  const maxCount = Math.max(1, ...dist.histogram.map((h) => h.count))

  return (
    <section className="mt-6 rounded border border-neutral-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">n={dist.n} 기준. 참고용입니다.</p>
        <div className="flex flex-wrap gap-1">
          {SCALE_ORDER.map((code) => (
            <Link
              key={code}
              href={`/admin/employees?view=distribution&scale=${code}`}
              className={[
                'rounded px-2.5 py-1 text-sm',
                code === scale ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700',
              ].join(' ')}
            >
              {SCALE_META[code].nameKo}
            </Link>
          ))}
        </div>
      </div>

      {!dist.showStats && (
        <p className="mt-4 text-sm text-amber-700">
          n이 {dist.n}명으로 30명 미만이라 분포·평균 표시를 비활성화했습니다.
        </p>
      )}

      {dist.showStats && (
        <>
          <div className="mt-6 flex h-24 items-end gap-2">
            {dist.histogram.map((h) => (
              <div key={h.bucketLabel} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full bg-neutral-700"
                  style={{ height: `${(h.count / maxCount) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }}
                />
                <span className="text-[10px] text-neutral-400">{h.bucketLabel}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            평균 {dist.mean} · 표준편차 {dist.stddev}
          </p>
        </>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-neutral-700">이 척도 점수가 높은 순</h3>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {dist.highest.map((p) => (
              <li key={p.id}>{p.name} {p.percent}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-neutral-700">이 척도 점수가 낮은 순</h3>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {dist.lowest.map((p) => (
              <li key={p.id}>{p.name} {p.percent}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// ── 보기 3: 유형별 ──────────────────────────────────────────────

async function CubeView({ cube }: { cube: 'temperament' | 'character' }) {
  const groups = await getCubeGroups(cube)

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">훑어보기용입니다. 통계가 아닙니다.</p>
        <div className="flex gap-1">
          <Link
            href="/admin/employees?view=cube&cube=temperament"
            className={['rounded px-2.5 py-1 text-sm', cube === 'temperament' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'].join(' ')}
          >
            기질 (NS·HA·RD)
          </Link>
          <Link
            href="/admin/employees?view=cube&cube=character"
            className={['rounded px-2.5 py-1 text-sm', cube === 'character' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'].join(' ')}
          >
            성격 (SD·CO·ST)
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <div key={g.key} className="rounded border border-neutral-200 p-3">
            <p className="font-mono text-sm text-neutral-500">{g.key}</p>
            <p className="mt-1 text-lg font-semibold">{g.members.length}명</p>
            <p className="mt-2 text-sm text-neutral-600">{g.members.map((m) => m.name).join(', ')}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

> **G-13 준수**: 미응시자 행에 독려 버튼이 없다. 상태만 표시한다.
> **F-12 제외 준수**: 부서 필터가 없다.
> 표는 `max-width` 없이 전체 폭을 쓰고 좁아지면 `overflow-x-auto`로 가로 스크롤한다.
> **익명 모드 없음**: `00` §2.8 확정에 따라 관리자 화면은 항상 실명이다. 스위치 자체가 없으므로 끄고 켜는 코드 경로도 없다.

- [ ] **Step 4: 수동 확인**

`관리자` 계정으로 로그인해 `/admin/employees`를 연다.
Expected: 요약 카드 4개, 보기 탭 3개(훑어보기/사내 분포에서의 위치/유형별)가 뜬다. 훑어보기에서 척도 열 머리를 클릭하면 그 척도 기준으로 정렬된다. 사내 분포에서의 위치 탭에서 응답 30명 미만이면 "비활성화" 안내만 뜨고 높은순/낮은순 목록은 그대로 나온다. 유형별 탭에서 기질/성격 8칸이 나뉘어 보인다. 일반 사원 계정으로 접근하면 `/me`로 리다이렉트된다.

- [ ] **Step 5: 커밋**

```bash
git add lib/admin-service.ts app/admin
git commit -m "feat: admin employee list with overview/distribution/cube views"
```

---

## Task 14: 관리자 개인 상세 + 감사 로그

**Files:**
- Create: `lib/audit.ts`, `app/admin/employees/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 7 `requireAdmin`, Task 12 `ScaleRadar` `ScaleBars`
- Produces:
  - `async function recordAudit(input: { actorId: string; action: string; targetEmployeeId?: string }): Promise<void>`

- [ ] **Step 1: `lib/audit.ts` 작성**

```ts
import { db } from './db'

export const AUDIT_ACTIONS = {
  VIEW_INDIVIDUAL_RESULT: 'VIEW_INDIVIDUAL_RESULT',
} as const

export async function recordAudit(input: {
  actorId: string
  action: string
  targetEmployeeId?: string
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetEmployeeId: input.targetEmployeeId ?? null,
    },
  })
}
```

- [ ] **Step 2: `app/admin/employees/[id]/page.tsx` 작성**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { ScaleRadar } from '@/components/result/ScaleRadar'
import { ScaleBars } from '@/components/result/ScaleBars'
import type { ResultSnapshot } from '@/lib/result-service'
import type { ScoreResult } from '@/lib/scoring/types'

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await requireAdmin()
  const { id } = await params

  // 조회 기록을 먼저 남긴다. 데이터를 읽기 전에 기록해야 우회가 불가능하다.
  await recordAudit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.VIEW_INDIVIDUAL_RESULT,
    targetEmployeeId: id,
  })

  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      testSessions: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 1,
        include: { result: true, qualityFlag: true },
      },
    },
  })

  if (!employee) notFound()

  const session = employee.testSessions[0]
  if (!session?.result) notFound()

  const snapshot = session.result.snapshotJson as unknown as ResultSnapshot
  const scores = session.result.scoresJson as unknown as ScoreResult
  const quality = session.qualityFlag

  return (
    <main className="mx-auto w-full max-w-4xl px-[clamp(1rem,4vw,3rem)] py-10">
      <Link href="/admin/employees" className="text-sm underline">
        ← 목록으로
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold">
          {employee.name} · 개인 결과
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {session.completedAt ? new Date(session.completedAt).toLocaleDateString('ko-KR') : ''} 응시
          {session.durationSec ? ` · 소요 ${Math.round(session.durationSec / 60)}분` : ''}
          {` · 버전 v${session.assessmentVersion}`}
        </p>
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          이 화면의 조회 기록이 저장되었습니다.
        </p>
      </header>

      <section className="mt-8">
        <ScaleRadar scales={snapshot.scales} />
        <div className="mt-6">
          <ScaleBars scales={snapshot.scales} />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="admin-only">
        <h2 id="admin-only" className="text-lg font-medium">
          관리자 전용 정보
        </h2>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
          <div>
            <dt className="text-neutral-500">응답 품질</dt>
            <dd className="mt-1 font-medium">
              {quality?.flag === 'review' ? '검토 필요' : '정상'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">평균 응답시간</dt>
            <dd className="mt-1 tabular-nums">
              {quality ? `${(quality.meanElapsedMs / 1000).toFixed(1)}초/문항` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">역채점 일치도</dt>
            <dd className="mt-1 tabular-nums">{quality?.antonymAgreement.toFixed(2) ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">빠른 응답 수</dt>
            <dd className="mt-1 tabular-nums">{quality?.fastCount ?? '—'}</dd>
          </div>
        </dl>

        <h3 className="mt-8 text-base font-medium">하위척도 원점수</h3>
        <p className="mt-1 text-sm text-neutral-500">
          하위척도 수준은 통계적 근거가 약해 사원 화면에는 표시하지 않습니다. 문항 분석 참고용입니다.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left">
                <th scope="col" className="py-2 pr-4">하위척도</th>
                <th scope="col" className="py-2 pr-4">척도</th>
                <th scope="col" className="py-2 pr-4 text-right">원점수</th>
                <th scope="col" className="py-2 text-right">만점 대비</th>
              </tr>
            </thead>
            <tbody>
              {scores.subscales.map((s) => (
                <tr key={s.subscale} className="border-b border-neutral-100">
                  <td className="py-2 pr-4">{s.subscale}</td>
                  <td className="py-2 pr-4 text-neutral-500">{s.scale}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {s.raw} / {s.max}
                  </td>
                  <td className="py-2 text-right tabular-nums">{s.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: 감사 로그 기록 확인**

관리자로 로그인해 개인 상세를 연 뒤:

```bash
npx prisma studio
```

`AuditLog` 테이블에 `action = VIEW_INDIVIDUAL_RESULT` 행이 생겼는지, `actorId`와 `targetEmployeeId`가 맞는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add lib/audit.ts "app/admin/employees/[id]"
git commit -m "feat: admin individual result view with audit logging"
```

---

## Task 15: 랜딩·고지 화면 + 프로덕션 이미지

**Files:**
- Create: `Dockerfile`, `.dockerignore`
- Modify: `app/page.tsx`, `app/layout.tsx`
- Modify: `docker-compose.yml` (app 서비스 추가)

**Interfaces:**
- Consumes: 전 태스크
- Produces: `docker compose up`으로 기동되는 프로덕션 이미지

- [ ] **Step 1: `app/layout.tsx` 작성**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '7차원 성향 설문',
  description: '사내 성향 이해 설문',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: `app/page.tsx` 작성 (고지 화면)**

```tsx
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-[clamp(1rem,4vw,3rem)] py-16">
      <h1 className="text-3xl font-semibold">7차원 성향 설문</h1>

      <ul className="mt-6 space-y-1 text-neutral-700">
        <li>약 15분 소요, 105문항</li>
        <li>중간에 그만두어도 이어서 하실 수 있습니다</li>
      </ul>

      <section className="mt-10 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-medium">이 설문은 무엇에 쓰이나요</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-700">
          <li>구성원의 자기이해를 돕기 위한 자료입니다</li>
          <li>인사평가, 승진, 배치의 근거로 사용되지 않습니다</li>
          <li>관리자는 분석 목적으로 결과를 조회할 수 있으며, 조회 기록이 남습니다</li>
        </ul>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-medium">정확한 결과를 위해</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-700">
          <li>좋아 보이는 답이 아니라 평소 자신에 가까운 답을 골라주세요</li>
          <li>정답과 오답이 없습니다</li>
          <li>오래 고민하지 말고 첫 느낌으로 답해주세요</li>
        </ul>
      </section>

      <p className="mt-10 border-t border-neutral-200 pt-8 text-sm leading-relaxed text-neutral-500">
        본 설문은 클로닝거(C. R. Cloninger)의 기질·성격 이론을 참고하여 사내에서 자체 제작한
        도구입니다. 공인된 심리검사가 아니며, 임상적 진단이나 인사평가의 근거로 사용될 수 없습니다.
      </p>

      <Link
        href="/login"
        className="mt-10 inline-block rounded bg-neutral-900 px-6 py-3 text-white"
      >
        설문 시작하기
      </Link>
    </main>
  )
}
```

> **G-13 준수**: "필수", 마감일, 카운트다운이 없다. "참여 자유"라는 선언도 넣지 않았다 (U-06 미결정).

- [ ] **Step 3: `.dockerignore` 작성**

```
node_modules
.next
.git
.env
docs
```

- [ ] **Step 4: `Dockerfile` 작성**

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 5: `docker-compose.yml`에 app 서비스 추가**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: survey
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: survey
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    restart: unless-stopped
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://survey:${POSTGRES_PASSWORD}@db:5432/survey?schema=public
      SESSION_COOKIE_NAME: sds_session
      SESSION_TTL_HOURS: "12"
    ports:
      - "3000:3000"

volumes:
  pgdata:
```

- [ ] **Step 6: 이미지 빌드 및 기동 확인**

```bash
docker compose build app
docker compose up -d
```

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: `200`

- [ ] **Step 7: 전체 테스트 실행**

```bash
npm run test
```

Expected: 전 테스트 PASS

- [ ] **Step 8: 커밋**

```bash
git add Dockerfile .dockerignore docker-compose.yml app/page.tsx app/layout.tsx
git commit -m "feat: landing page with disclosure and production Docker image"
```

---

## Task 16: 결과 해설 콘텐츠 — 척도 설명 + 구간별 서술 (A+B)

> ⚠️ **1차 배포는 서술 없이 숫자만입니다(`01` §3.3.1 확정).** 이 태스크 대부분(B, 21개)은 2차로 미룹니다.
> **단, A(척도 설명 7개)만은 Task 22(관리자 개인상세 — 척도 정의 클릭 설명)에서 선행 필요**하므로 그만큼은 1차에 포함됩니다. 나머지(B 21개, 착수 시점 별도 확정 필요)는 사람이 검토해야 하는 콘텐츠 작업입니다.

**배경** — Task 12의 결과 화면은 현재 레이더 차트·막대·퍼센트 숫자만 표시하고 **설명 문장이 한 줄도 없습니다.** 사원이 "자극추구 62%"를 보고도 그게 뭔지 알 수 없습니다. 이 태스크가 그 빈칸을 채웁니다.

**범위: A + B (총 28개 글). C(큐브 조합 해설 16개 — 기질 8 + 성격 8, 서로 곱하지 않음)는 P2로 미룸**

> ⚠️ **정정**: C는 초안에서 "기질 큐브 × 성격 큐브 = 64개"로 잘못 계산됐던 것을 "기질 8개 + 성격 8개 = 16개(각 독립)"로 정정했습니다(`00` §2.2). 전체 콘텐츠 총량은 A(7) + B(21) + C(16) = **44개**입니다.

| 구분 | 개수 | 내용 |
|---|---|---|
| **A. 척도 설명** | 7개 | 각 척도가 무엇을 재는지. 점수와 무관하게 항상 같은 문장 |
| **B. 구간별 서술** | 21개 | 7척도 × 3구간(`upper`/`middle`/`lower`). 그 사람 점수에 따라 하나만 선택되어 표시 |

**Files:**
- Create: `data/interpretations/scales.yaml` (A — 척도 설명 7개)
- Create: `data/interpretations/bands.yaml` (B — 구간별 서술 21개)
- Create: `lib/interpretation/schema.ts`, `lib/interpretation/load.ts`, `lib/interpretation/load.test.ts`
- Modify: `app/me/page.tsx` — 서술 표시 추가
- Modify: `app/admin/employees/[id]/page.tsx` — 동일 서술 표시

**Interfaces:**
- Consumes: Task 5 `ScaleCode`, `Band`
- Produces:
  - `type ScaleExplanation = { scale: ScaleCode; whatItMeasures: string }`
  - `type BandNarrative = { scale: ScaleCode; band: Band; text: string }`
  - `function loadInterpretations(dir: string): { scales: ScaleExplanation[]; bands: BandNarrative[] }`

### 작성 규칙 (G-10 / G-11 준수 — 이게 이 태스크의 핵심 난이도)

```
1. 유형명을 붙이지 않는다
   ✗ "당신은 탐험가형입니다"
   ✓ (유형명 자체를 안 씀)

2. 우열 함의를 넣지 않는다
   ✗ "자극추구가 높습니다 / 낮습니다"
   ✓ "자극추구 성향이 상대적으로 두드러집니다 / 덜 두드러집니다"

3. 단정하지 않는다
   ✗ "당신은 충동적인 사람입니다"
   ✓ "이 결과는 새로운 자극에 끌리는 경향을 보여줍니다"

4. 교정 지시를 하지 않는다
   ✗ "계획성을 기르는 것이 필요합니다"
   ✓ "미리 계획을 세워두면 도움이 될 수 있습니다"

5. middle 구간을 "애매함"으로 쓰지 않는다
   ✗ "특별한 경향이 나타나지 않았습니다"
   ✓ "상황에 따라 양쪽 모습이 모두 나타나는 편입니다"
```

**5번이 특히 중요합니다.** 구간 경계가 임의값(50/65, D-26 확정)이라 상당수가 `middle`로 분류될 수 있는데, `middle` 서술이 부실하면 "내 결과는 아무것도 안 나왔다"는 인상을 줍니다.

### 파일 형식

`data/interpretations/scales.yaml` — A

```yaml
scales:
  - scale: NS
    nameKo: 자극추구
    whatItMeasures: >
      새로운 자극이나 경험에 얼마나 끌리는지를 봅니다.
      낯선 상황에서 흥미를 느끼는 정도, 즉흥적으로 움직이는 정도가 여기 반영됩니다.
    sourceRef: "TCI-RS NS 척도 정의 (이숙희·황순택 2011)"
```

`data/interpretations/bands.yaml` — B

```yaml
bands:
  - scale: NS
    band: upper
    text: >
      새로운 것에 끌리는 경향이 상대적으로 두드러집니다.
      해보지 않은 방식을 시도하는 데 거부감이 적은 편이고,
      반복적인 일이 이어지면 흥미가 빨리 줄어들 수 있습니다.
  - scale: NS
    band: middle
    text: >
      상황에 따라 새로운 시도와 익숙한 방식을 모두 택하는 편입니다.
      한쪽으로 크게 치우치지 않는 응답 양상을 보였습니다.
  - scale: NS
    band: lower
    text: >
      익숙하고 예측 가능한 방식을 선호하는 경향이 나타납니다.
      변화보다 안정을 택하는 쪽에 가까운 응답을 하셨습니다.
```

### 화면에서의 배치

Task 12의 결과 화면에 세 번째 섹션으로 들어갑니다.

```
┌──────────────────────────────────────┐
│  레이더 차트                          │   ← Task 12 (있음)
├──────────────────────────────────────┤
│  척도별 점수 (막대 + %)                │   ← Task 12 (있음)
├──────────────────────────────────────┤
│  결과 읽기                            │   ← Task 16 (신규)
│                                      │
│  자극추구                             │
│    새로운 자극이나 경험에 얼마나...     │   ← A: 척도 설명 (항상 동일)
│    ─────────────────────────         │
│    새로운 것에 끌리는 경향이 상대적...   │   ← B: 이 사람 구간에 맞는 서술
│                                      │
│  위험회피                             │
│    ... (7척도 반복)                   │
├──────────────────────────────────────┤
│  ⚠ 사내 자체 제작 도구 고지문          │   ← Task 12 (있음)
└──────────────────────────────────────┘
```

- [ ] **Step 1: 스키마와 로더 작성 (테스트 먼저)**

문항 로더(Task 2)와 같은 패턴. 검증 항목:
- 7개 척도가 빠짐없이 있는가
- 각 척도마다 `upper`/`middle`/`lower` 3개가 모두 있는가 (21개 정확히)
- 금지 표현(`높음`, `낮음`, `미성숙`, `취약`, `당신은`, `개선이 필요`)이 없는가
- 모든 항목에 `sourceRef`가 있는가

- [ ] **Step 2: 글 28개 작성**

위 작성 규칙과 파일 형식에 따라 작성. **사용자 검토 없이 완료 처리하지 않는다.**

- [ ] **Step 3: 결과 화면에 연결**

`app/me/page.tsx`와 관리자 개인 상세에 "결과 읽기" 섹션 추가.

- [ ] **Step 4: 커밋**

---

## Task 17: 관리자 공통 레이아웃 + 진입 동선

**배경** — 현재 계획에는 관리자 화면들이 있지만 **서로 이동할 방법이 없습니다.** URL을 직접 입력해야만 접근 가능하고, 관리자가 로그인해도 관리자 화면이 있다는 걸 알 수 없습니다.

**Files:**
- Create: `app/admin/layout.tsx`
- Modify: `app/me/page.tsx` — 관리자에게만 보이는 이동 버튼

**Interfaces:**
- Consumes: Task 7 `requireAdmin`, `getCurrentEmployee`

**진입 동선 (사용자 확정)**

```
로그인 화면은 하나. 계정의 role로 갈림.

[일반 사원이 /me]              [관리자가 /me]
  내 결과                        내 결과
  (관리자 링크 없음)              우측 상단 [관리자 화면] 버튼
```

- 별도 관리자 로그인 화면을 만들지 않음
- 버튼 노출은 편의일 뿐, **실제 차단은 서버에서** (`requireAdmin()`이 USER를 `/me`로 리다이렉트). 버튼이 안 보인다고 보안이 되는 게 아님 (G-17)

**관리자 공통 메뉴**

```
┌────────────────────────────────────────────────┐
│  7차원 성향 설문 · 관리자          [내 결과로]  │
│  ─────────────────────────────────────────────  │
│  대시보드 │ 사원 목록 │ 감사 로그 │ 통계 │ 문항  │
└────────────────────────────────────────────────┘
```

- [ ] **Step 1: `app/admin/layout.tsx` 작성** — 상단 메뉴 + 현재 위치 표시
- [ ] **Step 2: `/me`에 조건부 버튼 추가** — `employee.role === 'ADMIN'`일 때만
- [ ] **Step 3: 수동 확인** — 일반 계정으로 로그인 시 버튼이 안 보이고, `/admin` 직접 입력 시 `/me`로 튕기는지 확인
- [ ] **Step 4: 커밋**

---

## Task 18: 감사 로그 화면 + 사원 추가

`01-features-ux.md` §4.6 구현. **D-25가 A안으로 확정되어 사원 추가는 필수가 아닌 편의 기능입니다** — 사원이 로그인만 해도 계정이 생기므로, 이 기능은 관리자가 명단을 미리 넣어두고 싶을 때만 씁니다. 감사 로그 조회 화면은 그대로 필수입니다.

**Files:**
- Create: `app/admin/audit/page.tsx`
- Create: `app/api/admin/employees/route.ts` (POST — 사원 추가)
- Modify: `lib/audit.ts` — `ADD_EMPLOYEE` 액션 추가, 목록 조회 함수

**Interfaces:**
- Produces:
  - `async function listAuditLogs(filter): Promise<AuditRow[]>`
  - `AUDIT_ACTIONS.ADD_EMPLOYEE`

**화면 구성** (§4.6 목업 참조)

```
등록 인원 · 응시 완료 · 미응시 요약 카드      [+ 사원 추가]
─────────────────────────────────────────────
조회 기록  [관리자 ▾] [기간 ▾]
시각 │ 조회자 │ 대상 │ 동작
```

- [ ] **Step 1: `listAuditLogs()` + `ADD_EMPLOYEE` 액션 추가**
- [ ] **Step 2: 감사 로그 목록 화면**
- [ ] **Step 3: 사원 추가 모달 + API**

**반드시 지킬 것**: 저장 전 `normalizePhone()` 통과. 진입점은 로그인과 이 화면 두 곳이며 **둘 다 예외 없음** (CSV 업로드는 A안 확정으로 만들지 않음). 중복 시 에러 표시.

- [ ] **Step 4: 추가 행위를 감사 로그에 기록** — `action: 'ADD_EMPLOYEE'`

- [ ] **Step 5: 구성원 삭제 (F-33)** — `DELETE /api/admin/employees/[id]`

`01-features-ux.md` §4.6 구현. 구성원 목록 행 메뉴와 개인 결과 상세 양쪽에 배치한다.

```ts
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await context.params

  const target = await db.employee.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!target) return NextResponse.json({ error: '대상을 찾을 수 없습니다.' }, { status: 404 })

  // 관리자는 삭제 불가 — 마지막 관리자를 지우면 아무도 관리자 화면에 못 들어간다.
  if (target.role === 'ADMIN') {
    return NextResponse.json({ error: '관리자 계정은 삭제할 수 없습니다.' }, { status: 400 })
  }

  // 감사 로그를 먼저 남긴다. 이름 스냅샷이 없으면 삭제 후 대상을 알 수 없다.
  await recordAudit({
    actorId: admin.id,
    action: AUDIT_ACTIONS.DELETE_EMPLOYEE,
    targetEmployeeId: target.id,
    targetName: target.name,
  })

  // AuthSession / TestSession / Response / Result / QualityFlag는 onDelete: Cascade로 함께 삭제된다.
  // AuditLog는 FK 관계가 없으므로 남는다 — 의도된 동작이다.
  await db.employee.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
```

`recordAudit()`에 `targetName` 파라미터를 추가한다. 다른 액션에서는 생략 가능.

**확인 UI**: 단순 확인 버튼이 아니라 **대상자 이름을 직접 입력해야** 삭제 버튼이 활성화되게 한다. 되돌릴 수 없는 동작이라 오클릭 방지가 필요하다.

**"응시 초기화"와 문구를 명확히 구분한다** — 화면에서 두 동작이 나란히 보이므로 "응시 기록 초기화"(응답만 삭제, 계정 유지) / "구성원 삭제"(계정까지 삭제)로 표기한다.

- [ ] **Step 6: 커밋**

---

## Task 19: 요약 대시보드

현재 `/admin`은 목록으로 리다이렉트만 합니다. 실제 대시보드로 교체합니다. (`01` §4.2)

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `lib/admin-service.ts` — 척도별 평균 계산 추가

```
┌──────────┬──────────┬──────────┬──────────┐
│ 전체 인원 │ 응시 완료 │  진행 중  │  미응시   │
│    42    │ 28 (67%) │    5     │    9     │
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────────────────────────────┐
│  척도별 사내 평균                  [상세 →]  │
│  NS ████████░░  54    SD ███████████░  68   │
└─────────────────────────────────────────────┘
```

- [ ] **Step 1: 척도별 평균 계산 함수 + 테스트**
- [ ] **Step 2: 요약 카드 4종**
- [ ] **Step 3: 척도별 평균 막대**
- [ ] **Step 4: 커밋**

> `n < 30`일 때 "표본이 작아 참고용" 경고를 상시 노출한다 (`01` §4.5 원칙).

---

## Task 20: 통계 화면 + CSV 내보내기

**Files:**
- Create: `app/admin/stats/page.tsx`
- Create: `app/api/admin/export/route.ts`

**통계 화면** (`01` §4.5) — 척도 선택 → 분포 히스토그램 + 평균·표준편차·n. `n<30` 경고 상시 노출.

**CSV 내보내기** (`01` §4.3) — **반드시 `listEmployees()` 재사용.** DB 직접 조회 금지.

| 컬럼 | 포함 |
|---|---|
| 이름 · 부서 | 포함 |
| **전화번호** | **항상 제외** — 성향 분석에 불필요한 개인정보 |
| 척도별 점수(7개) · 응시일 · 소요시간 · 품질 플래그 | 포함 |

- [ ] **Step 1: 척도별 분포 계산 + 테스트**
- [ ] **Step 2: 통계 화면**
- [ ] **Step 3: CSV 생성 + 감사 로그(`EXPORT_CSV`, 행 수 기록)**
- [ ] **Step 4: 커밋**

---

## Task 21: 문항 목록 화면 (읽기 전용)

관리자가 현재 활성 문항을 확인만 하는 화면. 편집은 파일+seed로 하므로 여기서는 조회만 합니다.

**Files:**
- Create: `app/admin/items/page.tsx`

섹션별로 묶어서 문항 코드·내용·척도·하위척도·역채점 여부·근거 출처(`sourceRef`)를 표로 표시.

> **`sourceRef`를 화면에 노출하는 이유**: "이 문항이 어디서 왔는지"를 관리자가 확인할 수 있어야 저작권 대응(§5)이 말로만 끝나지 않습니다.

- [ ] **Step 1: 문항 목록 화면**
- [ ] **Step 2: 커밋**

---

## Task 22: 척도 정의 클릭 설명 (관리자+사원 공통) + 관리자 응시 초기화

`01-features-ux.md` §3.2, §4.4 구현. (F-29, F-30, U-09)

**Files:**
- Create: `data/interpretations/scales.yaml` (A — 척도 정의 7개만. B는 Task 16에서 나중에)
- Create: `lib/interpretation/schema.ts`, `lib/interpretation/load.ts`
- Create: `components/ScaleInfoPopover.tsx` — 관리자·사원 화면 공통 컴포넌트
- Modify: `app/me/page.tsx` — ⓘ 팝오버 추가 (U-09 확정: 사원 화면도 포함)
- Modify: `app/admin/employees/[id]/page.tsx` — ⓘ 팝오버 + 초기화 버튼
- Create: `app/api/admin/employees/[id]/reset/route.ts`

**척도 정의 클릭 설명**

- [ ] **Step 1: `scales.yaml` 7개 작성 + 로더/테스트** (Task 2 패턴과 동일 — 7개 척도 전부 존재하는지, `sourceRef` 있는지 검증)
- [ ] **Step 2: `<ScaleInfoPopover scale={code} />` 컴포넌트 작성** — `ScaleBars`(Task 12에서 이미 만든 컴포넌트)가 이걸 각 행에 렌더링하도록 수정. 관리자·사원 양쪽에서 같은 컴포넌트를 재사용하므로 `app/me/page.tsx`와 `app/admin/employees/[id]/page.tsx` 둘 다 자동으로 적용됨

**응시 초기화**

- [ ] **Step 3: `POST /api/admin/employees/[id]/reset` 작성**

```ts
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await context.params

  const session = await db.testSession.findFirst({
    where: { employeeId: id, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
  })
  if (!session) return NextResponse.json({ error: '완료된 응시가 없습니다.' }, { status: 400 })

  await db.$transaction([
    db.response.deleteMany({ where: { sessionId: session.id } }),
    db.result.deleteMany({ where: { sessionId: session.id } }),
    db.qualityFlag.deleteMany({ where: { sessionId: session.id } }),
    db.testSession.update({ where: { id: session.id }, data: { status: 'ABANDONED' } }),
  ])

  await recordAudit({ actorId: admin.id, action: 'RESET_ASSESSMENT', targetEmployeeId: id })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: 확인 모달 포함 버튼 UI** — "되돌릴 수 없습니다" 문구, 실수 클릭 방지
- [ ] **Step 5: 수동 확인** — 초기화 후 해당 사원으로 재로그인 시 `/test`에서 새 세션이 시작되는지, 감사 로그(§4.6)에 `RESET_ASSESSMENT`가 기록되는지 확인
- [ ] **Step 6: 커밋**

---

## Task 23: 30일 경과 세션 자동 정리 (F-31)

`01-features-ux.md` §2.6 구현. 전용 배치/cron 없이, 이미 호출되는 함수 두 곳에 스윕 한 줄을 끼워 넣는다.

**Files:**
- Modify: `lib/session-service.ts` — `sweepStaleSessions()` 추가, `getOrCreateSession()`에서 호출
- Modify: `lib/admin-service.ts` — `getSummary()`, `listEmployees()`에서 호출

**Interfaces:**
- Produces: `function sweepStaleSessions(employeeId?: string): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/session-service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { sweepStaleSessions } from './session-service'

describe('sweepStaleSessions', () => {
  it('30일 넘은 IN_PROGRESS 세션을 ABANDONED로 바꾼다', async () => {
    const employee = await db.employee.create({ data: { name: '테스트', phone: '01000000001' } })
    const assessment = await db.assessment.findFirstOrThrow({ where: { isActive: true } })
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    const session = await db.testSession.create({
      data: { employeeId: employee.id, assessmentId: assessment.id, assessmentVersion: assessment.version, startedAt: old },
    })

    await sweepStaleSessions(employee.id)

    const updated = await db.testSession.findUniqueOrThrow({ where: { id: session.id } })
    expect(updated.status).toBe('ABANDONED')
  })

  it('30일 안 된 세션은 건드리지 않는다', async () => {
    const employee = await db.employee.create({ data: { name: '테스트2', phone: '01000000002' } })
    const assessment = await db.assessment.findFirstOrThrow({ where: { isActive: true } })
    const session = await db.testSession.create({
      data: { employeeId: employee.id, assessmentId: assessment.id, assessmentVersion: assessment.version },
    })

    await sweepStaleSessions(employee.id)

    const updated = await db.testSession.findUniqueOrThrow({ where: { id: session.id } })
    expect(updated.status).toBe('IN_PROGRESS')
  })

  it('employeeId를 안 주면 전체를 스윕한다', async () => {
    const employee = await db.employee.create({ data: { name: '테스트3', phone: '01000000003' } })
    const assessment = await db.assessment.findFirstOrThrow({ where: { isActive: true } })
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    const session = await db.testSession.create({
      data: { employeeId: employee.id, assessmentId: assessment.id, assessmentVersion: assessment.version, startedAt: old },
    })

    await sweepStaleSessions()   // 인자 없음 — 전체 스윕

    const updated = await db.testSession.findUniqueOrThrow({ where: { id: session.id } })
    expect(updated.status).toBe('ABANDONED')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/session-service.test.ts`
Expected: FAIL — `sweepStaleSessions is not a function`

- [ ] **Step 3: `lib/session-service.ts`에 함수 추가**

```ts
const STALE_DAYS = 30

export async function sweepStaleSessions(employeeId?: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
  await db.testSession.updateMany({
    where: {
      status: 'IN_PROGRESS',
      startedAt: { lt: cutoff },
      ...(employeeId ? { employeeId } : {}),
    },
    data: { status: 'ABANDONED' },
  })
}
```

`getOrCreateSession()` 맨 앞줄에 `await sweepStaleSessions(employeeId)` 추가 — 기존 로직(진행중 세션 있으면 이어하기)보다 먼저 실행되어야, 스윕된 뒤에 "진행중 세션 없음"으로 판정되어 새 세션이 만들어진다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/session-service.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: 관리자 조회 함수에도 연결**

`lib/admin-service.ts`의 `getSummary()`, `listEmployees()` 맨 앞줄에 `await sweepStaleSessions()`(인자 없음, 전체 스윕) 추가. 아무도 재로그인하지 않아도 관리자가 화면을 열 때마다 숫자가 정확해진다.

- [ ] **Step 6: 커밋**

---

## 이 계획에 포함되지 않은 것

MVP 범위 밖이며, 별도 계획으로 다룬다.

| 항목 | 사유 |
|---|---|
| 요약 대시보드 척도 평균·히스토그램 | P1 |
| 척도별 Cronbach's α 표시 (F-23) | P1 — 응답 30건 누적 후에야 의미 |
| 큐브 해설 매트릭스 (F-17) | P2 — 해설 문구 16개(기질 8 + 성격 8, 별도) 작성이 별도 콘텐츠 작업 |
| 사내 상대위치 계산 | P2 — D-24 잠정 30명(`00` §1) 기준으로 착수 가능, 값 자체가 정식 확정은 아님 |
| 문항별 이탈 지점 추적 | P2 |
| 문항 관리 UI | P3 |
| **관리자 인증 (F-40)** | **Task 7에 추가 필요** — `/admin/login`, bcrypt, 초기 비밀번호 변경 강제, 실패 5회 잠금, `/admin/password`. `npm i bcryptjs` 필요 |
| **통계 확충 (F-35~F-39)** | **Task 20에 추가 필요** — 두 축 산점도, 축별 평균 순위, 응시 진행 추이, 응답 품질 요약, 개인 상세 평균 오버레이. 전부 n≥30 게이트 |
| 부서별 비교 | **영구 제외** — 인원 규모 |
| 재검사 비교 뷰 | **영구 제외** — D-10 |
| 응시 독려 기능 | **영구 제외** — D-13 |
| 익명 모드 (SHOW_NAMES) | **영구 제외** — 사용자 결정. 관리자·CSV 항상 실명 |

---

## Self-Review 결과

**1. Spec coverage** — 설계 문서의 P0 기능을 태스크에 매핑했다.

| 기능 | 태스크 |
|---|---|
| F-01 로그인 | 7 (이름+전화번호만, A안 자율 등록 — D-05/D-25 확정) |
| 로그인 실패 제한 | 7 |
| F-02 섹션 단위 응시 | 10 |
| F-03 진행률 | 10 |
| F-04 임시저장 | 10 |
| F-05 자동 채점 | 5, 11 |
| F-06 개인 결과 | 12 |
| F-07 권한 분리 | 7 |
| F-08 관리자 개인 조회 | 14 |
| **사원 목록 보기 전환 (훑어보기/사내 분포 위치/유형별, Q2·Q3·Q4)** | **13** |
| F-16 응답 품질 지표 | 6 |
| F-21 미응답 섹션 검증 | 10 (`allAnswered`로 다음 버튼 차단) |
| F-22 응시 전 고지 | 15 |
| 감사 로그 기록 | 14 |
| **감사 로그 조회 화면 (F-27)** | **18** |
| **사원 추가 (F-28)** | **18** |
| **관리자 공통 메뉴·진입 동선** | **17** |
| F-09 요약 대시보드 | 19 |
| F-11 CSV 내보내기 | 20 |
| 통계 화면 | 20 |
| 문항 목록 | 21 |
| **결과 해설 A+B (28개)** | **16** — 계획만, 작성은 보류 |
| 스냅샷 고정 | 11 |
| 반응형 (G-14) | 9, 10, 12, 13 |
| 접근성 (G-15) | 9 |

**2. 미해결 사항** — 두 가지를 기록해 둔다.

- **`app/test/submit` 라우트가 Task 10의 `goNext`에서 참조되지만 Task 11에서 생성된다.** 태스크 순서상 문제없으나, Task 10을 단독으로 검증할 때 마지막 섹션의 "제출하기"는 404가 난다. Task 10의 수동 확인은 섹션 1→2 이동까지만 확인한다.
- **Task 3(문항 작성)이 Task 5의 골든 테스트에 필요하다.** Task 3 없이 Task 5를 실행하면 `loadAllItems`가 빈 배열을 반환해 골든 테스트가 실패한다. 순서를 지켜야 한다.
- **Task 13의 큐브 고/저 경계값(`CUBE_SPLIT = 50`)은 `00`/`01` 어디에도 명시돼 있지 않은 잠정 가정이다.** D-26(50/65)과는 별개의 값이며, 유형별 보기(§4.3 보기3)를 실제로 쓰기 전에 확정이 필요할 수 있다.

**3. 타입 일관성** — `ScaleCode`는 `lib/items/schema.ts`에서 한 번 정의하고 `lib/scoring/types.ts`가 재수출한다. `ResultSnapshot`은 Task 11에서 정의하고 Task 12·13·14가 동일한 이름으로 import한다. `applyReverse`는 Task 5에서 정의하고 Task 6이 재사용한다. 불일치 없음.
