FROM oven/bun:1.3.14

WORKDIR /app

# Copy workspace manifests for dependency resolution (admin-web + shared contracts only)
COPY package.json bunfig.toml turbo.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY clients/admin-web/package.json ./clients/admin-web/

# Copy source
COPY packages/contracts ./packages/contracts
COPY clients/admin-web ./clients/admin-web

RUN bun install

# Browser-reachable API base, baked at build time. apiFetch runs client-side and
# Next inlines NEXT_PUBLIC_* at build, so the value must point at the host-mapped
# admin port (localhost:4002 -> admin container) and cannot be a container-internal
# hostname. Runtime environment overrides of NEXT_PUBLIC_* are ignored after build.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4002
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN cd clients/admin-web && bun run build

ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME=0.0.0.0
WORKDIR /app/clients/admin-web
EXPOSE 3003

CMD ["bun", "run", "start"]
