# Development Reference - Demo Data Pipeline

## 🚀 Quick Start

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Reset everything (careful - deletes all data!)
docker compose down -v
docker compose up -d --build
```

## 📊 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Dashboard | http://localhost:3000 | Main metrics dashboard for data consumers |
| Search | http://localhost:3000/search | Event search interface |
| Grafana - Pipeline Health | http://localhost:3001/d/pipeline-health | Infrastructure monitoring for DevOps/SRE teams |
| Grafana - Business Metrics | http://localhost:3001/d/business-metrics | Attack detection and business metrics monitoring |

## 🪄 Single Command Deployment

The entire application can be started with:

```bash
docker compose up -d
```

This command will:

1. **Build Phase** (first run only):
   - Pull base images (Node.js, ClickHouse, Meilisearch, Redpanda)
   - Install pnpm globally inside each app container
   - Copy workspace files into build context
   - Run `pnpm install` inside containers
   - Compile TypeScript inside containers
   - Build Next.js application inside containers
   - Create optimized production images
2. **Start Phase**:
   - Start infrastructure services (Redpanda, ClickHouse, Meilisearch)
   - Wait for health checks to pass
   - Start application services (event-generator, stream-worker, web)
   - Initialize databases and indexes
3. **Ready**:
   - Dashboard available at http://localhost:3000
   - Search available at http://localhost:3000/search
   - Grafana dashboards available at http://localhost:3001
     - Pipeline Health & System Status
     - Business Metrics & Attack Detection

## 🔍 What Runs Inside Containers

### Infrastructure Services

- **Redpanda**: Official image, no build needed
- **ClickHouse**: Official image, mounts init SQL
- **Meilisearch**: Official image, no build needed
- **Grafana**: Official image with two pre-provisioned dashboards
  - Pipeline Health & System Status: monitors infrastructure and data pipeline operations
  - Business Metrics & Attack Detection: tracks failure rates, response times, and attack patterns

### Application Services (Built in Docker)

- **Event Generator**:
  - Node.js 18 base image
  - pnpm installed in container
  - Dependencies installed in container
  - TypeScript compiled in container
  - Runs: `node apps/event-generator/dist/index.js`

- **Stream Worker**:
  - Node.js 18 base image
  - pnpm installed in container
  - Dependencies installed in container
  - TypeScript compiled in container
  - Runs: `node apps/stream-worker/dist/index.js`

- **Web Dashboard**:
  - Node.js 18 base image
  - pnpm installed in container
  - Dependencies installed in container
  - TypeScript compiled in container
  - Next.js built in container
  - Runs: `pnpm --filter @pipeline/web start`

## 🛠️ No Local Requirements

The following are **NOT** required on your local machine:
- ❌ Node.js
- ❌ npm
- ❌ pnpm
- ❌ TypeScript
- ❌ Any npm packages
- ❌ Any build tools

The **ONLY** requirement is:
- ✅ Docker Desktop (Mac/Windows) or Docker Engine + Docker Compose (Linux)

## 📊 Build Times

**First run (building images):**
- Event Generator: ~90 seconds
- Stream Worker: ~90 seconds
- Web App: ~120 seconds
- **Total**: ~5 minutes

**Subsequent runs (cached images):**
- All services start: ~30-60 seconds

**After code changes (rebuild):**
- Single service: ~60 seconds
- All services: ~3 minutes

## 🔄 Development Workflow

### Without Local Tools (Docker-only)

1. Edit code in your IDE
2. Rebuild and restart:
   ```bash
   docker compose up -d --build
   ```
3. View logs:
   ```bash
   docker compose logs -f
   ```

### With Optional Local Tools (faster iteration)

1. Install Node.js 18+ and pnpm locally
2. Run `pnpm install` in project root
3. Start infrastructure only:
   ```bash
   docker compose up -d redpanda clickhouse meilisearch
   ```
4. Run apps locally with hot-reload:
   ```bash
   cd apps/web && pnpm dev
   ```

## ✨ Key Docker Features Used

- **Multi-stage builds**: Separate build and runtime stages
- **Layer caching**: Optimized order for faster rebuilds
- **Health checks**: Ensure services are ready before dependents start
- **Dependency ordering**: `depends_on` with conditions
- **Volume mounts**: Persist data across restarts
- **Named volumes**: Managed by Docker
- **.dockerignore**: Exclude unnecessary files from context
- **Build context**: Single root context for monorepo

## ✅ Health Checks

```bash
# Check all services
docker compose ps

# Check event count (should be growing)
docker compose exec -T clickhouse clickhouse-client \
  --query "SELECT count() FROM pipeline.events"

# Check event distribution
docker compose exec -T clickhouse clickhouse-client \
  --query "SELECT type, count() as count FROM pipeline.events GROUP BY type"

# Check if events are flowing (run twice, numbers should increase)
docker compose exec -T clickhouse clickhouse-client \
  --query "SELECT max(timestamp) as latest_event FROM pipeline.events"
```

## 🔍 Debugging

```bash
# View logs for a service
docker compose logs <service-name> --tail 50

# Follow logs in real-time
docker compose logs -f <service-name>
# Services: web, event-generator, stream-worker, clickhouse, redpanda, meilisearch, grafana

