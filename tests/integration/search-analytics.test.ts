import { MockMeilisearchClient, MockClickHouseClient } from '../helpers/mocks';
import {
  createAccountActivityEvent,
  createApiRequestEvent,
  createEmailEvent,
  generateMultipleEvents,
  generateGeoDistributedEvents,
} from '../fixtures/events';

describe('Search and Analytics Integration', () => {
  let meilisearch: MockMeilisearchClient;
  let clickhouse: MockClickHouseClient;

  beforeEach(async () => {
    meilisearch = new MockMeilisearchClient();
    clickhouse = new MockClickHouseClient();
    await meilisearch.createIndex('events');
  });

  afterEach(() => {
    meilisearch.clear();
    clickhouse.clear();
  });

  describe('Full-Text Search', () => {
    it('should search events by user ID', async () => {
      const targetUserId = 'search-test-user-123';
      const events = [
        createAccountActivityEvent({ userId: targetUserId }),
        createAccountActivityEvent({ userId: 'other-user-456' }),
        createApiRequestEvent({ userId: targetUserId }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search(targetUserId);

      expect(results.hits.length).toBeGreaterThan(0);
      results.hits.forEach((hit: any) => {
        expect(JSON.stringify(hit).toLowerCase()).toContain(targetUserId.toLowerCase());
      });
    });

    it('should search events by source IP', async () => {
      const targetIp = '192.168.100.50';
      const events = [
        createAccountActivityEvent({ sourceIp: targetIp }),
        createAccountActivityEvent({ sourceIp: '10.0.0.1' }),
        createApiRequestEvent({ sourceIp: targetIp }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search(targetIp);

      expect(results.hits.length).toBeGreaterThan(0);
    });

    it('should search events by email', async () => {
      const targetEmail = 'search@example.com';
      const events = [
        createEmailEvent({ recipientEmail: targetEmail }),
        createEmailEvent({ recipientEmail: 'other@example.com' }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search('search@example');

      expect(results.hits.length).toBeGreaterThan(0);
    });

    it('should search events by API path', async () => {
      const targetPath = '/api/v1/users';
      const events = [
        createApiRequestEvent({ path: targetPath }),
        createApiRequestEvent({ path: '/api/v1/posts' }),
        createApiRequestEvent({ path: targetPath }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search('users');

      expect(results.hits.length).toBeGreaterThan(0);
    });

    it('should handle empty search query (return all)', async () => {
      const events = generateMultipleEvents(20, 'account_activity');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search('');

      expect(results.hits.length).toBeGreaterThan(0);
      expect(results.estimatedTotalHits).toBe(20);
    });

    it('should return empty results for non-matching query', async () => {
      const events = generateMultipleEvents(10, 'account_activity');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search('nonexistent-query-xyz-12345');

      expect(results.hits).toHaveLength(0);
      expect(results.estimatedTotalHits).toBe(0);
    });
  });

  describe('Filtering', () => {
    it('should filter events by type', async () => {
      const events = [
        ...generateMultipleEvents(10, 'account_activity'),
        ...generateMultipleEvents(10, 'api_request'),
        ...generateMultipleEvents(10, 'email_send'),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      // Configure filterable attributes
      await index.updateSettings({
        filterableAttributes: ['type'],
      });

      const results = await index.search('', {
        filter: ['type = account_activity'],
      });

      expect(results.hits.length).toBeGreaterThan(0);
    });

    it('should filter events by success status', async () => {
      const events = [
        createAccountActivityEvent({ success: true }),
        createAccountActivityEvent({ success: true }),
        createAccountActivityEvent({ success: false }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      await index.updateSettings({
        filterableAttributes: ['success'],
      });

      const results = await index.search('', {
        filter: ['success = true'],
      });

      expect(results.hits.length).toBeGreaterThan(0);
    });

    it('should filter by multiple criteria', async () => {
      const events = [
        createAccountActivityEvent({
          action: 'login',
          success: true,
          geoLocation: {
            country: 'US',
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.006,
          },
        }),
        createAccountActivityEvent({
          action: 'logout',
          success: true,
          geoLocation: {
            country: 'GB',
            city: 'London',
            latitude: 51.5074,
            longitude: -0.1278,
          },
        }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      await index.updateSettings({
        filterableAttributes: ['action', 'geoLocation.country'],
      });

      const results = await index.search('', {
        filter: ['action = login', 'geoLocation.country = US'],
      });

      expect(results.hits.length).toBeGreaterThan(0);
    });

    it('should filter by status code range', async () => {
      const events = [
        createApiRequestEvent({ statusCode: 200 }),
        createApiRequestEvent({ statusCode: 404 }),
        createApiRequestEvent({ statusCode: 500 }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      await index.updateSettings({
        filterableAttributes: ['statusCode'],
      });

      const results = await index.search('', {
        filter: ['statusCode >= 400'],
      });

      expect(results.hits.length).toBeGreaterThan(0);
    });
  });

  describe('Sorting', () => {
    it('should sort events by timestamp descending', async () => {
      const now = Date.now();
      const events = [
        createAccountActivityEvent({
          id: 'event-1',
          timestamp: new Date(now - 3000).toISOString(),
        }),
        createAccountActivityEvent({
          id: 'event-2',
          timestamp: new Date(now - 1000).toISOString(),
        }),
        createAccountActivityEvent({
          id: 'event-3',
          timestamp: new Date(now - 2000).toISOString(),
        }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      await index.updateSettings({
        sortableAttributes: ['timestamp'],
      });

      const results = await index.search('', {
        sort: ['timestamp:desc'],
      });

      expect(results.hits).toBeDefined();
      expect(results.hits.length).toBe(3);
    });

    it('should sort API events by response time', async () => {
      const events = [
        createApiRequestEvent({ responseTimeMs: 300 }),
        createApiRequestEvent({ responseTimeMs: 100 }),
        createApiRequestEvent({ responseTimeMs: 200 }),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      await index.updateSettings({
        sortableAttributes: ['responseTimeMs'],
      });

      const results = await index.search('', {
        sort: ['responseTimeMs:asc'],
      });

      expect(results.hits).toBeDefined();
    });
  });

  describe('Pagination', () => {
    it('should paginate search results', async () => {
      const events = generateMultipleEvents(50, 'account_activity');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      // First page
      const page1 = await index.search('', {
        limit: 10,
        offset: 0,
      });

      expect(page1.hits.length).toBeLessThanOrEqual(10);
      expect(page1.limit).toBe(10);
      expect(page1.offset).toBe(0);

      // Second page
      const page2 = await index.search('', {
        limit: 10,
        offset: 10,
      });

      expect(page2.hits.length).toBeLessThanOrEqual(10);
      expect(page2.limit).toBe(10);
      expect(page2.offset).toBe(10);
    });

    it('should handle custom page sizes', async () => {
      const events = generateMultipleEvents(100, 'api_request');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search('', {
        limit: 25,
        offset: 0,
      });

      expect(results.hits.length).toBeLessThanOrEqual(25);
    });

    it('should handle offset beyond available results', async () => {
      const events = generateMultipleEvents(20, 'email_send');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      const results = await index.search('', {
        limit: 10,
        offset: 100,
      });

      expect(results.hits).toHaveLength(0);
    });
  });

  describe('Combined Search and Analytics', () => {
    it('should search and aggregate results', async () => {
      const userId = 'analytics-user-123';
      const events = Array.from({ length: 30 }, () => createAccountActivityEvent({ userId }));

      // Index in Meilisearch
      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      // Store in ClickHouse
      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      // Search
      const searchResults = await index.search(userId);
      expect(searchResults.hits.length).toBeGreaterThan(0);

      // Analytics
      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows.length).toBe(30);
    });

    it('should correlate search results with metrics', async () => {
      const events = [
        ...generateMultipleEvents(10, 'account_activity'),
        ...generateMultipleEvents(15, 'api_request'),
        ...generateMultipleEvents(8, 'email_send'),
      ];

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      // Search by type
      await index.updateSettings({
        filterableAttributes: ['type'],
      });

      const apiEvents = await index.search('', {
        filter: ['type = api_request'],
      });

      // Get count from ClickHouse
      const insertedRows = clickhouse.getInsertedRows('events');
      const apiEventsInDb = insertedRows.filter((row) => row.values[0].type === 'api_request');

      expect(apiEvents.estimatedTotalHits).toBe(15);
      expect(apiEventsInDb.length).toBe(15);
    });
  });

  describe('Geographic Search', () => {
    it('should search by country', async () => {
      const events = generateGeoDistributedEvents(10, 'geo-user-123');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      await index.updateSettings({
        searchableAttributes: ['geoLocation.country', 'geoLocation.city'],
        filterableAttributes: ['geoLocation.country'],
      });

      const results = await index.search('US');

      expect(results.hits.length).toBeGreaterThan(0);
    });

    it('should filter by multiple countries', async () => {
      const events = generateGeoDistributedEvents(20, 'multi-geo-user');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      await index.updateSettings({
        filterableAttributes: ['geoLocation.country'],
      });

      const usEvents = await index.search('', {
        filter: ['geoLocation.country = US'],
      });

      const jpEvents = await index.search('', {
        filter: ['geoLocation.country = JP'],
      });

      expect(usEvents.hits.length).toBeGreaterThan(0);
      expect(jpEvents.hits.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Search Updates', () => {
    it('should find newly indexed events', async () => {
      const index = await meilisearch.getIndex('events');

      // Initial search - no results
      const initialResults = await index.search('new-event');
      expect(initialResults.hits).toHaveLength(0);

      // Add new event
      const newEvent = createAccountActivityEvent({
        userId: 'new-event-user-123',
      });
      await index.addDocuments([newEvent]);

      // Search again - should find new event
      const updatedResults = await index.search('new-event');
      expect(updatedResults.hits.length).toBeGreaterThan(0);
    });

    it('should update existing documents', async () => {
      const index = await meilisearch.getIndex('events');

      const event = createAccountActivityEvent({
        id: 'update-test-event',
        userId: 'original-user',
      });
      await index.addDocuments([event]);

      // Update the document
      const updatedEvent = {
        ...event,
        userId: 'updated-user',
      };
      await index.updateDocuments([updatedEvent]);

      const retrieved = await index.getDocument('update-test-event');
      expect(retrieved.userId).toBe('updated-user');
    });

    it('should delete documents from index', async () => {
      const index = await meilisearch.getIndex('events');

      const event = createAccountActivityEvent({
        id: 'delete-test-event',
      });
      await index.addDocuments([event]);

      // Verify it exists
      const beforeDelete = await index.getDocument('delete-test-event');
      expect(beforeDelete).toBeDefined();

      // Delete it
      await index.deleteDocument('delete-test-event');

      // Verify it's gone
      await expect(index.getDocument('delete-test-event')).rejects.toThrow('Document not found');
    });
  });

  describe('Search Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const events = generateMultipleEvents(1000, 'account_activity');

      const index = await meilisearch.getIndex('events');
      const startTime = Date.now();
      await index.addDocuments(events);
      // indexing completed; duration not asserted
      void (Date.now() - startTime);

      const searchStart = Date.now();
      const results = await index.search('');
      const searchTime = Date.now() - searchStart;

      expect(results.estimatedTotalHits).toBe(1000);
      expect(searchTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle concurrent searches', async () => {
      const events = generateMultipleEvents(100, 'account_activity');

      const index = await meilisearch.getIndex('events');
      await index.addDocuments(events);

      // Execute multiple searches concurrently
      const searches = Promise.all([
        index.search(''),
        index.search(''),
        index.search(''),
        index.search(''),
        index.search(''),
      ]);

      const results = await searches;
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.hits).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed search queries gracefully', async () => {
      const index = await meilisearch.getIndex('events');

      // Should not throw for empty or weird queries
      const results = await index.search('   ');
      expect(results).toBeDefined();
    });

    it('should handle invalid filter syntax', async () => {
      const index = await meilisearch.getIndex('events');

      // Mock doesn't validate filter syntax, but real implementation would
      const results = await index.search('', {
        filter: ['invalid filter syntax'],
      });

      expect(results).toBeDefined();
    });

    it('should handle missing index gracefully', async () => {
      await expect(meilisearch.getIndex('non-existent-index')).rejects.toThrow(
        'Index non-existent-index not found'
      );
    });
  });
});
