# Build stage for dependencies and compilation
FROM node:22-slim AS deps

WORKDIR /app

# Install PNPM
RUN npm install -g pnpm@8.9.0

# Copy workspace config files
COPY package.json pnpm-workspace.yaml ./

# Copy all package.json files for workspace
COPY packages/shared/package.json packages/shared/
COPY apps/stream-worker/package.json apps/stream-worker/

# Copy TypeScript configs
COPY tsconfig.json tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/
COPY apps/stream-worker/tsconfig.json apps/stream-worker/

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/shared packages/shared/
COPY apps/stream-worker apps/stream-worker/

# Build packages
RUN pnpm -r build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy built files and production dependencies
COPY --from=deps /app/package.json .
COPY --from=deps /app/pnpm-lock.yaml .
COPY --from=deps /app/pnpm-workspace.yaml .
COPY --from=deps /app/packages/shared/package.json ./packages/shared/
COPY --from=deps /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps /app/apps/stream-worker/package.json ./apps/stream-worker/
COPY --from=deps /app/apps/stream-worker/dist ./apps/stream-worker/dist

# Install production dependencies only
RUN npm install -g pnpm@8.9.0 && \
    pnpm install --prod --prefer-offline --no-frozen-lockfile

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "apps/stream-worker/dist/index.js"]
