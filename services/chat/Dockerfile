FROM oven/bun:1.3.14

WORKDIR /app

# Copy workspace manifests for dependency resolution (chat + shared contracts only)
COPY package.json bunfig.toml turbo.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY services/chat/package.json ./services/chat/

# Copy source
COPY packages/contracts ./packages/contracts
COPY services/chat ./services/chat

RUN bun install

ENV NODE_ENV=production
ENV PORT=4001
WORKDIR /app/services/chat
EXPOSE 4001

CMD ["bun", "run", "src/main.ts"]
