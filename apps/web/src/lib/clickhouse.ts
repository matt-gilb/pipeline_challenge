import { createClient } from '@clickhouse/client';
import {
  ClickHouseQueryResult,
  DataQualityRow,
  EventCountsRow,
  RecentMetricsRow,
  SuspiciousActivityRow,
} from '@/types/clickhouse';

// Configure ClickHouse client
export const clickhouse = createClient({
  host: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
  username: 'web_user',
  password: 'password',
  database: 'pipeline',
});

// Metrics queries
export async function getEventCounts(
  timeRange: string
): Promise<ClickHouseQueryResult<EventCountsRow>> {
  const query = `
    SELECT
      type,
      count() as count
    FROM events
    WHERE timestamp >= now() - INTERVAL ${timeRange}
    GROUP BY type
  `;

  return await clickhouse.query({
    query,
    format: 'JSONEachRow',
  });
}

export async function getRecentMetrics(
  timeRange: string
): Promise<ClickHouseQueryResult<RecentMetricsRow>> {
  const query = `
    SELECT
      toStartOfInterval(timestamp, INTERVAL 1 minute) as minute,
      type,
      count() as event_count,
      countIf(type = 'account_activity' AND success = 1) as successful_logins,
      countIf(type = 'account_activity' AND success = 0) as failed_logins,
      if(countIf(type = 'api_request') > 0,
         sumIf(responseTimeMs, type = 'api_request') / countIf(type = 'api_request'),
         0) as avg_response_time_ms,
      countIf(type = 'api_request' AND statusCode >= 500) as error_count,
      countIf(type = 'api_request' AND statusCode >= 400 AND statusCode < 500) as warning_count,
      countIf(type = 'email_send' AND success = 1) as emails_sent,
      countIf(type = 'email_send' AND bounceType = 'hard') as hard_bounces
    FROM events
    WHERE timestamp >= now() - INTERVAL ${timeRange}
    GROUP BY minute, type
    ORDER BY minute ASC
  `;

  return await clickhouse.query({
    query,
    format: 'JSONEachRow',
  });
}

export async function getDataQualityMetrics(
  timeRange: string
): Promise<ClickHouseQueryResult<DataQualityRow>> {
  const query = `
    SELECT
      toStartOfInterval(timestamp, INTERVAL 1 minute) as minute,
      count() as total_events,
      0 as missing_ip,
      0 as missing_user,
      countIf(type = 'account_activity' AND isNull(userAgent)) as missing_user_agent,
      countIf(type = 'email_send' AND isNull(recipientEmail)) as missing_email,
      uniq(id) as unique_ids,
      count() - uniq(id) as duplicate_count
    FROM events
    WHERE timestamp >= now() - INTERVAL ${timeRange}
    GROUP BY minute
    ORDER BY minute ASC
  `;

  return await clickhouse.query({
    query,
    format: 'JSONEachRow',
  });
}

export async function getSuspiciousActivity(
  timeRange: string
): Promise<ClickHouseQueryResult<SuspiciousActivityRow>> {
  const query = `
    WITH
      -- Calculate event frequencies per user
      user_stats AS (
        SELECT
          userId,
          count() as event_count,
          uniq(sourceIp) as unique_ips,
          uniq(geoCountry) as unique_countries
        FROM events
        WHERE
          type = 'account_activity'
          AND timestamp >= now() - INTERVAL ${timeRange}
        GROUP BY userId
        HAVING event_count > 10
      ),
      -- Find users with suspicious patterns
      suspicious_users AS (
        SELECT
          userId,
          event_count,
          unique_ips,
          unique_countries
        FROM user_stats
        WHERE
          unique_ips > 3 OR
          unique_countries > 2
      )
    -- Get recent events for suspicious users
    SELECT
      events.*
    FROM events
    JOIN suspicious_users ON events.userId = suspicious_users.userId
    WHERE timestamp >= now() - INTERVAL ${timeRange}
    ORDER BY timestamp DESC
    LIMIT 1000
  `;

  return await clickhouse.query({
    query,
    format: 'JSONEachRow',
  });
}
