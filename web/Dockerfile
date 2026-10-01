# 사내 서버용 앱 이미지. 루트의 docker-compose.yml 이 이걸로 app 을 띄운다.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
# 빌드 중에는 DB 에 붙지 않는다. 주소 형식만 맞으면 된다
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

FROM node:22-alpine
WORKDIR /app
# 백업용 pg_dump — DB(PostgreSQL 16)와 같은 판이어야 덤프가 된다
RUN apk add --no-cache postgresql16-client
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "scripts/docker-start.sh"]
