# Quick Start Guide - Running Tests

Get the test suite up and running in under 5 minutes!

## Prerequisites

Make sure you have Node.js (v22+) and pnpm installed. If not:

```bash
# Install Node.js from https://nodejs.org/
# Then install pnpm
npm install -g pnpm
```

## Installation

From the project root directory:

```bash
# Install all dependencies
pnpm install
```

This will install dependencies for all workspaces including the tests.

## Running Tests

### Quick Test Run

```bash
# From project root - run all tests
pnpm test:all

# Or navigate to tests directory
cd tests
pnpm test
```

### With Coverage Report

```bash
# From project root
pnpm test:coverage

# View the HTML report
open tests/coverage/lcov-report/index.html
```

### Run Specific Test Suites

```bash
cd tests

# Only unit tests
pnpm test:unit

# Only integration tests
pnpm test:integration

# Watch mode (useful during development)
pnpm test:watch

# Run a specific test file
pnpm test event-generator.test.ts

# Run tests matching a pattern
pnpm test -- -t "should generate valid events"
```

## Understanding the Output

### Successful Test Run

```
PASS  unit/event-generator.test.ts
  ✓ should generate valid events (5ms)
  ✓ should validate UUIDs (3ms)
  
Test Suites: 8 passed, 8 total
Tests:       230 passed, 230 total
Time:        15.432s
```

### Coverage Report

```
---------------------|---------|----------|---------|---------|
File                 | % Stmts | % Branch | % Funcs | % Lines |
---------------------|---------|----------|---------|---------|
All files            |   89.5  |   87.2   |   91.3  |   89.8  |
 event-generator     |   95.0  |   92.0   |   96.0  |   95.5  |
 stream-worker       |   90.0  |   88.0   |   92.0  |   90.5  |
 ...
---------------------|---------|----------|---------|---------|
```

## Troubleshooting

### Tests Won't Run

**Problem**: `Cannot find module '@pipeline/shared'`

**Solution**: Make sure you've installed dependencies:
```bash
cd ..
pnpm install
cd tests
pnpm test
```

### Tests Timing Out

**Problem**: Tests are taking too long

**Solution**: Increase timeout in `package.json` or use `DEBUG=true` to see what's happening:
```bash
DEBUG=true pnpm test
```

### TypeScript Errors

**Problem**: TypeScript compilation errors

**Solution**: 
```bash
# Rebuild the shared package
cd ../packages/shared
pnpm build

# Return to tests
cd ../../tests
pnpm test
```

### Coverage Below Threshold

**Problem**: `Coverage for statements (82%) does not meet threshold (85%)`

**Solution**: 
1. View the HTML coverage report to see uncovered lines
2. Add tests for the uncovered code paths
3. Re-run with coverage

## Common Workflows

### Adding a New Feature

1. Write the test first (TDD):
```bash
cd tests/unit
# Create your-feature.test.ts
pnpm test:watch
```

2. Watch tests run as you code
3. Verify coverage:
```bash
pnpm test:coverage
```

### Debugging a Failing Test

1. Run only that test:
```bash
pnpm test -- -t "name of failing test"
```

2. Add console logs (they'll show with DEBUG=true):
```bash
DEBUG=true pnpm test -- -t "name of failing test"
```

3. Use focused tests:
```typescript
// In the test file
it.only('this test runs alone', () => {
  // test code
});
```

### Before Committing

Always run the full test suite with coverage:

```bash
cd tests
pnpm test:ci
```

This ensures:
- All tests pass
- Coverage meets 85% threshold
- Tests run in CI mode (no watch, proper exit codes)

## Test Structure at a Glance

```
tests/
├── unit/                # Fast, isolated tests
│   ├── event-generator.test.ts
│   ├── stream-worker.test.ts
│   ├── web-api.test.ts
│   └── ...
├── integration/         # End-to-end tests
│   ├── pipeline-flow.test.ts
│   └── search-analytics.test.ts
├── helpers/             # Test utilities
│   ├── setup.ts        # Global config
│   └── mocks.ts        # Mock implementations
└── fixtures/            # Sample data
    └── events.ts
```

## What's Being Tested?

✅ **Event Generation** - All event types, attack mode, validation  
✅ **Stream Processing** - Kafka consumption, data transformation  
✅ **Data Storage** - ClickHouse queries, inserts, aggregations  
✅ **Search** - Meilisearch indexing, full-text search, filters  
✅ **Web API** - Endpoints, validation, error handling  
✅ **Integration** - Complete event flow through the pipeline  
✅ **Analytics** - Metrics, data quality, suspicious activity  

## Expected Coverage

| Component | Target | Typical |
|-----------|--------|---------|
| Event Generator | 85% | ~95% |
| Stream Worker | 85% | ~90% |
| Web API | 85% | ~88% |
| Shared Utilities | 85% | ~93% |
| Integration | 85% | ~85% |

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [SUMMARY.md](SUMMARY.md) for complete test inventory
- Start writing tests for new features!

## Need Help?

- Check test examples in existing test files
- Use the mock implementations in `helpers/mocks.ts`
- Use fixtures from `fixtures/events.ts`
- All tests follow the Arrange-Act-Assert pattern

## Quick Commands Reference

```bash
# Most common commands
pnpm test              # Run all tests
pnpm test:coverage     # Run with coverage
pnpm test:watch        # Watch mode
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only

# From project root
pnpm test:all          # Run test suite
pnpm test:ci           # CI mode
```

---

**Ready to test?** Run `pnpm test` and watch your coverage stats! 🚀