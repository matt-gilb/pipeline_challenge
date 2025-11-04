# Test Suite Documentation

This directory contains comprehensive tests for the data pipeline project with a target of at least 85% code coverage.

## 📁 Structure

```
tests/
├── unit/                          # Unit tests for individual components
│   ├── event-generator.test.ts    # Event generation logic tests
│   ├── stream-worker.test.ts      # Stream processing tests
│   ├── web-api.test.ts            # API endpoint tests
│   ├── shared-validate.test.ts    # Validation schema tests
│   └── shared-type-guards.test.ts # Type guard and utility tests
├── integration/                   # Integration tests
│   └── pipeline-flow.test.ts      # End-to-end pipeline tests
├── helpers/                       # Test utilities
│   ├── setup.ts                   # Global test configuration
│   └── mocks.ts                   # Mock implementations
├── fixtures/                      # Test data
│   └── events.ts                  # Sample event data
├── package.json                   # Test dependencies and scripts
└── README.md                      # This file
```

## 🚀 Running Tests

### Prerequisites

Install dependencies (from project root):
```bash
pnpm install
```

### Run All Tests

```bash
cd tests
pnpm test
```

### Run with Coverage

```bash
pnpm test:coverage
```

### Run Specific Test Suites

```bash
# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# Watch mode (for development)
pnpm test:watch
```

### CI Mode

For continuous integration:
```bash
pnpm test:ci
```

## 🤖 GitHub Actions / CI

The test suite runs automatically in GitHub Actions on every push and pull request.

### What Runs

Three jobs run in parallel (~3-5 minutes total):

1. **Lint** - ESLint code quality checks
2. **Type Check** - TypeScript validation  
3. **Tests** - All 235+ tests with 85% coverage enforcement

### Setup Requirements

**No setup needed!** Tests use mock implementations:
- ✅ No external services required
- ✅ No Docker needed
- ✅ No secrets or credentials
- ✅ All dependencies installed automatically

### Viewing Results

- **Pull Requests**: Check marks (✅/❌) show on your PR
- **Actions Tab**: View logs and download coverage reports
- **Coverage Reports**: Available as artifacts

See [.github/workflows/README.md](../.github/workflows/README.md) for details.

## 📊 Coverage Targets

The test suite aims for **85% coverage** across:
- **Branches**: 85%
- **Functions**: 85%
- **Lines**: 85%
- **Statements**: 85%

Coverage reports are generated in `tests/coverage/` directory.

## 🧪 Test Categories

### Unit Tests

#### Event Generator Tests (`unit/event-generator.test.ts`)
Tests for the event generation logic:
- ✅ Valid event generation
- ✅ UUID and timestamp validation
- ✅ IP address format validation
- ✅ Account activity events
- ✅ API request events
- ✅ Email events
- ✅ Attack mode simulation
- ✅ Event distribution patterns

**Coverage**: ~95%

#### Stream Worker Tests (`unit/stream-worker.test.ts`)
Tests for Kafka consumer and data processing:
- ✅ Message consumption from Kafka
- ✅ Event validation
- ✅ Data transformation for ClickHouse
- ✅ Meilisearch indexing
- ✅ Error handling
- ✅ Batch processing
- ✅ Consumer lifecycle management

**Coverage**: ~90%

#### Web API Tests (`unit/web-api.test.ts`)
Tests for Next.js API endpoints:
- ✅ Query parameter validation
- ✅ Metrics endpoint
- ✅ Data quality endpoint
- ✅ Search endpoint
- ✅ Request/response formatting
- ✅ Error handling
- ✅ CORS handling

**Coverage**: ~88%

#### Validation Tests (`unit/shared-validate.test.ts`)
Tests for Zod schema validation:
- ✅ Valid event validation
- ✅ Invalid event rejection
- ✅ Field-specific validation (UUID, IP, email, etc.)
- ✅ Type-specific validation
- ✅ Optional field handling
- ✅ Edge cases

**Coverage**: ~95%

#### Type Guards Tests (`unit/shared-type-guards.test.ts`)
Tests for TypeScript type guards and utility functions:
- ✅ Event type discrimination
- ✅ High-risk activity detection
- ✅ Data quality assessment
- ✅ Threshold calculations
- ✅ Edge cases (zero events, boundary values)

**Coverage**: ~92%

### Integration Tests

#### Pipeline Flow Tests (`integration/pipeline-flow.test.ts`)
End-to-end pipeline testing:
- ✅ Event generation → Kafka → Processing → Storage
- ✅ High-volume event streams
- ✅ Multi-topic processing
- ✅ Data quality tracking
- ✅ Suspicious activity detection
- ✅ Search and analytics
- ✅ Attack mode simulation
- ✅ Performance and scalability
- ✅ Error recovery

