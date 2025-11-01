# Build stage for dependencies and compilation
FROM node:22-slim AS deps

WORKDIR /app

# Install PNPM (updated version for compatibility)
RUN npm install -g pnpm@9.15.0

# Copy workspace config files
COPY package.json pnpm-workspace.yaml ./

# Copy all package.json files for workspace
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

# Copy TypeScript configs
COPY tsconfig.json tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/
COPY apps/web/tsconfig.json apps/web/

# Copy Next.js and other config files
COPY apps/web/next.config.js apps/web/

COPY apps/web/postcss.config.js apps/web/
COPY apps/web/eslint.config.mjs apps/web/

# Install dependencies (generate lockfile if missing)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/shared/src packages/shared/src
COPY apps/web/src apps/web/src
COPY apps/web/public apps/web/public

# Build shared package first, then web
RUN pnpm --filter @pipeline/shared build
RUN pnpm --filter @pipeline/web build

# Production stage
FROM node:22-slim

WORKDIR /app

# Install PNPM
RUN npm install -g pnpm@9.15.0

# Copy workspace config files
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/packages/shared/package.json ./packages/shared/
COPY --from=deps /app/apps/web/package.json ./apps/web/

# Copy built files
COPY --from=deps /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps /app/apps/web/.next ./apps/web/.next
COPY --from=deps /app/apps/web/public ./apps/web/public
COPY --from=deps /app/apps/web/next.config.js ./apps/web/

# Copy TypeScript configs for runtime
COPY tsconfig.json tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/
COPY apps/web/tsconfig.json apps/web/

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Expose port
EXPOSE 3000

# Run the application
CMD ["pnpm", "--filter", "@pipeline/web", "start"]
