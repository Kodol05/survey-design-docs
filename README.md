# 7차원 성향 설문 시스템

사내 성향 설문 시스템입니다. 직원이 120문항에 답하면 성향 일곱 축이 점수로 나오고, 그 성향이 실제 직무능력과 어떻게 이어지는지를 회사 단위로 봅니다.

바탕은 Cloninger의 TCI인데 문항은 이 회사에 맞게 새로 썼습니다. 여기에 직무능력 세 축(협력·조직생활·자율적 실행)을 더했습니다.

## 받아서 켜기

Docker와 Node 22 이상이 필요합니다.

```bash
git clone <저장소>
cd survey-design-docs/web

cp .env.example .env      # 값은 그대로 두면 아래 docker compose 와 맞는다
npm install               # prisma generate 까지 자동으로 돈다
npm run db:up             # PostgreSQL 컨테이너 (포트 5432)
npm run db:migrate        # 표 만들기
npm run db:seed           # 문항 120개 + 관리자 계정

npm run dev               # http://localhost:3000
```

관리자는 `/admin/login`으로 들어갑니다. 아이디와 첫 비밀번호는 `.env`의 `ADMIN_LOGIN_ID`·`ADMIN_INITIAL_PASSWORD`입니다.

화면을 채워 보려면 가짜 데이터를 넣을 수 있습니다. **운영 DB에서는 절대 돌리지 마세요.**

```bash
npm run demo:seed         # 가짜 직원과 응답
npm run ratings:seed      # 가짜 관리자 평가
npm run demo:clear        # 되돌리기
```

## 자주 쓰는 것

```bash
npm test                  # 256개 · DB 없이 2초
npm run test:db           # 17개 · 시험용 DB 필요 (docs/15-테스트.md)
npm run lint
npm run build
```

## 폴더

| | |
|---|---|
| `web/` | 앱 — Next.js 16 · React 19 · Prisma 7 · PostgreSQL 16 |
| `web/data/` | 문항과 논문 관련도 (YAML) |
| `docs/` | 설계·조사·결정 기록 |

## 문서

**개발할 때 보는 것**

| 문서 | 내용 |
|---|---|
| [00 설계 작업본](docs/00-design-notes.md) | 결정 기록 — 무엇을 왜 그렇게 정했는지 |
| [15 테스트](docs/15-테스트.md) | 두 갈래 테스트와 시험용 DB |
| [13 백업·복구](docs/13-backup-restore.md) | 덤프 받기와 되돌리기 |
| [16 배포](docs/16-vercel-배포.md) | 밖에서 열 수 있게 올리기 |
| [12 남은 일](docs/12-backlog.md) | 아직 안 한 것 |

**설계와 근거**

| 문서 | 내용 |
|---|---|
| [08 핵심 한장정리](docs/08-onepager.md) | 무엇이 다른가 — 한 장 요약 |
| [07 핵심기능 상세](docs/07-job-ability.md) | 성향과 직무능력을 나란히 보는 방식 |
| [06 근거 조사](docs/06-research.md) | 어디까지가 근거이고 어디부터가 추정인지 |
| [11 UI 설계](docs/11-ui-guide.md) | 색·부품·차트 규격 |
| [01 기능·UX 설계](docs/01-features-ux.md) | 화면·기능 상세 |

역할이 끝난 문서는 [docs/지난기록](docs/지난기록/)에 있습니다 — 착수 전 검토 보고, 확정 전 방안들.

`00`과 `01`은 작업본이라 상태 표시(✅ 확정 / 🟡 제안 / ⬜ 미정 / ❌ 제외)가 그대로 남아 있습니다.

## 다이어그램 검증

문서를 고친 뒤 다이어그램이 깨지지 않았는지 확인합니다.

```bash
cd tools && npm install   # 최초 1회
node tools/mermaid-lint.mjs docs
```

파싱 오류뿐 아니라 GitHub에서 깨질 문법과 한글 관련 함정도 함께 잡습니다. 규칙은 [04 Mermaid 작성규칙](docs/04-mermaid-rules.md)에 있습니다.
