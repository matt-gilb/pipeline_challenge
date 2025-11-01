-- Create database and switch to it
CREATE DATABASE IF NOT EXISTS pipeline;
USE pipeline;

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID,
    timestamp DateTime64(3),
    sourceIp String,
    userId UUID,
    type Enum('account_activity', 'api_request', 'email_send'),
    -- Account activity fields
    action Nullable(Enum(
        'login', 'logout', 'password_change',
        'two_factor_enabled', 'two_factor_disabled',
        'account_created', 'account_deleted'
    )),
    success Nullable(UInt8),
    failureReason Nullable(String),
    userAgent Nullable(String),
    geoCountry Nullable(String),
    geoCity Nullable(String),
    geoLatitude Nullable(Float64),
    geoLongitude Nullable(Float64),
    -- API request fields
    method Nullable(Enum('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    path Nullable(String),
    statusCode Nullable(UInt16),
    responseTimeMs Nullable(UInt32),
    requestSize Nullable(UInt32),
    responseSize Nullable(UInt32),
    -- Email fields
    recipientEmail Nullable(String),
    templateId Nullable(String),
    messageId Nullable(UUID),
    bounceType Nullable(Enum('hard', 'soft', 'none'))
) ENGINE = MergeTree()
ORDER BY (timestamp, type, id);

-- Create user for web application
CREATE USER IF NOT EXISTS web_user IDENTIFIED WITH plaintext_password BY 'password';
GRANT SELECT ON pipeline.* TO web_user;
GRANT INSERT ON pipeline.events TO web_user;

-- Create materialized view for 1-minute metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS events_1m_mv
ENGINE = SummingMergeTree()
ORDER BY (window_start, type)
POPULATE AS
SELECT
    toStartOfMinute(timestamp) as window_start,
    type,
    count() as event_count,
    -- Account activity metrics
    countIf(type = 'account_activity' AND success = 1) as successful_logins,
    countIf(type = 'account_activity' AND success = 0) as failed_logins,
    -- API metrics (sum and count for avg calculation in queries)
    sumIf(responseTimeMs, type = 'api_request') as total_response_time_ms,
    countIf(type = 'api_request') as api_request_count,
    countIf(type = 'api_request' AND statusCode >= 500) as error_count,
    countIf(type = 'api_request' AND statusCode >= 400 AND statusCode < 500) as warning_count,
    -- Email metrics
    countIf(type = 'email_send' AND success = 1) as emails_sent,
    countIf(type = 'email_send' AND bounceType = 'hard') as hard_bounces,
    countIf(type = 'email_send' AND bounceType = 'soft') as soft_bounces
FROM events
GROUP BY window_start, type;

-- Create materialized view for hourly metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS events_1h_mv
ENGINE = SummingMergeTree()
ORDER BY (window_start, type)
POPULATE AS
SELECT
    toStartOfHour(timestamp) as window_start,
    type,
    count() as event_count,
    -- Account activity metrics
    countIf(type = 'account_activity' AND success = 1) as successful_logins,
    countIf(type = 'account_activity' AND success = 0) as failed_logins,
    -- API metrics (sum and count for avg calculation in queries)
    sumIf(responseTimeMs, type = 'api_request') as total_response_time_ms,
    countIf(type = 'api_request') as api_request_count,
    countIf(type = 'api_request' AND statusCode >= 500) as error_count,
    countIf(type = 'api_request' AND statusCode >= 400 AND statusCode < 500) as warning_count,
    -- Email metrics
    countIf(type = 'email_send' AND success = 1) as emails_sent,
    countIf(type = 'email_send' AND bounceType = 'hard') as hard_bounces,
    countIf(type = 'email_send' AND bounceType = 'soft') as soft_bounces,
    -- Geo metrics
    uniqIf(geoCountry, type = 'account_activity') as unique_countries,
    uniqIf(sourceIp, type = 'account_activity') as unique_ips
FROM events
GROUP BY window_start, type;

-- Create materialized view for suspicious activity detection
CREATE MATERIALIZED VIEW IF NOT EXISTS suspicious_activity_mv
ENGINE = SummingMergeTree()
ORDER BY (interval_start, userId)
POPULATE AS
SELECT
    toStartOfInterval(timestamp, INTERVAL 5 MINUTE) as interval_start,
    userId,
    count() as event_count,
    uniq(sourceIp) as unique_ips,
    uniq(geoCountry) as unique_countries
FROM events
WHERE type = 'account_activity'
GROUP BY
    interval_start,
    userId;

-- Create view for data quality metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS data_quality_mv
ENGINE = SummingMergeTree()
ORDER BY (window_start)
POPULATE AS
SELECT
    toStartOfMinute(timestamp) as window_start,
    count() as total_events,
    countIf(type = 'account_activity') as account_events,
    countIf(type = 'api_request') as api_events,
    countIf(type = 'email_send') as email_events,
    -- Missing or invalid data (only nullable fields can be missing)
    countIf(sourceIp = '') as missing_ip,
    0 as missing_user,
    countIf(type = 'account_activity' AND isNull(userAgent)) as missing_user_agent,
    countIf(type = 'email_send' AND isNull(recipientEmail)) as missing_email,
    -- Duplicates (requires extra processing in application)
    uniq(id) as unique_ids,
    count() - uniq(id) as duplicate_count
FROM events
GROUP BY window_start;
