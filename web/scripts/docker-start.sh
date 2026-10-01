#!/bin/sh
# 앱 컨테이너 시작: 비밀번호 확인 → 밀리지 않은 마이그레이션 적용 → 서버 시작
set -e

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "devpassword" ]; then
  echo "[중단] DB 비밀번호가 개발용 기본값입니다." >&2
  echo "       저장소 맨 위 폴더에 .env 를 만들고 POSTGRES_PASSWORD=새비밀번호 를 적은 뒤 다시 올리세요 (.env.example 참고)." >&2
  exit 1
fi

npx prisma migrate deploy
exec npm start
