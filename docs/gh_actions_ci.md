# GitHub Actions CI

Simple CI workflow for this demo project.

## What Runs

On every push and pull request to `main` or `develop`:

1. **Lint** - ESLint code quality checks
2. **Type Check** - TypeScript validation
3. **Tests** - 235+ test cases with 85%+ coverage

All jobs run in parallel for fast feedback (~3-5 minutes total).

## The Workflow

**File:** `.github/workflows/ci.yml`

```yaml
Jobs:
  - lint       # Code style and formatting
  - typecheck  # TypeScript compilation
  - test       # Unit + integration tests with mocks
```

## Test Details

Tests use **mock implementations** so no external services are needed:
- ✅ No Kafka cluster required
- ✅ No ClickHouse database required
- ✅ No Meilisearch instance required
- ✅ All dependencies installed automatically
- ✅ Fast, reliable execution

Coverage threshold: **85%** for all metrics (statements, branches, functions, lines)

## Running Locally

Match what CI runs:

```bash
# All checks
pnpm lint
pnpm typecheck
pnpm test:coverage

# Or from project root
pnpm lint && pnpm typecheck && pnpm test:coverage
```

## Viewing Results

- **Actions Tab**: See all workflow runs
- **Pull Requests**: Check marks (✅/❌) show status
- **Coverage Reports**: Downloaded as artifacts from test job

## Branch Protection

Recommended settings for `main` branch:

**Settings → Branches → Add rule:**
- Branch name pattern: `main`
- ✅ Require status checks to pass before merging
  - Select: `Lint`, `Type Check`, `Tests`
- ✅ Require branches to be up to date before merging

## Status Badge

Add to your README:

```markdown
![CI](https://github.com/YOUR_USERNAME/pipeline_challenge/workflows/CI/badge.svg)
```

## That's It!

Simple CI for a demo project. No Docker, no E2E tests, no production complexity.