import { MockClickHouseClient } from '../helpers/mocks';
import {
  createAccountActivityEvent,
  createApiRequestEvent,
  createEmailEvent,
} from '../fixtures/events';

describe('ClickHouse Queries', () => {
  let clickhouse: MockClickHouseClient;

  beforeEach(() => {
    clickhouse = new MockClickHouseClient();
  });

  afterEach(() => {
    clickhouse.clear();
  });

  describe('Event Count Queries', () => {
    it('should count events by type', async () => {
      const mockData = [
        { type: 'account_activity', count: '150' },
        { type: 'api_request', count: '300' },
        { type: 'email_send', count: '75' },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT type, count() as count
          FROM events
          WHERE timestamp >= now() - INTERVAL 1 HOUR
          GROUP BY type
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows).toHaveLength(3);
      expect(rows[0].type).toBe('account_activity');
      expect(rows[0].count).toBe('150');
    });

    it('should handle empty results', async () => {
      clickhouse.setMockData('events', []);

      const result = await clickhouse.query({
        query: 'SELECT * FROM events',
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows).toHaveLength(0);
    });

    it('should aggregate events over time', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          type: 'account_activity',
          count: '50',
        },
        {
          minute: '2023-10-20 12:01:00',
          type: 'account_activity',
          count: '45',
        },
        {
          minute: '2023-10-20 12:02:00',
          type: 'account_activity',
          count: '55',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            type,
            count() as count
          FROM events
          GROUP BY minute, type
          ORDER BY minute ASC
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows).toHaveLength(3);
      expect(rows[0].minute).toBe('2023-10-20 12:00:00');
    });
  });

  describe('Recent Metrics Queries', () => {
    it('should calculate login success/failure rates', async () => {
      const mockData = [
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
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            type,
            count() as event_count,
            countIf(success = 1) as successful_logins,
            countIf(success = 0) as failed_logins
          FROM events
          WHERE type = 'account_activity'
          GROUP BY minute, type
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].successful_logins).toBe('80');
      expect(rows[0].failed_logins).toBe('20');
    });

    it('should calculate average response times', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          type: 'api_request',
          event_count: '100',
          successful_logins: '0',
          failed_logins: '0',
          avg_response_time_ms: '125.5',
          error_count: '5',
          warning_count: '10',
          emails_sent: '0',
          hard_bounces: '0',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            type,
            avg(responseTimeMs) as avg_response_time_ms
          FROM events
          WHERE type = 'api_request'
          GROUP BY minute, type
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(parseFloat(rows[0].avg_response_time_ms)).toBeCloseTo(125.5, 1);
    });

    it('should count HTTP errors and warnings', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          type: 'api_request',
          event_count: '200',
          successful_logins: '0',
          failed_logins: '0',
          avg_response_time_ms: '150',
          error_count: '15',
          warning_count: '30',
          emails_sent: '0',
          hard_bounces: '0',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            type,
            countIf(statusCode >= 500) as error_count,
            countIf(statusCode >= 400 AND statusCode < 500) as warning_count
          FROM events
          WHERE type = 'api_request'
          GROUP BY minute, type
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].error_count).toBe('15');
      expect(rows[0].warning_count).toBe('30');
    });

    it('should count email metrics', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          type: 'email_send',
          event_count: '100',
          successful_logins: '0',
          failed_logins: '0',
          avg_response_time_ms: null,
          error_count: '0',
          warning_count: '0',
          emails_sent: '85',
          hard_bounces: '5',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            type,
            countIf(success = 1) as emails_sent,
            countIf(bounceType = 'hard') as hard_bounces
          FROM events
          WHERE type = 'email_send'
          GROUP BY minute, type
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].emails_sent).toBe('85');
      expect(rows[0].hard_bounces).toBe('5');
    });
  });

  describe('Data Quality Queries', () => {
    it('should detect missing IP addresses', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          total_events: '1000',
          missing_ip: '15',
          missing_user: '0',
          missing_user_agent: '0',
          missing_email: '0',
          unique_ids: '1000',
          duplicate_count: '0',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            count() as total_events,
            countIf(isNull(sourceIp) OR sourceIp = '') as missing_ip
          FROM events
          GROUP BY minute
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].missing_ip).toBe('15');
    });

    it('should detect missing user agents', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          total_events: '1000',
          missing_ip: '0',
          missing_user: '0',
          missing_user_agent: '25',
          missing_email: '0',
          unique_ids: '1000',
          duplicate_count: '0',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            count() as total_events,
            countIf(type = 'account_activity' AND isNull(userAgent)) as missing_user_agent
          FROM events
          GROUP BY minute
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].missing_user_agent).toBe('25');
    });

    it('should detect duplicate event IDs', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          total_events: '1000',
          missing_ip: '0',
          missing_user: '0',
          missing_user_agent: '0',
          missing_email: '0',
          unique_ids: '985',
          duplicate_count: '15',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            count() as total_events,
            uniq(id) as unique_ids,
            count() - uniq(id) as duplicate_count
          FROM events
          GROUP BY minute
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].unique_ids).toBe('985');
      expect(rows[0].duplicate_count).toBe('15');
    });

    it('should calculate quality score', async () => {
      const mockData = [
        {
          minute: '2023-10-20 12:00:00',
          total_events: '1000',
          missing_ip: '10',
          missing_user: '5',
          missing_user_agent: '15',
          missing_email: '8',
          unique_ids: '995',
          duplicate_count: '5',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: 'SELECT * FROM events',
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      const row = rows[0];

      const totalIssues =
        Number(row.missing_ip) +
        Number(row.missing_user) +
        Number(row.missing_user_agent) +
        Number(row.missing_email) +
        Number(row.duplicate_count);

      const qualityScore = ((1 - totalIssues / Number(row.total_events)) * 100).toFixed(2);

      expect(parseFloat(qualityScore)).toBeCloseTo(95.7, 1);
    });
  });

  describe('Suspicious Activity Queries', () => {
    it('should detect high-frequency users', async () => {
      const mockData = [
        {
          userId: 'suspicious-user-1',
          event_count: '35',
          unique_ips: '1',
          unique_countries: '1',
        },
        {
          userId: 'normal-user-1',
          event_count: '5',
          unique_ips: '1',
          unique_countries: '1',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            userId,
            count() as event_count,
            uniq(sourceIp) as unique_ips,
            uniq(geoCountry) as unique_countries
          FROM events
          WHERE type = 'account_activity'
            AND timestamp >= now() - INTERVAL 5 MINUTE
          GROUP BY userId
          HAVING event_count > 10
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows).toHaveLength(2);

      const suspiciousUsers = rows.filter((r: any) => Number(r.event_count) > 10);
      expect(suspiciousUsers).toHaveLength(2);
    });

    it('should detect users with multiple IPs', async () => {
      const mockData = [
        {
          userId: 'suspicious-user-2',
          event_count: '20',
          unique_ips: '5',
          unique_countries: '1',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            userId,
            count() as event_count,
            uniq(sourceIp) as unique_ips
          FROM events
          WHERE type = 'account_activity'
          GROUP BY userId
          HAVING unique_ips > 3
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].unique_ips).toBe('5');
    });

    it('should detect users from multiple countries', async () => {
      const mockData = [
        {
          userId: 'suspicious-user-3',
          event_count: '15',
          unique_ips: '2',
          unique_countries: '4',
        },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            userId,
            count() as event_count,
            uniq(geoCountry) as unique_countries
          FROM events
          WHERE type = 'account_activity'
          GROUP BY userId
          HAVING unique_countries > 2
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows[0].unique_countries).toBe('4');
    });

    it('should get detailed suspicious activity events', async () => {
      const suspiciousUserId = 'suspicious-user-4';
      const events = Array.from({ length: 5 }, (_, i) =>
        createAccountActivityEvent({
          id: `suspicious-${i}`,
          userId: suspiciousUserId,
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
        })
      );

      for (const event of events) {
        await clickhouse.insert({
          table: 'events',
          values: [event],
          format: 'JSONEachRow',
        });
      }

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(5);

      const suspiciousEvents = insertedRows.filter(
        (row) => row.values[0].userId === suspiciousUserId
      );
      expect(suspiciousEvents).toHaveLength(5);
    });
  });

  describe('Time-based Aggregations', () => {
    it('should aggregate by minute intervals', async () => {
      const mockData = Array.from({ length: 60 }, (_, i) => ({
        minute: `2023-10-20 12:${String(i).padStart(2, '0')}:00`,
        event_count: String(Math.floor(Math.random() * 100) + 50),
      }));

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfMinute(timestamp) as minute,
            count() as event_count
          FROM events
          WHERE timestamp >= now() - INTERVAL 1 HOUR
          GROUP BY minute
          ORDER BY minute ASC
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows).toHaveLength(60);
    });

    it('should aggregate by hour intervals', async () => {
      const mockData = Array.from({ length: 24 }, (_, i) => ({
        hour: `2023-10-20 ${String(i).padStart(2, '0')}:00:00`,
        event_count: String(Math.floor(Math.random() * 1000) + 500),
      }));

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            toStartOfHour(timestamp) as hour,
            count() as event_count
          FROM events
          WHERE timestamp >= now() - INTERVAL 1 DAY
          GROUP BY hour
          ORDER BY hour ASC
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows).toHaveLength(24);
    });

    it('should support custom time range filters', async () => {
      const mockData = [
        { timestamp: '2023-10-20 12:00:00', count: '100' },
        { timestamp: '2023-10-20 13:00:00', count: '150' },
        { timestamp: '2023-10-20 14:00:00', count: '120' },
      ];

      clickhouse.setMockData('events', mockData);

      const result = await clickhouse.query({
        query: `
          SELECT
            timestamp,
            count() as count
          FROM events
          WHERE timestamp >= '2023-10-20 12:00:00'
            AND timestamp <= '2023-10-20 14:00:00'
          GROUP BY timestamp
        `,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(rows).toHaveLength(3);
    });
  });

  describe('Insert Operations', () => {
    it('should insert single event', async () => {
      const event = createAccountActivityEvent();

      await clickhouse.insert({
        table: 'events',
        values: [event],
        format: 'JSONEachRow',
      });

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0].values[0].id).toBe(event.id);
    });

    it('should insert multiple events in batch', async () => {
      const events = [
        createAccountActivityEvent(),
        createApiRequestEvent(),
        createEmailEvent(),
      ];

      await clickhouse.insert({
        table: 'events',
        values: events,
        format: 'JSONEachRow',
      });

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0].values).toHaveLength(3);
    });

    it('should handle large batch inserts', async () => {
      const events = Array.from({ length: 1000 }, () => createAccountActivityEvent());

      await clickhouse.insert({
        table: 'events',
        values: events,
        format: 'JSONEachRow',
      });

      const insertedRows = clickhouse.getInsertedRows('events');
      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0].values).toHaveLength(1000);
    });
  });

  describe('Query Formatting', () => {
    it('should handle JSONEachRow format', async () => {
      clickhouse.setMockData('events', [{ id: '1', value: 'test' }]);

      const result = await clickhouse.query({
        query: 'SELECT * FROM events',
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      expect(Array.isArray(rows)).toBe(true);
    });

    it('should extract table name from SELECT query', async () => {
      const queries = [
        'SELECT * FROM events',
        'SELECT id FROM events WHERE type = "test"',
        'select count() from events group by type',
      ];

      for (const query of queries) {
        const result = await clickhouse.query({ query, format: 'JSONEachRow' });
        expect(result).toBeDefined();
      }
    });

    it('should handle complex queries with joins', async () => {
      const result = await clickhouse.query({
        query: `
          SELECT e.*
          FROM events e
          JOIN user_stats us ON e.userId = us.userId
          WHERE us.is_suspicious = 1
        `,
        format: 'JSONEachRow',
      });

      expect(result).toBeDefined();
    });
  });
});
