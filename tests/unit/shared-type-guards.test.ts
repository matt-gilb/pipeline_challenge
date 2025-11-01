import {
  isAccountActivityEvent,
  isApiRequestEvent,
  isEmailEvent,
  isHighRiskActivity,
  hasDataQualityIssues,
  Event,
  SuspiciousActivity,
  DataQualityMetrics,
} from '@pipeline/shared';
import {
  SAMPLE_ACCOUNT_ACTIVITY_EVENT,
  SAMPLE_API_REQUEST_EVENT,
  SAMPLE_EMAIL_EVENT,
  createAccountActivityEvent,
  createApiRequestEvent,
  createEmailEvent,
} from '../fixtures/events';

describe('Type Guards', () => {
  describe('isAccountActivityEvent', () => {
    it('should return true for account activity events', () => {
      const event = SAMPLE_ACCOUNT_ACTIVITY_EVENT;
      expect(isAccountActivityEvent(event)).toBe(true);
    });

    it('should return false for API request events', () => {
      const event = SAMPLE_API_REQUEST_EVENT;
      expect(isAccountActivityEvent(event)).toBe(false);
    });

    it('should return false for email events', () => {
      const event = SAMPLE_EMAIL_EVENT;
      expect(isAccountActivityEvent(event)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const event: Event = createAccountActivityEvent();

      if (isAccountActivityEvent(event)) {
        // TypeScript should recognize this as AccountActivityEvent
        expect(event.action).toBeDefined();
        expect(event.geoLocation).toBeDefined();
      }
    });
  });

  describe('isApiRequestEvent', () => {
    it('should return true for API request events', () => {
      const event = SAMPLE_API_REQUEST_EVENT;
      expect(isApiRequestEvent(event)).toBe(true);
    });

    it('should return false for account activity events', () => {
      const event = SAMPLE_ACCOUNT_ACTIVITY_EVENT;
      expect(isApiRequestEvent(event)).toBe(false);
    });

    it('should return false for email events', () => {
      const event = SAMPLE_EMAIL_EVENT;
      expect(isApiRequestEvent(event)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const event: Event = createApiRequestEvent();

      if (isApiRequestEvent(event)) {
        // TypeScript should recognize this as ApiRequestEvent
        expect(event.method).toBeDefined();
        expect(event.path).toBeDefined();
        expect(event.statusCode).toBeDefined();
      }
    });
  });

  describe('isEmailEvent', () => {
    it('should return true for email events', () => {
      const event = SAMPLE_EMAIL_EVENT;
      expect(isEmailEvent(event)).toBe(true);
    });

    it('should return false for account activity events', () => {
      const event = SAMPLE_ACCOUNT_ACTIVITY_EVENT;
      expect(isEmailEvent(event)).toBe(false);
    });

    it('should return false for API request events', () => {
      const event = SAMPLE_API_REQUEST_EVENT;
      expect(isEmailEvent(event)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const event: Event = createEmailEvent();

      if (isEmailEvent(event)) {
        // TypeScript should recognize this as EmailEvent
        expect(event.recipientEmail).toBeDefined();
        expect(event.templateId).toBeDefined();
        expect(event.bounceType).toBeDefined();
      }
    });
  });

  describe('Type guard combinations', () => {
    it('should handle multiple type checks', () => {
      const events: Event[] = [
        createAccountActivityEvent(),
        createApiRequestEvent(),
        createEmailEvent(),
      ];

      const accountEvents = events.filter(isAccountActivityEvent);
      const apiEvents = events.filter(isApiRequestEvent);
      const emailEvents = events.filter(isEmailEvent);

      expect(accountEvents).toHaveLength(1);
      expect(apiEvents).toHaveLength(1);
      expect(emailEvents).toHaveLength(1);
    });

    it('should ensure mutual exclusivity', () => {
      const accountEvent = createAccountActivityEvent();

      expect(isAccountActivityEvent(accountEvent)).toBe(true);
      expect(isApiRequestEvent(accountEvent)).toBe(false);
      expect(isEmailEvent(accountEvent)).toBe(false);
    });
  });
});

describe('Metrics Utilities', () => {
  describe('isHighRiskActivity', () => {
    it('should identify high risk when events_5m exceeds threshold', () => {
      const activity: SuspiciousActivity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 25, // Over threshold (20)
        events_ip_5m: 5,
        events_country_5m: 10,
      };

      expect(isHighRiskActivity(activity)).toBe(true);
    });

    it('should identify high risk when events_ip_5m exceeds threshold', () => {
      const activity: SuspiciousActivity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 10,
        events_ip_5m: 15, // Over threshold (10)
        events_country_5m: 8,
      };

      expect(isHighRiskActivity(activity)).toBe(true);
    });

    it('should identify high risk when events_country_5m exceeds threshold', () => {
      const activity: SuspiciousActivity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 10,
        events_ip_5m: 5,
        events_country_5m: 20, // Over threshold (15)
      };

      expect(isHighRiskActivity(activity)).toBe(true);
    });

    it('should not flag normal activity as high risk', () => {
      const activity: SuspiciousActivity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 10,
        events_ip_5m: 5,
        events_country_5m: 8,
      };

      expect(isHighRiskActivity(activity)).toBe(false);
    });

    it('should flag activity at exactly the threshold as high risk', () => {
      const activity: SuspiciousActivity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 20,
        events_ip_5m: 10,
        events_country_5m: 15,
      };

      // Should not be flagged (thresholds are exclusive)
      expect(isHighRiskActivity(activity)).toBe(false);
    });

    it('should flag activity just above threshold', () => {
      const activity: SuspiciousActivity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 21, // Just over threshold
        events_ip_5m: 5,
        events_country_5m: 8,
      };

      expect(isHighRiskActivity(activity)).toBe(true);
    });

    it('should handle multiple threshold violations', () => {
      const activity: SuspiciousActivity = {
        timestamp: '2023-10-20T12:00:00Z',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceIp: '192.168.1.1',
        type: 'account_activity',
        action: 'login',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        userAgent: 'Mozilla/5.0',
        events_5m: 30, // Over threshold
        events_ip_5m: 20, // Over threshold
        events_country_5m: 25, // Over threshold
      };

      expect(isHighRiskActivity(activity)).toBe(true);
    });
  });

  describe('hasDataQualityIssues', () => {
    it('should detect issues when missing data rate exceeds threshold', () => {
      const metrics: DataQualityMetrics = {
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
      };
      // Total missing rate: 11.5% > 5% threshold

      expect(hasDataQualityIssues(metrics)).toBe(true);
    });

    it('should detect issues when duplicate rate exceeds threshold', () => {
      const metrics: DataQualityMetrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 10, // 1%
        missing_user: 5, // 0.5%
        missing_user_agent: 15, // 1.5%
        missing_email: 8, // 0.8%
        unique_ids: 980,
        duplicate_count: 20, // 2% > 1% threshold
      };

      expect(hasDataQualityIssues(metrics)).toBe(true);
    });

    it('should not flag when metrics are within acceptable thresholds', () => {
      const metrics: DataQualityMetrics = {
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
      };
      // Total missing rate: 3.8% < 5% threshold
      // Duplicate rate: 0.5% < 1% threshold

      expect(hasDataQualityIssues(metrics)).toBe(false);
    });

    it('should handle zero events without errors', () => {
      const metrics: DataQualityMetrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 0,
        account_events: 0,
        api_events: 0,
        email_events: 0,
        missing_ip: 0,
        missing_user: 0,
        missing_user_agent: 0,
        missing_email: 0,
        unique_ids: 0,
        duplicate_count: 0,
      };

      expect(hasDataQualityIssues(metrics)).toBe(false);
    });

    it('should flag at exactly 5% missing data threshold', () => {
      const metrics: DataQualityMetrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 25, // 2.5%
        missing_user: 10, // 1%
        missing_user_agent: 10, // 1%
        missing_email: 5, // 0.5%
        unique_ids: 995,
        duplicate_count: 5,
      };
      // Total missing rate: 5% = threshold

      // Should not be flagged (threshold is exclusive)
      expect(hasDataQualityIssues(metrics)).toBe(false);
    });

    it('should flag just above 5% missing data threshold', () => {
      const metrics: DataQualityMetrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 26, // 2.6%
        missing_user: 10, // 1%
        missing_user_agent: 10, // 1%
        missing_email: 5, // 0.5%
        unique_ids: 995,
        duplicate_count: 5,
      };
      // Total missing rate: 5.1% > 5% threshold

      expect(hasDataQualityIssues(metrics)).toBe(true);
    });

    it('should flag at exactly 1% duplicate threshold', () => {
      const metrics: DataQualityMetrics = {
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
        duplicate_count: 10, // 1% = threshold
      };

      // Should not be flagged (threshold is exclusive)
      expect(hasDataQualityIssues(metrics)).toBe(false);
    });

    it('should handle both issues simultaneously', () => {
      const metrics: DataQualityMetrics = {
        window_start: '2023-10-20T12:00:00Z',
        total_events: 1000,
        account_events: 400,
        api_events: 400,
        email_events: 200,
        missing_ip: 30, // 3%
        missing_user: 25, // 2.5%
        missing_user_agent: 40, // 4%
        missing_email: 20, // 2%
        unique_ids: 980,
        duplicate_count: 20, // 2%
      };
      // Both thresholds exceeded

      expect(hasDataQualityIssues(metrics)).toBe(true);
    });

    it('should calculate missing data rate correctly', () => {
      const totalEvents = 1000;
      const missingIp = 10;
      const missingUser = 5;
      const missingUserAgent = 15;
      const missingEmail = 8;

      const missingDataRate =
        (missingIp + missingUser + missingUserAgent + missingEmail) / totalEvents;

      expect(missingDataRate).toBeCloseTo(0.038, 3);
      expect(missingDataRate).toBeLessThan(0.05);
    });

    it('should calculate duplicate rate correctly', () => {
      const totalEvents = 1000;
      const duplicateCount = 20;

      const duplicateRate = duplicateCount / totalEvents;

      expect(duplicateRate).toBe(0.02);
      expect(duplicateRate).toBeGreaterThan(0.01);
    });
  });
});
