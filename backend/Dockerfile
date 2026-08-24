# syntax=docker/dockerfile:1

# ---- builder: 전체 devDependencies로 TypeScript 빌드 ----
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- prod-deps: 프로덕션 의존성만 설치하고, 그 환경 그대로 Prisma Client를 다시 생성 ----
# (builder 단계에서 생성한 Client를 그대로 복사하지 않는 이유: devDependencies가 섞인 채로
# 생성된 게 아니라, 최종 실행 환경과 동일한 node_modules 위에서 생성돼야 엔진 바이너리가
# 어긋나지 않는다.)
FROM node:22-slim AS prod-deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

# ---- runner: 컴파일된 dist + 프로덕션 node_modules만 남긴 최종 이미지 ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 4000

# 컨테이너 시작마다 대기 중인 마이그레이션을 먼저 적용한 뒤 서버를 띄운다. migrate deploy는
# 멱등하다(이미 적용된 마이그레이션은 건너뜀)라 재시작마다 실행해도 안전하다 — 별도의 수동
# 배포 스텝을 매번 안 잊고 챙겨야 하는 부담을 없애기 위한 선택이다(docs/testing.typ 같은
# 문서화 없이도 "컨테이너를 띄우면 곧 최신 스키마"가 항상 보장된다).
# exec로 node를 실행해 셸 프로세스를 대체한다 — 그래야 `docker stop`이 보내는 SIGTERM이
# 셸이 아니라 Node 프로세스로 직접 전달되어 정상 종료(graceful shutdown)된다.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]
