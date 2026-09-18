# web — 앱

7차원 성향 설문의 실제 앱입니다. Next.js 16 (App Router) · React 19 · Prisma 7 · PostgreSQL 16 (운영은 Neon) · Tailwind 4 · Vitest.

켜는 법·스크립트·문서 목록은 [저장소 README](../README.md)에 있습니다.

## 자주 쓰는 것

```bash
npm run dev        # http://localhost:3000
npm test           # 계산·문구·규칙 (DB 없이)
npm run test:db    # DB 에 붙는 것 (docs/15-테스트.md)
npm run lint
npm run build
```

## 구조

| | |
|---|---|
| `src/app/(auth)` | 사원 로그인·가입 |
| `src/app/(app)` | 사원 화면 — `/survey` 응시, `/me` 결과 보고서 |
| `src/app/admin` | 관리자 — 첫 화면 · 분석 · 구성원 · 문항 · 백업 |
| `src/lib` | 채점(`scoring`) · 해석 문구(`interpretation`) · 문항 파일 검증(`items`) · 세션·제출(`survey`) · 관리자 집계(`admin`) |
| `src/components` | 차트(Recharts) · 응시 부품 · 공통 UI |
| `data/items/v1.yaml` | 문항 120개 — 문구의 원본. `scripts/apply-item-content.mts` 로 DB 에 반영 |
| `prisma/` | 스키마와 마이그레이션 |
| `scripts/` | 씨앗 데이터 · 가짜 데이터 · 점검용 세션 발급 · 문항 반영 |

## 환경 파일

`.env` (로컬) · `.env.test` (시험용 DB). 운영 값을 받아 쓸 때는 `.env.vercel` 같은 이름으로 — `.env.production` 은 `next start` 가 자동으로 읽어 로컬 서버가 운영 DB 를 보게 되므로 쓰지 않습니다. `.env*` 는 모두 커밋되지 않습니다.
