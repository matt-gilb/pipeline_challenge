# Build stage for dependencies and compilation
FROM node:22-slim AS deps

WORKDIR /app

# Install PNPM
RUN npm install -g pnpm@8.9.0

# Copy workspace config files
COPY package.json pnpm-workspace.yaml ./

# Copy all package.json files for workspace
COPY packages/shared/package.json packages/shared/
COPY apps/event-generator/package.json apps/event-generator/

# Copy TypeScript configs
COPY tsconfig.json tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/
COPY apps/event-generator/tsconfig.json apps/event-generator/

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/shared packages/shared/
COPY apps/event-generator apps/event-generator/

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
COPY --from=deps /app/apps/event-generator/package.json ./apps/event-generator/
COPY --from=deps /app/apps/event-generator/dist ./apps/event-generator/dist

# Install production dependencies only
RUN npm install -g pnpm@8.9.0 && \
    pnpm install --prod --prefer-offline --no-frozen-lockfile

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "apps/event-generator/dist/index.js"]
