FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY cli/reset-password.ts ./

ENTRYPOINT ["bun", "run", "reset-password.ts"]