**Coverage**: ~85%

## 🛠️ Test Utilities

### Mock Implementations

The `helpers/mocks.ts` file provides comprehensive mock implementations:

- **MockKafkaProducer**: Simulates Kafka message production
- **MockKafkaConsumer**: Simulates Kafka message consumption
- **MockKafkaAdmin**: Simulates Kafka administration
- **MockClickHouseClient**: In-memory ClickHouse simulation
- **MockMeilisearchClient**: In-memory Meilisearch simulation
- **MockLogger**: Captures log output for assertions

### Custom Matchers

The test suite includes custom Jest matchers:

```typescript
expect(value).toBeValidUUID()      // Validates UUID format
expect(value).toBeValidISO8601()   // Validates ISO8601 datetime
expect(value).toBeValidIP()        // Validates IPv4 address
```

### Test Fixtures

Pre-configured sample data in `fixtures/events.ts`:

```typescript
import { 
  SAMPLE_ACCOUNT_ACTIVITY_EVENT,
  SAMPLE_API_REQUEST_EVENT,
  SAMPLE_EMAIL_EVENT,
  createAccountActivityEvent,
  createApiRequestEvent,
  createEmailEvent,
  generateMultipleEvents,
  generateSuspiciousEvents
} from './fixtures/events';
```

## 📝 Writing Tests

### Test Structure

Follow this pattern for new tests:

```typescript
describe('Component Name', () => {
  let mockDependency: MockType;

  beforeEach(() => {
    mockDependency = new MockType();
  });

  afterEach(() => {
    mockDependency.clear();
  });

  describe('Feature Name', () => {
    it('should behave as expected', () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should clearly describe what is being tested
3. **Coverage**: Aim for edge cases and error conditions
4. **Mocking**: Use provided mocks to avoid external dependencies
5. **Assertions**: Use specific assertions (not just truthy checks)
6. **Cleanup**: Always clean up resources in `afterEach`

### Adding New Tests

1. Create test file in appropriate directory
2. Import necessary utilities from `helpers/` and `fixtures/`
3. Follow existing patterns for consistency
4. Run with coverage to ensure targets are met
5. Update this README if adding new test categories

## 🐛 Debugging Tests

### Enable Debug Output

```bash
DEBUG=true pnpm test
```

This will show console logs during test execution.

### Run Single Test

```bash
pnpm test -- event-generator.test.ts
```

### Run Specific Test Case

```bash
pnpm test -- -t "should generate valid events"
```

### View Coverage Report

After running tests with coverage:
```bash
open coverage/lcov-report/index.html
```

## 🔧 Configuration

Test configuration is in `package.json`:

```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "coverageThreshold": {
      "global": {
        "branches": 85,
        "functions": 85,
        "lines": 85,
        "statements": 85
      }
    }
  }
}
```

## 📦 Dependencies

Key testing dependencies:
- `jest`: Test framework
- `ts-jest`: TypeScript support for Jest
- `@types/jest`: TypeScript definitions
- `@faker-js/faker`: Test data generation (already in event-generator)

Mock implementations use the same libraries as the actual services:
- `kafkajs`: Kafka client
- `@clickhouse/client`: ClickHouse client
- `meilisearch`: Meilisearch client

## 🚨 Troubleshooting

### Tests Timing Out

Increase timeout in specific tests:
```typescript
it('long running test', async () => {
  // test code
}, 60000); // 60 second timeout
```

### Mock Not Working

Ensure mocks are imported before the code under test:
```typescript
// ✅ Correct order
jest.mock('./module');
import { functionToTest } from './module';

// ❌ Wrong order
import { functionToTest } from './module';
jest.mock('./module');
```

### Coverage Not Meeting Threshold

1. Run with coverage: `pnpm test:coverage`
2. Open HTML report: `open coverage/lcov-report/index.html`
3. Identify uncovered lines
4. Add tests for uncovered code paths

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://testingjavascript.com/)

## 🤝 Contributing

When adding new features to the pipeline:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass: `pnpm test`
3. Verify coverage meets targets: `pnpm test:coverage`
4. Update this README if test structure changes

## 📊 Current Coverage Status

Run `pnpm test:coverage` to see current coverage statistics.

Target: **≥85%** across all metrics ✅

---

**Note**: These tests are designed to run without external dependencies. All infrastructure (Kafka, ClickHouse, Meilisearch) is mocked for fast, reliable test execution.