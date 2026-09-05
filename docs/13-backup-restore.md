# 백업과 복구

데이터가 **한 곳에만** 있습니다. Docker 볼륨 `survey-pgdata` 하나입니다. 그 디스크가 죽으면 전원의 응답·결과·관리자 평가가 사라지고, 되살릴 방법은 50명에게 다시 응시를 시키는 것뿐입니다. 그마저도 첫 응답과 다른 결과가 나옵니다.

전체 DB가 12MB, 압축한 덤프가 **114KB**입니다. 용량은 문제가 되지 않습니다.

---

## 1. 무엇이 자동으로 되는가

관리자가 대시보드를 열 때 「마지막 백업이 24시간 넘었나」를 보고, 지났으면 그 자리에서 덤프를 뜹니다. cron이나 별도 프로세스가 없습니다 — 「14일 지난 세션 정리」와 같은 방식입니다 (D-28).

- 위치 — `web/backups/survey-YYYY-MM-DD-HHmm.sql.gz`
- 최근 **14벌**만 남고 오래된 것부터 지워집니다
- 실패해도 화면은 그대로 열립니다. 대시보드의 「마지막 백업」 시각이 안 움직이는 것으로 드러납니다

> ⚠️ **이 자동 백업은 디스크가 죽는 경우를 못 막습니다.** 백업도 같은 디스크에 있어 같이 사라집니다. 그게 가장 흔한 사고입니다.

## 2. 무엇을 사람이 해야 하는가

**대시보드 → 데이터 백업 → 「백업 파일 받기」.** 누르면 그 자리에서 새로 떠서 내려옵니다. 그 파일을 서버가 아닌 곳(회사 PC, USB)에 두시면 됩니다. 이것이 서버가 죽었을 때의 유일한 방어입니다.

> ⚠️ **이 파일은 CSV 내보내기와 다릅니다.** CSV는 분석용이라 전화번호를 뺐지만, 백업은 복구용이라 **전화번호와 비밀번호 해시까지 전부** 들어갑니다.

권장 주기는 **한 달에 한 번**과 **사람이 크게 바뀐 직후**입니다. 응시가 몰리는 기간에는 더 자주 받아 두시는 편이 낫습니다.

---

## 3. 복구 절차

화면에 복구 버튼을 두지 않았습니다. 잘못 누르면 지금 데이터를 덮어쓰고 되돌릴 수 없는 동작이고, 실제로 쓸 일은 몇 년에 한 번입니다.

### 3.1 먼저 지금 상태를 뜬다

복구는 덮어쓰기입니다. **틀린 파일을 부었을 때 돌아올 자리**를 먼저 만듭니다.

```bash
docker exec survey-db pg_dump -U survey -d survey | gzip > before-restore.sql.gz
```

### 3.2 시험용 DB에 먼저 부어 본다

바로 `survey`에 붓지 않습니다. 파일이 멀쩡한지부터 봅니다.

```bash
docker exec survey-db createdb -U survey restore_test
gunzip -c survey-2026-08-25-2309.sql.gz \
  | docker exec -i survey-db psql -U survey -d restore_test -v ON_ERROR_STOP=1

# 행 수가 맞는지 본다
docker exec survey-db psql -U survey -d restore_test -c \
  'select (select count(*) from "Employee") 사람,
          (select count(*) from "Response") 응답,
          (select count(*) from "Result") 결과;'
```

`ON_ERROR_STOP=1`이 중요합니다. 없으면 중간에 실패한 구문을 건너뛰고 끝까지 가서, **반쯤 복구된 DB를 성공으로 착각**하게 됩니다.

### 3.3 진짜로 되돌린다

```bash
# 앱을 먼저 멈춘다 — 붓는 도중에 쓰기가 들어오면 어긋난다
docker exec survey-db dropdb -U survey restore_test

gunzip -c survey-2026-08-25-2309.sql.gz \
  | docker exec -i survey-db psql -U survey -d survey -v ON_ERROR_STOP=1
```

덤프에 `--clean --if-exists`가 들어 있어 기존 표를 지우고 다시 만듭니다. 스키마 마이그레이션을 따로 돌릴 필요가 없습니다.

### 3.4 서버가 통째로 날아간 경우

```bash
git clone <저장소> && cd 820
docker compose up -d db
# 위 3.3 과 같은 명령으로 부으면 됩니다
cd web && npm ci && npx prisma generate && npm run build && npm start
```

`web/.env`는 저장소에 없습니다. `DATABASE_URL`과 `SESSION_SECRET`을 다시 적어야 합니다 (`web/.env.example` 참고).

---

## 4. 설정

| 환경 변수 | 기본값 | 언제 바꾸나 |
|---|---|---|
| `BACKUP_DIR` | `web/backups` | 덤프를 다른 디스크에 두고 싶을 때 |
| `DB_CONTAINER` | `survey-db` | 컨테이너 이름을 바꿨을 때 |
| `BACKUP_DUMP_CMD` | (없음) | Docker를 안 쓰고 호스트 `pg_dump`를 쓸 때 |

호스트에 `pg_dump`가 없어 **컨테이너 안의 것을 씁니다.** 깔더라도 서버의 PostgreSQL과 버전이 어긋나면 덤프가 거부되는데, 컨테이너 것은 그 DB를 띄운 바로 그 바이너리라 버전이 항상 맞습니다.

---

## 5. 확인된 것 (2026-08-25)

실제로 뜬 덤프를 빈 DB에 부어 원본과 맞대 봤습니다.

| | 원본 | 복구본 |
|---|---|---|
| 사람 · 응답 · 결과 · 평가 · 문항 | 45 · 4320 · 36 · 108 · 120 | 45 · 4320 · 36 · 108 · 120 |
| 외래키 · 인덱스 · enum | 10 · 29 · 5 | 10 · 29 · 5 |
| 비밀번호 해시 | 60자 | 60자 |

**복구를 한 번 해보지 않은 백업은 백업이 아닙니다.** 파일만 쌓이고 정작 필요할 때 안 열리는 경우가 흔합니다. 서버를 옮기거나 PostgreSQL 판을 올린 뒤에는 이 표를 다시 만들어 보시기 바랍니다.
