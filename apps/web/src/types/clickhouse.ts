// Response type for raw ClickHouse query results
export interface ClickHouseQueryResult<T> {
  json(): Promise<T[]>;
}

// Data quality metrics row from ClickHouse
export interface DataQualityRow {
  minute: string;
  total_events: string;
  missing_ip: string;
  missing_user: string;
  missing_user_agent: string;
  missing_email: string;
  unique_ids: string;
  duplicate_count: string;
}

// Processed data quality metrics
export interface DataQualityMetric {
  minute: string;
  total_events: number;
  missing_ip: number;
  missing_user: number;
  missing_user_agent: number;
  missing_email: number;
  unique_ids: number;
  duplicate_count: number;
  quality_score: string;
}

// Event counts row from ClickHouse
export interface EventCountsRow {
  type: string;
  count: string;
}

// Recent metrics row from ClickHouse
export interface RecentMetricsRow {
  minute: string;
  type: string;
  event_count: string;
  successful_logins: string;
  failed_logins: string;
  avg_response_time_ms: string;
  error_count: string;
  warning_count: string;
  emails_sent: string;
  hard_bounces: string;
}

// Suspicious activity row from ClickHouse
export interface SuspiciousActivityRow {
  id: string;
  timestamp: string;
  sourceIp: string;
  userId: string;
  type: string;
  action?: string;
  success?: number;
  failureReason?: string;
  userAgent?: string;
  geoLocation?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  method?: string;
  path?: string;
  statusCode?: number;
  responseTimeMs?: number;
  requestSize?: number;
  responseSize?: number;
  recipientEmail?: string;
  templateId?: string;
  messageId?: string;
  bounceType?: string;
}
