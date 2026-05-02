FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY tsconfig.json ./
COPY shared ./shared
COPY web ./web

RUN bun --bun x vite build --config web/vite.config.ts


FROM oven/bun:1-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache wget

COPY package.json tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY shared ./shared
COPY server ./server
COPY --from=builder /app/web/dist ./web/dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz | grep -q '"ok":true' || exit 1

CMD ["bun", "run", "server/index.ts"]
