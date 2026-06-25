FROM node:20-alpine AS base

# ── Stage 1: install deps ────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (no DB connection needed)
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
# Dummy values so Next.js doesn't error on missing env at build time.
# Real values are injected by App Platform at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV NEXTAUTH_SECRET="build-time-placeholder"
ENV NEXTAUTH_URL="http://localhost:3000"

RUN npm run build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone output + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# public dir (may be empty but must exist)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + generated client for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
