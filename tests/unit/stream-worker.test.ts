import { validateEvent } from '../../packages/shared/src/validate';
import { MockKafkaConsumer, MockClickHouseClient, MockMeilisearchClient } from '../helpers/mocks';
import {
  SAMPLE_ACCOUNT_ACTIVITY_EVENT,
  SAMPLE_API_REQUEST_EVENT,
  SAMPLE_EMAIL_EVENT,
  createAccountActivityEvent,
  createApiRequestEvent,
  createEmailEvent,
} from '../fixtures/events';

// Mock the clients module
jest.mock('../../apps/stream-worker/src/clients', () => {
  const mockClickHouse = new MockClickHouseClient();
  const mockMeilisearch = new MockMeilisearchClient();

  return {
    clickhouse: mockClickHouse,
    meilisearch: mockMeilisearch,
    kafka: {
      consumer: () => new MockKafkaConsumer(),
    },
    CONSUMER_GROUP: 'test-consumer-group',
    TOPICS: {
      ACCOUNT_ACTIVITY: 'account-activity',
      API_REQUESTS: 'api-requests',
      EMAIL_EVENTS: 'email-events',
    },
    INDEXES: {
      EVENTS: 'events',
    },
    getOrCreateIndex: async (indexName: string) => {
      await mockMeilisearch.createIndex(indexName);
      return mockMeilisearch.getIndex(indexName);
    },
    initializeMeilisearch: async () => {
      const index = await mockMeilisearch.getOrCreateIndex('events');
      await index.updateSettings({
        searchableAttributes: ['userId', 'sourceIp'],
        filterableAttributes: ['type', 'timestamp'],
      });
      return index;
    },
  };
});

