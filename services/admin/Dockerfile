FROM oven/bun:1.3.14

WORKDIR /app

# Copy workspace manifests for dependency resolution (admin + shared contracts only)
COPY package.json bunfig.toml turbo.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY services/admin/package.json ./services/admin/

# Copy source
COPY packages/contracts ./packages/contracts
COPY services/admin ./services/admin

RUN bun install

# Generate the Prisma client (@prisma/client is a runtime dep, prisma CLI is a
# devDep, so install above must precede NODE_ENV=production)
RUN cd services/admin && bunx prisma generate

ENV NODE_ENV=production
ENV PORT=4002
WORKDIR /app/services/admin
EXPOSE 4002

# Migrate + seed (both idempotent) against the compose postgres, then start
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run prisma:seed && bun run src/main.ts"]
