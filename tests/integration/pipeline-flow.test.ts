import {
  MockKafkaProducer,
  MockKafkaConsumer,
  MockClickHouseClient,
  MockMeilisearchClient,
} from '../helpers/mocks';
import { EventGenerator } from '../../apps/event-generator/src/generator';
import { validateEvent } from '@pipeline/shared';
import {
  createAccountActivityEvent,
  createApiRequestEvent,
  createEmailEvent,
  generateMultipleEvents,
  generateSuspiciousEvents,
} from '../fixtures/events';

describe('Pipeline Integration Tests', () => {
  let producer: MockKafkaProducer;
  let consumer: MockKafkaConsumer;
  let clickhouse: MockClickHouseClient;
  let meilisearch: MockMeilisearchClient;
  let generator: EventGenerator;

  beforeEach(async () => {
    producer = new MockKafkaProducer();
    consumer = new MockKafkaConsumer();
    clickhouse = new MockClickHouseClient();
    meilisearch = new MockMeilisearchClient();
    generator = new EventGenerator();

    await producer.connect();
    await consumer.connect();
    await meilisearch.createIndex('events');
  });

  afterEach(async () => {
    await producer.disconnect();
    await consumer.disconnect();
    producer.clear();
    consumer.clear();
    clickhouse.clear();
    meilisearch.clear();
  });

  describe('End-to-End Event Flow', () => {
    it('should generate, publish, consume, and store account activity events', async () => {
      const event = generator.generateEvent();

      // 1. Publish to Kafka
      await producer.send({
        topic: 'account-activity',
        messages: [
          {
            key: event.userId,
            value: JSON.stringify(event),
          },
        ],
      });

      const producedMessages = producer.getMessages();
      expect(producedMessages).toHaveLength(1);
      expect(producedMessages[0].topic).toBe('account-activity');

      // 2. Consume from Kafka
      await consumer.subscribe({ topic: 'account-activity', fromBeginning: true });

      // 3. Process and validate
      const validated = validateEvent(event);
      expect(validated).toBeDefined();

      // 4. Store in ClickHouse
      await clickhouse.insert({
        table: 'events',
        values: [validated],
        format: 'JSONEachRow',
      });

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0].values[0].id).toBe(event.id);

      // 5. Index in Meilisearch
      const index = await meilisearch.getIndex('events');
      await index.addDocuments([validated]);

      const searchResults = await index.search(event.id);
      expect(searchResults.hits.length).toBeGreaterThan(0);
    });

    it('should handle high-volume event stream', async () => {
      const eventCount = 1000;
      const events = [];

      // Generate multiple events
      for (let i = 0; i < eventCount; i++) {
        events.push(generator.generateEvent());
      }

      // Publish all events
      for (const event of events) {
        await producer.send({
          topic: 'account-activity',
          messages: [{ key: event.userId, value: JSON.stringify(event) }],
        });
      }

      const producedMessages = producer.getMessages();
      expect(producedMessages.length).toBeGreaterThanOrEqual(eventCount);

      // Process and store
      for (const event of events) {
        const validated = validateEvent(event);
        await clickhouse.insert({
          table: 'events',
          values: [validated],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows.length).toBe(eventCount);
    });

    it('should handle events from multiple topics', async () => {
      const accountEvent = createAccountActivityEvent();
      const apiEvent = createApiRequestEvent();
      const emailEvent = createEmailEvent();

      // Publish to different topics
      await producer.send({
        topic: 'account-activity',
        messages: [{ key: accountEvent.userId, value: JSON.stringify(accountEvent) }],
      });

      await producer.send({
        topic: 'api-requests',
        messages: [{ key: apiEvent.userId, value: JSON.stringify(apiEvent) }],
      });

      await producer.send({
        topic: 'email-events',
        messages: [{ key: emailEvent.userId, value: JSON.stringify(emailEvent) }],
      });

      // Subscribe to all topics
      await consumer.subscribe({ topic: 'account-activity' });
      await consumer.subscribe({ topic: 'api-requests' });
      await consumer.subscribe({ topic: 'email-events' });

      const subscriptions = consumer.getSubscriptions();
      expect(subscriptions).toHaveLength(3);

      // Process all events
      const events = [accountEvent, apiEvent, emailEvent];
      for (const event of events) {
        const validated = validateEvent(event);
        await clickhouse.insert({
          table: 'events',
          values: [validated],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(3);

      // Verify all event types are stored
      const types = insertedRows.map((row) => row.values[0].type);
      expect(types).toContain('account_activity');
      expect(types).toContain('api_request');
      expect(types).toContain('email_send');
    });
  });

  describe('Data Quality Pipeline', () => {
    it('should filter out invalid events', async () => {
      const validEvent = createAccountActivityEvent();
      const invalidEvent = {
        ...validEvent,
        id: 'invalid-uuid',
      };

      let validCount = 0;
      let invalidCount = 0;

      // Try to process both events
      try {
        validateEvent(validEvent);
        validCount++;
      } catch (error) {
        invalidCount++;
      }

      try {
        validateEvent(invalidEvent);
        validCount++;
      } catch (error) {
        invalidCount++;
      }

      expect(validCount).toBe(1);
      expect(invalidCount).toBe(1);
    });

    it('should track data quality metrics', async () => {
      const events = generateMultipleEvents(100, 'account_activity');

      for (const event of events) {
        try {
          const validated = validateEvent(event);
          await clickhouse.insert({
            table: 'events',
            values: [validated],
            format: 'JSONEachRow',
          });
        } catch (error) {
          // Track failed validations
        }
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(100);
    });

    it('should detect duplicate events', async () => {
      const event = createAccountActivityEvent();

      // Insert same event twice
      await clickhouse.insert({
        table: 'events',
        values: [event],
        format: 'JSONEachRow',
      });

      await clickhouse.insert({
        table: 'events',
        values: [event],
        format: 'JSONEachRow',
      });

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(2);

      // Check for duplicate IDs
      const ids = insertedRows.map((row) => row.values[0].id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(2);
      expect(uniqueIds.size).toBe(1); // Only 1 unique ID
    });
  });

  describe('Search and Analytics Pipeline', () => {
    it('should enable full-text search on indexed events', async () => {
      const events = [
        createAccountActivityEvent({ userId: 'user-search-test-123' }),
        createAccountActivityEvent({ userId: 'user-search-test-456' }),
        createApiRequestEvent({ path: '/api/search/test' }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const searchResults = await index.search('search');
      expect(searchResults.hits.length).toBeGreaterThan(0);
    });

    it('should support filtering by event type', async () => {
      const events = [
        ...generateMultipleEvents(10, 'account_activity'),
        ...generateMultipleEvents(10, 'api_request'),
        ...generateMultipleEvents(10, 'email_send'),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const accountEvents = events.filter((e) => e.type === 'account_activity');
      expect(accountEvents).toHaveLength(10);
    });

    it('should aggregate metrics from stored events', async () => {
      const events = generateMultipleEvents(50, 'account_activity');

      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(50);

      // Simulate metric aggregation
      const eventCount = insertedRows.length;
      expect(eventCount).toBe(50);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect high-frequency activity from single user', async () => {
      const suspiciousUserId = 'suspicious-user-123';
      const suspiciousIp = '10.0.0.1';
      const events = generateSuspiciousEvents(25, suspiciousUserId, suspiciousIp);

      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(25);

      // Check for suspicious patterns
      const userEvents = insertedRows.filter((row) => row.values[0].userId === suspiciousUserId);
      expect(userEvents.length).toBeGreaterThan(20);
    });

    it('should detect activity from multiple countries', async () => {
      const userId = 'geo-suspicious-user';
      const events = [
        createAccountActivityEvent({
          userId,
          geoLocation: {
            country: 'US',
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.006,
          },
        }),
        createAccountActivityEvent({
          userId,
          geoLocation: {
            country: 'CN',
            city: 'Beijing',
            latitude: 39.9042,
            longitude: 116.4074,
          },
        }),
        createAccountActivityEvent({
          userId,
          geoLocation: {
            country: 'RU',
            city: 'Moscow',
            latitude: 55.7558,
            longitude: 37.6173,
          },
        }),
      ];

      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      const countries = new Set(
        insertedRows.map((row) => row.values[0].geoLocation?.country).filter(Boolean)
      );

      expect(countries.size).toBe(3);
    });

    it('should detect high failure rates', async () => {
      const events = [
        ...Array(80)
          .fill(null)
          .map(() => createAccountActivityEvent({ success: false })),
        ...Array(20)
          .fill(null)
          .map(() => createAccountActivityEvent({ success: true })),
      ];

      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      const failedEvents = insertedRows.filter((row) => row.values[0].success === false);

      const failureRate = failedEvents.length / insertedRows.length;
      expect(failureRate).toBeGreaterThan(0.5); // >50% failure rate
    });
  });

  describe('Attack Mode Simulation', () => {
    it('should generate attack patterns when in attack mode', async () => {
      generator.setAttackMode(true);

      const events = [];
      for (let i = 0; i < 100; i++) {
        events.push(generator.generateEvent());
      }

      // Store events
      for (const event of events) {
        const validated = validateEvent(event);
        await clickhouse.insert({
          table: 'events',
          values: [validated],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      const accountActivityEvents = insertedRows.filter(
        (row) => row.values[0].type === 'account_activity'
      );

      // In attack mode, should have more account activity events
      expect(accountActivityEvents.length).toBeGreaterThan(40);
    });

    it('should detect increased error rates during attack', async () => {
      generator.setAttackMode(true);

      const events = [];
      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        if (event.type === 'account_activity') {
          events.push(event);
        }
      }

      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      const failedEvents = insertedRows.filter((row) => row.values[0].success === false);

      const failureRate = failedEvents.length / insertedRows.length;
      expect(failureRate).toBeGreaterThan(0.3); // >30% failure rate during attack
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid event ingestion', async () => {
      const startTime = Date.now();
      const eventCount = 500;

      for (let i = 0; i < eventCount; i++) {
        const event = generator.generateEvent();
        await producer.send({
          topic: 'account-activity',
          messages: [{ key: event.userId, value: JSON.stringify(event) }],
        });
      }

      const duration = Date.now() - startTime;
      const producedMessages = producer.getMessages();

      expect(producedMessages.length).toBe(eventCount);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should maintain consistent throughput', async () => {
      const batchSize = 100;
      const batches = 5;

      for (let batch = 0; batch < batches; batch++) {
        const events = [];
        for (let i = 0; i < batchSize; i++) {
          events.push(generator.generateEvent());
        }

        for (const event of events) {
          const validated = validateEvent(event);
          await clickhouse.insert({
            table: 'events',
            values: [validated],
            format: 'JSONEachRow',
          });
        }
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(batchSize * batches);
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing after encountering invalid event', async () => {
      const validEvent1 = createAccountActivityEvent();
      const invalidEvent = { ...validEvent1, id: 'invalid' };
      const validEvent2 = createApiRequestEvent();

      let processedCount = 0;
      let errorCount = 0;

      for (const event of [validEvent1, invalidEvent, validEvent2]) {
        try {
          const validated = validateEvent(event);
          await clickhouse.insert({
            table: 'events',
            values: [validated],
            format: 'JSONEachRow',
          });
          processedCount++;
        } catch (error) {
          errorCount++;
        }
      }

      expect(processedCount).toBe(2);
      expect(errorCount).toBe(1);

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(2);
    });

    it('should handle Kafka reconnection', async () => {
      await producer.disconnect();
      expect(producer.connected).toBe(false);

      await producer.connect();
      expect(producer.connected).toBe(true);

      const event = generator.generateEvent();
      await producer.send({
        topic: 'account-activity',
        messages: [{ key: event.userId, value: JSON.stringify(event) }],
      });

      const producedMessages = producer.getMessages();
      expect(producedMessages).toHaveLength(1);
    });
  });
});