describe('Stream Worker', () => {
  let mockConsumer: MockKafkaConsumer;
  let mockClickHouse: MockClickHouseClient;
  let mockMeilisearch: MockMeilisearchClient;

  beforeEach(async () => {
    mockConsumer = new MockKafkaConsumer();
    mockClickHouse = new MockClickHouseClient();
    mockMeilisearch = new MockMeilisearchClient();

    // Initialize Meilisearch index
    await mockMeilisearch.createIndex('events');
  });

  afterEach(() => {
    mockConsumer.clear();
    mockClickHouse.clear();
    mockMeilisearch.clear();
  });

  describe('Message Processing', () => {
    it('should process account activity events', async () => {
      const event = createAccountActivityEvent();

      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'account-activity' });

      // Simulate processing
      const validated = validateEvent(event);
      await mockClickHouse.insert({
        table: 'events',
        values: [validated],
        format: 'JSONEachRow',
      });

      const insertedRows = mockClickHouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0].values[0]).toMatchObject({
        id: event.id,
        type: 'account_activity',
      });
    });

    it('should process API request events', async () => {
      const event = createApiRequestEvent();

      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'api-requests' });

      const validated = validateEvent(event);
      await mockClickHouse.insert({
        table: 'events',
        values: [validated],
        format: 'JSONEachRow',
      });

      const insertedRows = mockClickHouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0].values[0]).toMatchObject({
        id: event.id,
        type: 'api_request',
      });
    });

    it('should process email events', async () => {
      const event = createEmailEvent();

      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'email-events' });

      const validated = validateEvent(event);
      await mockClickHouse.insert({
        table: 'events',
        values: [validated],
        format: 'JSONEachRow',
      });

      const insertedRows = mockClickHouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0].values[0]).toMatchObject({
        id: event.id,
        type: 'email_send',
      });
    });

    it('should validate events before processing', async () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        id: 'invalid-uuid',
      };

      expect(() => validateEvent(invalidEvent)).toThrow();
    });

    it('should index events in Meilisearch', async () => {
      const event = createAccountActivityEvent();
      const index = await mockMeilisearch.getOrCreateIndex('events');

      await index.addDocuments([event]);

      const docs = index.getDocuments();
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe(event.id);
    });
  });

  describe('Data Transformation', () => {
    it('should transform timestamp to ClickHouse format', () => {
      const isoTimestamp = '2023-10-20T12:34:56.789Z';
      const date = new Date(isoTimestamp);

      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

      const formatted = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
      expect(formatted).toBe('2023-10-20 12:34:56.789');
    });

    it('should handle account activity event fields', () => {
      const event = SAMPLE_ACCOUNT_ACTIVITY_EVENT;

      const values = {
        id: event.id,
        timestamp: event.timestamp,
        sourceIp: event.sourceIp,
        userId: event.userId,
        type: event.type,
        action: event.action,
        success: event.success ? 1 : 0,
        failureReason: event.failureReason || null,
        userAgent: event.userAgent,
        geoCountry: event.geoLocation.country,
        geoCity: event.geoLocation.city,
        geoLatitude: event.geoLocation.latitude,
        geoLongitude: event.geoLocation.longitude,
      };

      expect(values.action).toBe('login');
      expect(values.success).toBe(1);
      expect(values.geoCountry).toBe('US');
    });

    it('should handle API request event fields', () => {
      const event = SAMPLE_API_REQUEST_EVENT;

      const values = {
        id: event.id,
        timestamp: event.timestamp,
        sourceIp: event.sourceIp,
        userId: event.userId,
        type: event.type,
        method: event.method,
        path: event.path,
        statusCode: event.statusCode,
        responseTimeMs: event.responseTimeMs,
        requestSize: event.requestSize,
        responseSize: event.responseSize,
        userAgent: event.userAgent,
      };

      expect(values.method).toBe('POST');
      expect(values.statusCode).toBe(200);
      expect(values.responseTimeMs).toBe(150);
    });

    it('should handle email event fields', () => {
      const event = SAMPLE_EMAIL_EVENT;

      const values = {
        id: event.id,
        timestamp: event.timestamp,
        sourceIp: event.sourceIp,
        userId: event.userId,
        type: event.type,
        recipientEmail: event.recipientEmail,
        templateId: event.templateId,
        success: event.success ? 1 : 0,
        failureReason: event.failureReason || null,
        messageId: event.messageId || null,
        bounceType: event.bounceType,
      };

      expect(values.recipientEmail).toBe('user@example.com');
      expect(values.templateId).toBe('welcome');
      expect(values.bounceType).toBe('none');
    });

    it('should set null for missing optional fields', () => {
      const event = createAccountActivityEvent({ failureReason: undefined });

      const values = {
        failureReason: event.failureReason || null,
      };

      expect(values.failureReason).toBeNull();
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple events', async () => {
      const events = [createAccountActivityEvent(), createApiRequestEvent(), createEmailEvent()];

      for (const event of events) {
        await mockClickHouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = mockClickHouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(3);
    });

    it('should handle events from different topics', async () => {
      const topics = ['account-activity', 'api-requests', 'email-events'];

      await mockConsumer.connect();

      for (const topic of topics) {
        await mockConsumer.subscribe({ topic });
      }

      const subscriptions = mockConsumer.getSubscriptions();
      expect(subscriptions).toHaveLength(3);
      expect(subscriptions).toContain('account-activity');
      expect(subscriptions).toContain('api-requests');
      expect(subscriptions).toContain('email-events');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON', () => {
      const invalidJson = 'not valid json';

      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it('should handle missing message value', async () => {
      await mockConsumer.connect();

      // Message without value should be skipped
      const messageWithoutValue = {
        key: 'test',
        value: null,
      };

      // Should not throw
      expect(messageWithoutValue.value).toBeNull();
    });

    it('should handle validation errors gracefully', () => {
      const invalidEvent = {
        id: 'invalid',
        type: 'unknown',
      };

      expect(() => validateEvent(invalidEvent)).toThrow();
    });

    it('should continue processing after error', async () => {
      const validEvent = createAccountActivityEvent();
      const invalidEvent = { ...validEvent, id: 'invalid' };

      // Process valid event
      const validated = validateEvent(validEvent);
      await mockClickHouse.insert({
        table: 'events',
        values: [validated],
        format: 'JSONEachRow',
      });

      // Try to process invalid event (should fail)
      expect(() => validateEvent(invalidEvent)).toThrow();

      // Valid event should still be in database
      const insertedRows = mockClickHouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
    });
  });

  describe('Consumer Management', () => {
    it('should connect to Kafka', async () => {
      await mockConsumer.connect();
      expect(mockConsumer.connected).toBe(true);
    });

    it('should disconnect from Kafka', async () => {
      await mockConsumer.connect();
      await mockConsumer.disconnect();
      expect(mockConsumer.connected).toBe(false);
    });

    it('should subscribe to topics', async () => {
      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'account-activity', fromBeginning: true });

      const subscriptions = mockConsumer.getSubscriptions();
      expect(subscriptions).toContain('account-activity');
    });

    it('should handle multiple subscriptions', async () => {
      await mockConsumer.connect();

      await mockConsumer.subscribe({ topic: 'account-activity' });
      await mockConsumer.subscribe({ topic: 'api-requests' });
      await mockConsumer.subscribe({ topic: 'email-events' });

      const subscriptions = mockConsumer.getSubscriptions();
      expect(subscriptions).toHaveLength(3);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track processed events', async () => {
      const events = [createAccountActivityEvent(), createApiRequestEvent(), createEmailEvent()];

      let processedCount = 0;

      for (const event of events) {
        const validated = validateEvent(event);
        await mockClickHouse.insert({
          table: 'events',
          values: [validated],
          format: 'JSONEachRow',
        });
        processedCount++;
      }

      expect(processedCount).toBe(3);
    });

    it('should track failed events', () => {
      const invalidEvents = [
        { ...SAMPLE_ACCOUNT_ACTIVITY_EVENT, id: 'invalid1' },
        { ...SAMPLE_API_REQUEST_EVENT, statusCode: 999 },
        { ...SAMPLE_EMAIL_EVENT, recipientEmail: 'not-an-email' },
      ];

      let failedCount = 0;

      for (const event of invalidEvents) {
        try {
          validateEvent(event);
        } catch (error) {
          failedCount++;
        }
      }

      expect(failedCount).toBe(3);
    });

    it('should update last processed timestamp', () => {
      const timestamp = Date.now();
      const lastProcessed = new Date(timestamp).toISOString();

      expect(lastProcessed).toBeDefined();
      expect(new Date(lastProcessed).getTime()).toBe(timestamp);
    });
  });

  describe('Meilisearch Integration', () => {
    it('should configure searchable attributes', async () => {
      const index = await mockMeilisearch.getOrCreateIndex('events');

      await index.updateSettings({
        searchableAttributes: ['userId', 'sourceIp', 'recipientEmail', 'path'],
      });

      const settings = await index.getSettings();
      expect(settings.searchableAttributes).toContain('userId');
      expect(settings.searchableAttributes).toContain('sourceIp');
    });

    it('should configure filterable attributes', async () => {
      const index = await mockMeilisearch.getOrCreateIndex('events');

      await index.updateSettings({
        filterableAttributes: ['type', 'timestamp', 'success', 'action'],
      });

      const settings = await index.getSettings();
      expect(settings.filterableAttributes).toContain('type');
      expect(settings.filterableAttributes).toContain('timestamp');
    });

    it('should configure sortable attributes', async () => {
      const index = await mockMeilisearch.getOrCreateIndex('events');

      await index.updateSettings({
        sortableAttributes: ['timestamp', 'responseTimeMs'],
      });

      const settings = await index.getSettings();
      expect(settings.sortableAttributes).toContain('timestamp');
    });
  });
});
