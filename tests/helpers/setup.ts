// Mock environment variables for tests
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.CLICKHOUSE_HOST = 'localhost';
process.env.MEILISEARCH_HOST = 'localhost';
process.env.MEILISEARCH_KEY = 'test_key';

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidISO8601(received: string) {
    const pass = !isNaN(Date.parse(received)) && received.includes('T');

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO8601 datetime`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO8601 datetime`,
        pass: false,
      };
    }
  },

  toBeValidIP(received: string) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const pass = ipv4Regex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid IP address`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid IP address`,
        pass: false,
      };
    }
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidISO8601(): R;
      toBeValidIP(): R;
    }
  }
}

// Global test timeout
jest.setTimeout(30000);

// Suppress console output during tests unless debugging
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Cleanup after all tests
afterAll(() => {
  if (process.env.DEBUG !== 'true') {
    global.console = originalConsole as any;
  }
});