# Check for errors
docker compose logs web --since 5m | grep -i error
docker compose logs stream-worker --since 5m | grep -i error
docker compose logs event-generator --since 5m | grep -i error
```

## 🐛 Common Issues

### Dashboard shows "Application error"

1. Check web service logs
2. Look for ClickHouse query errors
3. Verify data types in queries match the schema (especially UUID vs String)

```bash
# Check web logs
docker compose logs web --tail 50

# Rebuild web service
docker compose up -d --build web
```

### No events showing

1. Check all services are running
2. Check event-generator logs
3. Check stream-worker logs
4. Verify Kafka topics exist

```bash
# Check that services are running
docker compose ps

# Check if generator is running
docker compose logs event-generator --tail 20

# Check if worker is processing
docker compose logs stream-worker --tail 20

# Verify Kafka topics exist
docker compose exec redpanda rpk topic list
```

### Permission errors in stream-worker

```bash
# Recreate volumes (this will delete data!)
docker compose down -v
docker compose up -d
```

## 📈 Data Verification

```bash
# View recent events
docker compose exec -T clickhouse clickhouse-client \
  --query "SELECT timestamp, type, sourceIp FROM pipeline.events ORDER BY timestamp DESC LIMIT 10 FORMAT Pretty"

# Check Meilisearch index
curl -s -H "Authorization: Bearer pipeline_secure_master_key_2024" \
  http://localhost:7700/indexes/events/stats | jq .

# Test API endpoints
curl -s "http://localhost:3000/api/metrics?timeRange=1%20HOUR" | jq . | head -20
curl -s "http://localhost:3000/api/data-quality?timeRange=1%20HOUR" | jq . | head -20
```

## 🔧 Rebuild Commands

```bash
# Rebuild all services
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build web
docker compose up -d --build stream-worker
docker compose up -d --build event-generator
```

## 📝 Expected Metrics

- **Event Rate:** ~1,200 events/minute
- **Event Distribution:** ~33% each type (account_activity, api_request, email_send)
- **Data Quality:** 100% (no missing required fields)
- **Processing Lag:** None (real-time)

## 🚨 Service Dependencies

```
┌─────────────┐
│  Redpanda   │◄─── Kafka broker (healthy)
└──────┬──────┘
       │
       ├─────► event-generator (produces events)
       │
       └─────► stream-worker (consumes events)
                     │
                     ├─────► ClickHouse (stores data)
                     │           │
                     │           └─────► web (displays data)
                     │
                     └─────► Meilisearch (indexes for search)
                                 │
                                 └─────► web (search interface)
```

## 💾 Data Storage

- **ClickHouse:** `/var/lib/clickhouse` → `clickhouse_data` volume
- **Meilisearch:** `/meili_data` → `meili_data` volume
- **Grafana:** `/var/lib/grafana` → `grafana_data` volume
- **Redpanda:** `/var/lib/redpanda/data` → `redpanda` volume

## ⚙️ Configuration

### Environment Variables

**ClickHouse:**
- Host: `clickhouse`
- Port: `8123` (HTTP), `9000` (Native)
- User: `web_user`
- Password: `password`
- Database: `pipeline`

**Kafka (Redpanda):**
- Broker: `redpanda:29092`
- Topics: `account-activity`, `api-requests`, `email-events`

**Meilisearch:**
- Host: `meilisearch:7700`
- Master Key: `pipeline_secure_master_key_2024`
- Index: `events`

## 📚 Files Changed (For Reference)

1. `apps/event-generator/src/index.ts` - Kafka topic creation
2. `infra/clickhouse-init.sql` - User permissions
3. `apps/stream-worker/src/index.ts` - Timestamp formatting
4. `apps/web/src/lib/clickhouse.ts` - Query fixes

## 🎯 Testing Checklist

- [ ] All containers show "up", "running" or "healthy" status
- [ ] Event count is increasing
- [ ] Dashboard loads without errors at http://localhost:3000
- [ ] Search page loads at http://localhost:3000/search
- [ ] Grafana loads at http://localhost:3001 with both dashboards visible
- [ ] No errors in web logs
- [ ] No errors in stream-worker logs
- [ ] API endpoints return data

## 🤖 GitHub Actions CI

The project includes automated CI that runs on every push and pull request:

**What runs:**
1. **Lint** - ESLint code quality checks
2. **Type Check** - TypeScript validation
3. **Tests** - 235+ test cases with 85% coverage

**Runtime:** ~3-5 minutes (jobs run in parallel)

**Test details:**
- All tests use mock implementations (no external services needed)
- Coverage threshold: 85% for all metrics
- Tests cover: event generation, stream processing, API endpoints, validation, and integration flows

**View results:**
- Check marks (✅/❌) appear on pull requests
- Detailed logs in the Actions tab
- Coverage reports available as artifacts

**Run locally to match CI:**
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
```

For more information, see:
- [`.github/README.md`](../.github/README.md) - Quick overview
- [`.github/workflows/README.md`](../.github/workflows/README.md) - Workflow details
- [`tests/README.md`](../tests/README.md) - Test suite documentation

---

**Last Updated:** November 2, 2025

**Status:** ✅ All systems operational
