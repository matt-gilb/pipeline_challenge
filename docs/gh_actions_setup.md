# GitHub Actions Setup

## What It Does

Simple CI workflow that runs on every push and pull request:

1. **Lint** - ESLint code quality checks
2. **Type Check** - TypeScript validation
3. **Tests** - 235+ test cases with 85% coverage

All jobs run in parallel. Total time: ~3-5 minutes.

## The Workflow

**File:** `.github/workflows/ci.yml`

Runs automatically on:
- Pushes to `main` or `develop`
- Pull requests to `main` or `develop`

## No External Dependencies

Tests use mock implementations, so no setup required:
- ✅ No Kafka cluster
- ✅ No ClickHouse database
- ✅ No Meilisearch instance
- ✅ No Docker
- ✅ No secrets needed

Everything installs and runs automatically!

## Viewing Results

- **Pull Requests**: See check marks (✅/❌) on your PR
- **Actions Tab**: View detailed logs
- **Coverage Reports**: Download from artifacts

## Running Locally

Match what CI runs:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
```

## That's It!

Simple, clean CI for a demo project. Just push and it works! 🚀
