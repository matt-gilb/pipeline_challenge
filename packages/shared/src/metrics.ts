import { z } from 'zod';

// 1-minute and 1-hour rollup metrics (shared schema)
export const RollupMetricsSchema = z.object({
  window_start: z.string().datetime(),
  type: z.enum(['account_activity', 'api_request', 'email_send']),
  event_count: z.number().int().min(0),
  // Account activity metrics
  successful_logins: z.number().int().min(0),
  failed_logins: z.number().int().min(0),
  // API metrics
  avg_response_time_ms: z.number().nullable(),
  error_count: z.number().int().min(0),
  warning_count: z.number().int().min(0),
  // Email metrics
  emails_sent: z.number().int().min(0),
  hard_bounces: z.number().int().min(0),
  soft_bounces: z.number().int().min(0),
});

// Hourly metrics extend rollup with additional fields
export const HourlyMetricsSchema = RollupMetricsSchema.extend({
  unique_countries: z.number().int().min(0),
  unique_ips: z.number().int().min(0),
});

// Suspicious activity metrics
export const SuspiciousActivitySchema = z.object({
  timestamp: z.string().datetime(),
  userId: z.string().uuid(),
  sourceIp: z.string().ip(),
  type: z.literal('account_activity'),
  action: z.enum([
    'login',
    'logout',
    'password_change',
    'two_factor_enabled',
    'two_factor_disabled',
    'account_created',
    'account_deleted',
  ]),
  geoCountry: z.string().length(2),
  geoCity: z.string(),
  userAgent: z.string(),
  events_5m: z.number().int().min(0),
  events_ip_5m: z.number().int().min(0),
  events_country_5m: z.number().int().min(0),
});

// Data quality metrics
export const DataQualityMetricsSchema = z.object({
  window_start: z.string().datetime(),
  total_events: z.number().int().min(0),
  account_events: z.number().int().min(0),
  api_events: z.number().int().min(0),
  email_events: z.number().int().min(0),
  // Missing data counts
  missing_ip: z.number().int().min(0),
  missing_user: z.number().int().min(0),
  missing_user_agent: z.number().int().min(0),
  missing_email: z.number().int().min(0),
  // Duplicate detection
  unique_ids: z.number().int().min(0),
  duplicate_count: z.number().int().min(0),
});

// Type exports
export type RollupMetrics = z.infer<typeof RollupMetricsSchema>;
export type HourlyMetrics = z.infer<typeof HourlyMetricsSchema>;
export type SuspiciousActivity = z.infer<typeof SuspiciousActivitySchema>;
export type DataQualityMetrics = z.infer<typeof DataQualityMetricsSchema>;

// Query parameter schemas
export const TimeRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const MetricsQuerySchema = TimeRangeSchema.extend({
  types: z.array(z.enum(['account_activity', 'api_request', 'email_send'])).optional(),
  interval: z.enum(['1m', '1h']),
});

export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

// Utility functions
export const isHighRiskActivity = (activity: SuspiciousActivity): boolean => {
  const HIGH_RISK_THRESHOLDS = {
    events_5m: 20,
    events_ip_5m: 10,
    events_country_5m: 15,
  };

  return (
    activity.events_5m > HIGH_RISK_THRESHOLDS.events_5m ||
    activity.events_ip_5m > HIGH_RISK_THRESHOLDS.events_ip_5m ||
    activity.events_country_5m > HIGH_RISK_THRESHOLDS.events_country_5m
  );
};

export const hasDataQualityIssues = (metrics: DataQualityMetrics): boolean => {
  const total = metrics.total_events;
  if (total === 0) return false;

  const QUALITY_THRESHOLDS = {
    missing_data: 0.05, // 5% of events can have missing data
    duplicates: 0.01, // 1% of events can be duplicates
  };

  const missingDataRate =
    (metrics.missing_ip +
      metrics.missing_user +
      metrics.missing_user_agent +
      metrics.missing_email) /
    total;

  const duplicateRate = metrics.duplicate_count / total;

  return (
    missingDataRate > QUALITY_THRESHOLDS.missing_data ||
    duplicateRate > QUALITY_THRESHOLDS.duplicates
  );
};
