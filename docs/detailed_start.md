# Detailed Guide

**Run the entire pipeline with just Docker - no other dependencies needed!**

## Prerequisites

Only **Docker** is required:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac/Windows)
- OR Docker Engine + Docker Compose (Linux)

Verify you have Docker:
```bash
docker --version
docker compose version
```

---

## Quick Start (3 Commands)

### 1. Clone the repository
```bash
git clone <repository-url>
cd pipeline_challenge
```

### 2. Start everything
```bash
docker compose up -d
```

This single command will:
- ✅ Install pnpm inside containers
- ✅ Install all npm dependencies
- ✅ Compile TypeScript code
- ✅ Build Next.js application
- ✅ Start all services

**First run:** 3-5 minutes (building images)
**Subsequent runs:** 30-60 seconds (using cached images)

### 3. Open the dashboard
```bash
open http://localhost:3000
```

Or visit http://localhost:3000 in your browser.

That's it! 🎉

---

## What's Running?

| Service | Port | Purpose |
|---------|------|---------|
| Web Dashboard | 3000 | Real-time metrics and search UI |
| ClickHouse | 8123, 9000 | Analytics database |
| Meilisearch | 7700 | Search engine |
| Redpanda | 29092 | Message broker (Kafka-compatible) |
| Grafana | 3001 | Infrastructure monitoring & business metrics dashboards |
| Event Generator | (internal) | Simulates event streams |
| Stream Worker | (internal) | Processes events |

---

## Verify It's Working

### Check service status
```bash
docker compose ps
```

All services should show `healthy` or `running`.

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f stream-worker
docker compose logs -f event-generator
```

### Test endpoints
```bash
# ClickHouse
curl http://localhost:8123/ping
# Expected: Ok.

# Meilisearch
curl http://localhost:7700/health
# Expected: {"status":"available"}

# Web Dashboard
curl http://localhost:3000
# Expected: HTML response
```

---

## Common Commands

### Stop all services
```bash
docker compose down
```

### Stop and remove all data
```bash
docker compose down -v
```

### Restart a service
```bash
docker compose restart stream-worker
```

### Rebuild after code changes
```bash
docker compose up -d --build
```

### Rebuild specific service
```bash
docker compose up -d --build web
```

### View resource usage
```bash
docker stats
```

---

## Troubleshooting

### Services won't start
```bash
# Check for port conflicts
lsof -i :3000
lsof -i :8123

# Clean up and restart
docker compose down -v
docker compose up -d
```

### ClickHouse exits with error 184 or 46
If you see `container pipeline_challenge-clickhouse-1 exited (184)` or `exited (46)`:

```bash
# Check the error
docker compose logs clickhouse

# If you see "ILLEGAL_AGGREGATION" or "UNKNOWN_FUNCTION" errors:
# These were issues with materialized view aggregation that have been fixed
# Clean volumes and restart:
docker compose down -v
docker compose up -d
```

**Common ClickHouse errors fixed:**
- Error 184: Nested aggregate functions (argMax inside uniq)
- Error 46: Using aggregate function results in other aggregates

All these issues have been resolved in the latest SQL init file.

### Build fails
```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

### Out of disk space
```bash
# Check Docker disk usage
docker system df

# Clean up unused images/containers
docker system prune -a
```

### No events showing in dashboard
Wait 2-3 minutes for:
1. Services to be healthy
2. Event generator to produce events
3. Stream worker to process events
4. ClickHouse to aggregate metrics

Check logs:
```bash
docker compose logs event-generator stream-worker
```

### ClickHouse initialization fails
If ClickHouse keeps restarting:

```bash
# View full logs
docker compose logs clickhouse

# Common issues:
# 1. Port 8123 or 9000 already in use
# 2. Insufficient disk space
# 3. Previous volumes with incompatible schema

# Solution: Remove volumes and restart
docker compose down -v
docker compose up -d
```

---

## Development Without Local Tools

### Edit code
Simply edit files in your IDE - no local Node.js needed!

### Apply changes
```bash
docker compose up -d --build
```

### View results
Check logs and refresh the dashboard.

---

## Accessing Services Directly

### ClickHouse SQL
```bash
docker compose exec clickhouse clickhouse-client

# Run a query
SELECT count() FROM pipeline.events;
```

### Meilisearch
```bash
# Search events
curl -X POST http://localhost:7700/indexes/events/search \
  -H 'Authorization: Bearer masterKey' \
  -H 'Content-Type: application/json' \
  --data '{"q": "user123"}'
```

### Redpanda Topics
```bash
# List topics
docker compose exec redpanda rpk topic list

# Consume messages
docker compose exec redpanda rpk topic consume account-activity
```

---

## System Requirements

**Minimum:**
- 4 GB RAM
- 10 GB disk space
- 2 CPU cores

**Recommended:**
- 8 GB RAM
- 20 GB disk space
- 4 CPU cores

---

## What Happens on First Run?

1. **Docker downloads base images** (~2 min)
   - Node.js 18
   - ClickHouse
   - Meilisearch
   - Redpanda
   - Grafana

2. **Docker builds custom images** (~3 min)
   - Installs pnpm
   - Installs dependencies
   - Compiles TypeScript
   - Builds applications

3. **Services start** (~30 sec)
   - ClickHouse initializes database
   - Meilisearch creates indexes
   - Event generator starts producing events
   - Stream worker starts processing

4. **Data flows** (~2 min)
   - Events are generated
   - Events are processed
   - Metrics aggregate
   - Dashboard populates

**Total time to running dashboard: ~5-8 minutes**

---

## Success Checklist

After running `docker compose up -d`, within 5 minutes you should have:

- [ ] All containers running (`docker compose ps`)
- [ ] No errors in logs (`docker compose logs`)
- [ ] Dashboard loads (http://localhost:3000)
- [ ] Charts show data on dashboard
- [ ] Search works (http://localhost:3000/search)
- [ ] ClickHouse has events (`docker compose exec clickhouse clickhouse-client -q "SELECT count() FROM pipeline.events"`)

---

## Clean Slate

To completely reset and start fresh:

```bash
# Stop and remove everything
docker compose down -v

# Remove all images
docker compose rm -f
docker rmi $(docker images 'pipeline_challenge*' -q)

# Start fresh
docker compose up -d
```

---

## No Local Development Tools Needed!

This project is designed to work **entirely in Docker**. You do NOT need:
- ❌ Node.js installed locally
- ❌ pnpm installed locally
- ❌ TypeScript installed locally
- ❌ Any npm packages installed locally

Everything happens inside containers!

---

## Next Steps

- **Explore the dashboard:** http://localhost:3000
- **Try the search:** http://localhost:3000/search
- **View Grafana Dashboards:** 
  - Pipeline Health & System Status: http://localhost:3001/d/pipeline-health
  - Business Metrics & Attack Detection: http://localhost:3001/d/business-metrics
- **Read the docs:** See `NEXT_STEPS.md` for detailed information

**Questions?** See `FIXES_APPLIED.md` for technical details or `NEXT_STEPS.md` for troubleshooting.

---

## Quick Reference

| Task | Command |
|------|---------|
| Start everything | `docker compose up -d` |
| Stop everything | `docker compose down` |
| View logs | `docker compose logs -f` |
| Rebuild | `docker compose up -d --build` |
| Reset data | `docker compose down -v` |
| Check status | `docker compose ps` |
| View dashboard | `open http://localhost:3000` |

**That's all you need to know to run this project!** 🚀
