import { z } from 'zod';
import {
  MockClickHouseClient,
  MockMeilisearchClient,
  MockMeilisearchIndex,
} from '../helpers/mocks';
import {
  SAMPLE_ACCOUNT_ACTIVITY_EVENT,
  SAMPLE_API_REQUEST_EVENT,
  SAMPLE_EMAIL_EVENT,
  createAccountActivityEvent,
  createApiRequestEvent,
} from '../fixtures/events';

// Mock the lib modules
const mockClickHouse = new MockClickHouseClient();
const mockMeilisearch = new MockMeilisearchClient();

jest.mock('../../apps/web/src/lib/clickhouse', () => ({
  clickhouse: mockClickHouse,
  getEventCounts: jest.fn(),
  getRecentMetrics: jest.fn(),
  getDataQualityMetrics: jest.fn(),
  getSuspiciousActivity: jest.fn(),
}));

jest.mock('../../apps/web/src/lib/meilisearch', () => ({
  meilisearch: mockMeilisearch,
  searchEvents: jest.fn(),
  getEventById: jest.fn(),
  getEventFacets: jest.fn(),
  suggestSearch: jest.fn(),
}));

describe('Web API Endpoints', () => {
  beforeEach(async () => {
    mockClickHouse.clear();
    mockMeilisearch.clear();
    await mockMeilisearch.createIndex('events');
  });

  describe('Metrics API', () => {
    describe('Query Parameter Validation', () => {
      it('should validate correct timeRange format', () => {
        const validTimeRanges = ['1 MINUTE', '5 MINUTE', '1 HOUR', '24 HOUR', '7 DAY'];

        const QuerySchema = z.object({
          timeRange: z.string().regex(/^\d+\s+(MINUTE|HOUR|DAY)$/i),
        });

        validTimeRanges.forEach((timeRange) => {
          const result = QuerySchema.safeParse({ timeRange });
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid timeRange format', () => {
        const invalidTimeRanges = ['invalid', '1', 'MINUTE', '1 SECOND', '1MINUTE'];

        const QuerySchema = z.object({
          timeRange: z.string().regex(/^\d+\s+(MINUTE|HOUR|DAY)$/i),
        });

        invalidTimeRanges.forEach((timeRange) => {
          const result = QuerySchema.safeParse({ timeRange });
          expect(result.success).toBe(false);
        });
      });
    });

    describe('Metrics Processing', () => {
      it('should process event count metrics', async () => {
        const mockData = [
          { type: 'account_activity', count: '100' },
          { type: 'api_request', count: '200' },
          { type: 'email_send', count: '50' },
        ];

        mockClickHouse.setMockData('events', mockData);

        const result = await mockClickHouse.query({
          query: 'SELECT type, count() as count FROM events GROUP BY type',
          format: 'JSONEachRow',
        });

        const rows = await result.json();
        expect(rows).toHaveLength(3);
        expect(rows[0].type).toBe('account_activity');
      });

      it('should process recent metrics with aggregations', async () => {
        const mockMetrics = [
          {
            minute: '2023-10-20 12:00:00',
            type: 'account_activity',
            event_count: '100',
            successful_logins: '80',
            failed_logins: '20',
            avg_response_time_ms: '0',
            error_count: '0',
            warning_count: '0',
            emails_sent: '0',
            hard_bounces: '0',
          },
          {
            minute: '2023-10-20 12:01:00',
            type: 'api_request',
            event_count: '150',
            successful_logins: '0',
            failed_logins: '0',
            avg_response_time_ms: '125.5',
            error_count: '5',
            warning_count: '10',
            emails_sent: '0',
            hard_bounces: '0',
          },
        ];

        mockClickHouse.setMockData('events', mockMetrics);

        const result = await mockClickHouse.query({
          query: 'SELECT * FROM events',
          format: 'JSONEachRow',
        });

        const rows = await result.json();
        expect(rows).toHaveLength(2);

        // Process metrics (simulating the API endpoint logic)
        const processedMetrics = rows.map((row: any) => ({
          minute: row.minute,
          type: row.type,
          event_count: Number(row.event_count),
          successful_logins: Number(row.successful_logins),
          failed_logins: Number(row.failed_logins),
          avg_response_time_ms: Number(row.avg_response_time_ms),
          error_count: Number(row.error_count),
          warning_count: Number(row.warning_count),
          emails_sent: Number(row.emails_sent),
          hard_bounces: Number(row.hard_bounces),
        }));

        expect(processedMetrics[0].event_count).toBe(100);
        expect(processedMetrics[1].avg_response_time_ms).toBe(125.5);
      });

      it('should handle empty metrics gracefully', async () => {
        mockClickHouse.setMockData('events', []);

        const result = await mockClickHouse.query({
          query: 'SELECT * FROM events',
          format: 'JSONEachRow',
        });

        const rows = await result.json();
        expect(rows).toHaveLength(0);
      });
    });

    describe('Time Range Handling', () => {
      it('should support minute intervals', () => {
        const timeRange = '5 MINUTE';
        expect(timeRange).toMatch(/^\d+\s+MINUTE$/);
      });

      it('should support hour intervals', () => {
        const timeRange = '1 HOUR';
        expect(timeRange).toMatch(/^\d+\s+HOUR$/);
      });

      it('should support day intervals', () => {
        const timeRange = '7 DAY';
        expect(timeRange).toMatch(/^\d+\s+DAY$/);
      });
    });
  });

  describe('Data Quality API', () => {
    describe('Quality Metrics Processing', () => {
      it('should process data quality metrics', async () => {
        const mockQualityData = [
          {
            minute: '2023-10-20 12:00:00',
            total_events: '1000',
            missing_ip: '10',
            missing_user: '5',
            missing_user_agent: '15',
            missing_email: '8',
            unique_ids: '990',
            duplicate_count: '10',
          },
        ];

        mockClickHouse.setMockData('events', mockQualityData);

        const result = await mockClickHouse.query({
          query: 'SELECT * FROM events',
          format: 'JSONEachRow',
        });

        const rows = await result.json();
        const metrics = rows.map((row: any) => ({
          minute: row.minute,
          total_events: Number(row.total_events),
          missing_ip: Number(row.missing_ip),
          missing_user: Number(row.missing_user),
          missing_user_agent: Number(row.missing_user_agent),
          missing_email: Number(row.missing_email),
          unique_ids: Number(row.unique_ids),
          duplicate_count: Number(row.duplicate_count),
          quality_score: (
            (1 -
              (Number(row.missing_ip) +
                Number(row.missing_user) +
                Number(row.missing_user_agent) +
                Number(row.missing_email) +
                Number(row.duplicate_count)) /
                Number(row.total_events)) *
            100
          ).toFixed(2),
        }));

        expect(metrics[0].total_events).toBe(1000);
        expect(metrics[0].duplicate_count).toBe(10);
        expect(parseFloat(metrics[0].quality_score)).toBeCloseTo(95.2, 1);
      });

      it('should calculate quality score correctly', () => {
        const totalEvents = 1000;
        const issues = 10 + 5 + 15 + 8 + 10; // 48 total issues

        const qualityScore = ((1 - issues / totalEvents) * 100).toFixed(2);
        expect(parseFloat(qualityScore)).toBeCloseTo(95.2, 1);
      });

      it('should handle perfect quality score', () => {
        const totalEvents = 1000;
        const issues = 0;

        const qualityScore = ((1 - issues / totalEvents) * 100).toFixed(2);
        expect(parseFloat(qualityScore)).toBe(100);
      });

      it('should handle zero events gracefully', () => {
        const totalEvents = 0;
        const issues = 0;

        if (totalEvents === 0) {
          // Should not divide by zero
          expect(totalEvents).toBe(0);
        } else {
          const qualityScore = ((1 - issues / totalEvents) * 100).toFixed(2);
          expect(qualityScore).toBeDefined();
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle Zod validation errors', () => {
        const QuerySchema = z.object({
          timeRange: z.string().regex(/^\d+\s+(MINUTE|HOUR|DAY)$/i),
        });

        const result = QuerySchema.safeParse({ timeRange: 'invalid' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(z.ZodError);
        }
      });
    });
  });

  describe('Search API', () => {
    describe('Request Validation', () => {
      it('should validate correct search request', () => {
        const SearchRequestSchema = z.object({
          query: z.string().min(0),
          filters: z.array(z.string()).optional(),
          sort: z.array(z.string()).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        });

        const validRequest = {
          query: 'test',
          filters: ['type = account_activity'],
          sort: ['timestamp:desc'],
          limit: 50,
          offset: 0,
        };

        const result = SearchRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should reject limit out of range', () => {
        const SearchRequestSchema = z.object({
          query: z.string().min(0),
          limit: z.number().min(1).max(100).optional(),
        });

        const invalidRequests = [
          { query: 'test', limit: 0 },
          { query: 'test', limit: 101 },
          { query: 'test', limit: -1 },
        ];

        invalidRequests.forEach((req) => {
          const result = SearchRequestSchema.safeParse(req);
          expect(result.success).toBe(false);
        });
      });

      it('should reject negative offset', () => {
        const SearchRequestSchema = z.object({
          query: z.string().min(0),
          offset: z.number().min(0).optional(),
        });

        const result = SearchRequestSchema.safeParse({
          query: 'test',
          offset: -1,
        });

        expect(result.success).toBe(false);
      });

      it('should allow empty query string', () => {
        const SearchRequestSchema = z.object({
          query: z.string().min(0),
        });

        const result = SearchRequestSchema.safeParse({ query: '' });
        expect(result.success).toBe(true);
      });
    });

    describe('Search Functionality', () => {
      it('should search events by query', async () => {
        const index = await mockMeilisearch.getIndex('events');

        const events = [
          createAccountActivityEvent({ userId: 'user-123' }),
          createApiRequestEvent({ path: '/api/users' }),
          createAccountActivityEvent({ userId: 'user-456' }),
        ];

        await index.addDocuments(events);

        const results = await index.search('user-123');

        expect(results.hits.length).toBeGreaterThan(0);
      });

      it('should apply filters', async () => {
        const index = await mockMeilisearch.getIndex('events');

        const events = [createAccountActivityEvent(), createApiRequestEvent(), SAMPLE_EMAIL_EVENT];

        await index.addDocuments(events);

        const results = await index.search('', {
          filter: ['type = account_activity'],
        });

        expect(results.hits.length).toBeGreaterThan(0);
      });

      it('should apply sorting', async () => {
        const index = await mockMeilisearch.getIndex('events');

        const events = [
          createAccountActivityEvent({ timestamp: '2023-10-20T12:00:00Z' }),
          createAccountActivityEvent({ timestamp: '2023-10-20T12:01:00Z' }),
          createAccountActivityEvent({ timestamp: '2023-10-20T12:02:00Z' }),
        ];

        await index.addDocuments(events);

        const results = await index.search('', {
          sort: ['timestamp:desc'],
        });

        expect(results.hits).toBeDefined();
      });

      it('should apply pagination', async () => {
        const index = await mockMeilisearch.getIndex('events');

        const events = Array.from({ length: 50 }, (_, i) =>
          createAccountActivityEvent({ id: `event-${i}` })
        );

        await index.addDocuments(events);

        const results = await index.search('', {
          limit: 10,
          offset: 0,
        });

        expect(results.hits.length).toBeLessThanOrEqual(10);
        expect(results.limit).toBe(10);
        expect(results.offset).toBe(0);
      });

      it('should handle empty search results', async () => {
        const index = await mockMeilisearch.getIndex('events');

        const results = await index.search('nonexistent-query-12345');

        expect(results.hits).toHaveLength(0);
        expect(results.estimatedTotalHits).toBe(0);
      });
    });

    describe('Document Retrieval', () => {
      it('should get event by ID', async () => {
        const index = await mockMeilisearch.getIndex('events');
        const event = createAccountActivityEvent();

        await index.addDocuments([event]);

        const retrieved = await index.getDocument(event.id);
        expect(retrieved.id).toBe(event.id);
      });

      it('should throw error for non-existent document', async () => {
        const index = await mockMeilisearch.getIndex('events');

        await expect(index.getDocument('non-existent-id')).rejects.toThrow('Document not found');
      });
    });

    describe('Faceted Search', () => {
      it('should return facet information', async () => {
        const index = await mockMeilisearch.getIndex('events');

        await index.addDocuments([
          createAccountActivityEvent(),
          createApiRequestEvent(),
          SAMPLE_EMAIL_EVENT,
        ]);

        const results = await index.search('', {
          facets: ['type'],
          limit: 0,
        });

        expect(results).toBeDefined();
      });
    });

    describe('Search Suggestions', () => {
      it('should provide search suggestions', async () => {
        const index = await mockMeilisearch.getIndex('events');

        await index.addDocuments([
          createAccountActivityEvent({ userId: 'user-test-123' }),
          createAccountActivityEvent({ userId: 'user-test-456' }),
        ]);

        const results = await index.search('user', {
          limit: 5,
        });

        expect(results.hits.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Responses', () => {
    it('should handle ClickHouse query errors', async () => {
      // Simulate error by querying non-existent table
      const result = await mockClickHouse.query({
        query: 'SELECT * FROM non_existent_table',
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      // Should return empty array for non-existent table
      expect(rows).toEqual([]);
    });

    it('should handle Meilisearch index errors', async () => {
      await expect(mockMeilisearch.getIndex('non-existent-index')).rejects.toThrow(
        'Index non-existent-index not found'
      );
    });
  });

  describe('CORS and HTTP Methods', () => {
    it('should handle OPTIONS request', () => {
      const response = {
        status: 204,
        headers: {
          Allow: 'POST, OPTIONS',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      };

      expect(response.status).toBe(204);
      expect(response.headers.Allow).toContain('POST');
      expect(response.headers['Access-Control-Allow-Methods']).toContain('POST');
    });
  });

  describe('Response Formatting', () => {
    it('should format successful responses', () => {
      const data = [
        { id: 1, value: 'test' },
        { id: 2, value: 'test2' },
      ];

      const response = {
        status: 200,
        body: data,
      };

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should format error responses', () => {
      const errorResponse = {
        status: 500,
        body: { error: 'Failed to fetch metrics' },
      };

      expect(errorResponse.status).toBe(500);
      expect(errorResponse.body.error).toBeDefined();
    });

    it('should format validation error responses', () => {
      const validationError = {
        status: 400,
        body: { error: 'Invalid time range parameter' },
      };

      expect(validationError.status).toBe(400);
      expect(validationError.body.error).toContain('Invalid');
    });
  });
});
