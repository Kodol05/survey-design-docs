# Vercel 에 올리기

PC 를 꺼도 열리는 주소를 만드는 방법입니다. **사내 서버로 옮기기 전까지 쓰는 임시 자리**입니다.

## 무엇이 어디서 도나

| | 하는 일 |
|---|---|
| **Vercel** | 앱을 돌립니다. 요청이 오면 코드를 실행하고 화면을 만들어 보냅니다 |
| **Neon** | 데이터가 삽니다. 사람, 응답, 평가, 로그인 세션 |

Vercel 은 **요청 하나 처리하고 사라집니다.** 디스크가 없고 다음 요청은 새 상태에서 시작합니다. 그래서 데이터를 계속 두는 일은 못 하고, 그 역할을 Neon 이 맡습니다.

Neon 은 Vercel 안에서 만듭니다. **따로 가입하지 않습니다.**

## 순서

### 1. 계정과 프로젝트

[vercel.com](https://vercel.com) 에 GitHub 계정으로 가입하고, 이 저장소를 불러옵니다. 저장소가 비공개여도 됩니다.

**Root Directory 를 `web` 으로** 지정해야 합니다. 저장소 뿌리에는 `docs/` 도 같이 있어서 그대로 두면 앱을 못 찾습니다.

### 2. 데이터베이스

```bash
vercel integration add neon
```

또는 Vercel 대시보드의 **Storage → Create Database → Neon**.

계정과 DB 를 만들고 `DATABASE_URL` 을 프로젝트에 자동으로 넣어 줍니다.

### 3. 나머지 환경변수

Vercel 대시보드의 Settings → Environment Variables 에서 넣습니다.

| 이름 | 값 |
|---|---|
| `ADMIN_LOGIN_ID` | `admin` |
| `ADMIN_INITIAL_PASSWORD` | 쓰실 비밀번호 |

`DATABASE_URL` 은 2단계에서 이미 들어가 있습니다.

### 4. 표 만들고 문항 넣기

내 PC 에서 Neon 을 가리켜 한 번만 돌립니다.

```bash
cd web
vercel env pull .env.vercel        # Neon 주소를 받아온다
npx dotenv -e .env.vercel -- npx prisma migrate deploy
npx dotenv -e .env.vercel -- npx tsx scripts/seed.mts
```

화면을 채워 보시려면 가짜 데이터도 넣을 수 있습니다.

```bash
npx dotenv -e .env.vercel -- npx tsx scripts/seed-demo.mts
npx dotenv -e .env.vercel -- npx tsx scripts/seed-ratings.mts
```

> ⚠️ `.env.vercel` 은 실제 DB 주소라 **커밋되지 않습니다** (`.env*` 가 막혀 있음). 다 쓰면 지우세요.

### 5. 배포

GitHub 에 밀면 자동으로 올라갑니다. 주소는 `프로젝트이름.vercel.app` 으로 **고정**입니다.

## 여기서 달라지는 것

### 백업은 Vercel 이 대신합니다

관리자 첫 화면의 백업 칸이 「이 서버에서는 백업을 받지 않습니다」로 바뀝니다. `pg_dump` 를 부르고 파일을 디스크에 쓰는 방식이라 서버리스에서는 되지 않습니다.

대신 **Neon 이 자동으로 백업합니다.** 무료 요금제에서도 최근 상태로 되돌릴 수 있습니다.

⚠️ **사내 서버로 옮기면 저절로 돌아옵니다.** `backupSupported()` 가 `VERCEL` 환경변수를 보고 갈리는데, 사내에는 그 값이 없습니다. 되돌릴 코드가 없다는 뜻입니다.

### 첫 접속이 조금 느립니다

Neon 무료 요금제는 **5분 안 쓰면 잠듭니다.** 오랜만에 열면 깨어나느라 1초쯤 걸리고, 그다음부터는 바로입니다. 사내 서버로 가면 없어지는 현상입니다.

### 검색에는 안 걸립니다

`robots.txt` 와 `X-Robots-Tag: noindex` 를 둘 다 둡니다. 다만 **어느 쪽도 자물쇠가 아닙니다** — 실제 방어는 그대로 로그인입니다. 로그인 없이는 첫 화면 말고 아무것도 안 보입니다.

## 알아 두실 것

**무료 요금제는 비상업·개인용입니다.** 지금은 채택 전 데모를 보여드리는 단계라 문제가 없다고 보지만, 회사가 실제로 쓰기 시작하면 Pro($20/월)로 올리거나 사내 서버로 옮기셔야 합니다.

**가입 상한이 200명으로 막혀 있습니다** (`lib/auth/signupCap.ts`). 임시 조치이고 주석에 그렇게 적혀 있습니다. 사내에서 쓰실 때는 없애거나 `Roster` 기반으로 바꾸세요.

## 사내 서버로 옮길 때

Vercel 때문에 더한 것들은 **전부 환경변수로 갈리거나 있어도 무해합니다.** 지울 것이 없습니다.

| 더한 것 | 사내에서는 |
|---|---|
| `backupSupported()` | `VERCEL` 이 없으니 백업이 켜집니다 |
| `robots.ts` · `X-Robots-Tag` | 그대로 두면 됩니다 |
| `outputFileTracingIncludes` | `output: standalone` 으로 이미지를 줄일 때 **필요합니다** |

사내 배포 자체는 [14 올리기](14-올리기.md)와 [13 백업·복구](13-backup-restore.md)를 보세요.
