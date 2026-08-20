FROM oven/bun:1.3.14

WORKDIR /app

# Copy workspace manifests for dependency resolution (chat-web + shared contracts only)
COPY package.json bunfig.toml turbo.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY clients/chat-web/package.json ./clients/chat-web/

# Copy source
COPY packages/contracts ./packages/contracts
COPY clients/chat-web ./clients/chat-web

RUN bun install

# Resolved at build time by next.config.ts for the /api/* rewrite destination.
ARG NEXT_PUBLIC_API_BASE_URL=http://chat:4001
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN cd clients/chat-web && bun run build

ENV NODE_ENV=production
ARG PORT=3002
ENV PORT=$PORT
ENV HOSTNAME=0.0.0.0
WORKDIR /app/clients/chat-web
EXPOSE 3002

CMD ["bun", "run", "start"]
