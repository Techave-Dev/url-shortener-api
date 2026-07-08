FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

RUN pnpm prisma generate --sql
RUN pnpm run build

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --prod --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma generate --sql

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
