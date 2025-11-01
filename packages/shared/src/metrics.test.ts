import {
  RollupMetricsSchema,
  HourlyMetricsSchema,
  SuspiciousActivitySchema,
  DataQualityMetricsSchema,
  isHighRiskActivity,
  hasDataQualityIssues,
} from './metrics';

describe('Metrics Schemas', () => {
  describe('RollupMetricsSchema', () => {
    it('validates valid rollup metrics', () => {
      const metrics = {
        window_start: '2023-10-20T12:00:00Z',
        type: 'account_activity',
        event_count: 100,
        successful_logins: 80,
        failed_logins: 20,
        avg_response_time_ms: 150.5,
        error_count: 5,
        warning_count: 10,
        emails_sent: 50,
        hard_bounces: 2,
        soft_bounces: 3,
      } as const;

      const result = RollupMetricsSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });

    it('allows null for avg_response_time_ms', () => {
      const metrics = {
        window_start: '2023-10-20T12:00:00Z',
        type: 'email_send',
        event_count: 100,
        successful_logins: 0,
        failed_logins: 0,
        avg_response_time_ms: null,
        error_count: 0,
        warning_count: 0,
        emails_sent: 95,
        hard_bounces: 3,
        soft_bounces: 2,
      } as const;

      const result = RollupMetricsSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });
  });

  describe('HourlyMetricsSchema', () => {
    it('validates valid hourly metrics', () => {
      const metrics = {
        window_start: '2023-10-20T12:00:00Z',
        type: 'account_activity',
        event_count: 1000,
        successful_logins: 800,
        failed_logins: 200,
        avg_response_time_ms: 145.2,
        error_count: 50,
        warning_count: 100,
        emails_sent: 500,
        hard_bounces: 20,
        soft_bounces: 30,
        unique_countries: 25,
        unique_ips: 150,
      } as const;

      const result = HourlyMetricsSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });
  });

  describe('SuspiciousActivitySchema', () => {
    it('validates valid suspicious activity', () => {
      const activity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 25,
        events_ip_5m: 15,
        events_country_5m: 20,
      } as const;

      const result = SuspiciousActivitySchema.safeParse(activity);
      expect(result.success).toBe(true);
    });

    it('identifies high risk activity', () => {
      const activity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 25, // Over threshold (20)
        events_ip_5m: 8,
        events_country_5m: 12,
      } as const;

      expect(isHighRiskActivity(activity)).toBe(true);
    });

    it('identifies normal activity', () => {
      const activity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 15,
        events_ip_5m: 8,
        events_country_5m: 12,
      } as const;

      expect(isHighRiskActivity(activity)).toBe(false);
    });
  });

  describe('DataQualityMetricsSchema', () => {
    it('validates valid data quality metrics', () => {
      const metrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 10,
        missing_user: 5,
        missing_user_agent: 15,
        missing_email: 8,
        unique_ids: 990,
        duplicate_count: 10,
      } as const;

      const result = DataQualityMetricsSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });

    it('identifies quality issues with high missing data rate', () => {
      const metrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 30, // 3%
        missing_user: 25, // 2.5%
        missing_user_agent: 40, // 4%
        missing_email: 20, // 2%
        unique_ids: 990,
        duplicate_count: 10,
      } as const;
      // Total missing rate: 11.5% > 5% threshold
      expect(hasDataQualityIssues(metrics)).toBe(true);
    });

    it('identifies quality issues with high duplicate rate', () => {
      const metrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 10,
        missing_user: 5,
        missing_user_agent: 15,
        missing_email: 8,
        unique_ids: 980,
        duplicate_count: 20, // 2% > 1% threshold
      } as const;

      expect(hasDataQualityIssues(metrics)).toBe(true);
    });

    it('passes when metrics are within acceptable thresholds', () => {
      const metrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 10, // 1%
        missing_user: 5, // 0.5%
        missing_user_agent: 15, // 1.5%
        missing_email: 8, // 0.8%
        unique_ids: 995,
        duplicate_count: 5, // 0.5%
      } as const;

      expect(hasDataQualityIssues(metrics)).toBe(false);
    });
  });
});
