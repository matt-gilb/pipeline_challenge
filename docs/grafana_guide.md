# Grafana Dashboards Guide

This application includes two pre-configured Grafana dashboards designed for different monitoring needs.

## Overview

**Grafana is for infrastructure/operations teams** monitoring the data pipeline itself, while the Web Dashboard (port 3000) is for Trust & Safety analysts exploring the event data.

## Access

- **Grafana Home:** http://localhost:3001
- **Pipeline Health Dashboard:** http://localhost:3001/d/pipeline-health
- **Business Metrics Dashboard:** http://localhost:3001/d/business-metrics

### Authentication

Anonymous access is enabled with Admin privileges for demo purposes. No login required.

---

## Dashboard 1: Pipeline Health & System Status

**Purpose:** Monitor infrastructure health and data pipeline operations

**Refresh Rate:** 5 seconds

**Audience:** DevOps, SRE, Data Engineering teams

### Panels

#### 1. Event Ingestion Rate
- **Type:** Time series graph
- **Shows:** Total events per minute flowing through the pipeline
- **Alert Thresholds:**
  - Green: Normal operation
  - Yellow: < 100 events/min (low throughput warning)
  - Red: < 50 events/min (critical)
- **Use Case:** Detect if event generation or ingestion has stopped or slowed

#### 2. Data Processing Lag
- **Type:** Gauge
- **Shows:** Seconds between the most recent event timestamp and current time
- **Thresholds:**
  - Green: < 30 seconds (healthy)
  - Yellow: 30-60 seconds (degraded)
  - Red: > 60 seconds (critical lag)
- **Use Case:** Identify processing bottlenecks or stream worker issues

#### 3. Data Quality Score
- **Type:** Stat with trend sparkline
- **Shows:** Percentage of "clean" records (no missing fields, no duplicates)
- **Formula:** `(total - missing_ip - missing_user_agent - missing_email - duplicates) / total * 100`
- **Thresholds:**
  - Red: < 90% (poor quality)
  - Yellow: 90-95% (acceptable)
  - Green: > 95% (excellent)
- **Use Case:** Overall health indicator for data quality

#### 4. Missing Data Breakdown
- **Type:** Horizontal bar gauge
- **Shows:** Count of each type of data quality issue:
  - Missing IP addresses
  - Missing User Agent strings
  - Missing Email addresses
  - Duplicate events
- **Use Case:** Identify which data quality issues need attention

#### 5. Schema Validation Panels (3 stats)
- **Events Processed (Last Min):** Total events in the last minute
- **Duplicate Rate %:** Percentage of duplicate events
- **Missing Field Rate %:** Percentage of events with missing required fields
- **Use Case:** Quick health check metrics

#### 6. Event Type Distribution
- **Type:** Pie chart
- **Shows:** Breakdown of event types in the last 5 minutes
- **Event Types:**
  - account_activity
  - api_request
  - email_send
- **Use Case:** Detect if a specific event type has stopped flowing (indicates generator or routing issue)

#### 7. Last Event Age by Type
- **Type:** Stat panels (one per event type)
- **Shows:** Seconds since last event of each type
- **Thresholds:**
  - Green: < 10 seconds (actively flowing)
  - Yellow: 10-30 seconds (slowing)
  - Red: > 30 seconds (stopped)
- **Use Case:** Quickly identify which event stream has issues

#### 8. Data Quality Score Over Time
- **Type:** Time series graph
- **Shows:** Quality score trending over the selected time range
- **Use Case:** Identify patterns or degradation in data quality

---

## Dashboard 2: Business Metrics & Attack Detection

**Purpose:** Monitor data patterns, performance metrics, and detect anomalies

**Refresh Rate:** 10 seconds

**Audience:** DevOps/SRE teams monitoring for infrastructure impact of attacks

### Panels

#### 1. Event Volume by Type
- **Type:** Multi-line time series
- **Shows:** Events per minute for each event type
- **Features:** 
  - Mean, last value, and max in legend table
  - Threshold lines for attack detection
- **Use Case:** Visualize normal vs. attack traffic patterns

#### 2. Attack Mode Indicator
- **Type:** Large stat panel with background color
- **Shows:** Calculated attack score (0-100%)
- **Formula:** Average of failure rates across account activity, API errors, and email failures
- **Thresholds:**
  - Green "NORMAL": 0-30%
  - Orange "ELEVATED": 30-50%
  - Red "ATTACK DETECTED": > 50%
- **Use Case:** Single-glance attack detection for operations team

#### 3. Failure Rate Trends
- **Type:** Multi-line time series
- **Shows:** Three failure rate percentages over time:
  - **Account Activity Failures** (red): Failed login/logout attempts
  - **API 5xx Errors** (orange): Server errors
  - **Email Failures** (yellow): Bounce rate
- **Use Case:** Identify which service is under stress during an attack

#### 4. API Response Time Percentiles
- **Type:** Multi-line time series
- **Shows:** 
  - P50 (Median) - green
  - P95 - yellow
  - P99 - red
- **Measured in:** Milliseconds
- **Normal Values:**
  - P50: 50-250ms
  - P95: 100-300ms
  - P99: 200-500ms
- **Attack Mode Values:**
  - P99 can spike to 1-11 seconds
- **Use Case:** Detect performance degradation before it impacts users

#### 5. HTTP Error Rate Distribution
- **Type:** Stacked area chart
- **Shows:** Count of HTTP status codes over time:
  - 2xx Success (green)
  - 4xx Client Errors (yellow)
  - 5xx Server Errors (red)
- **Attack Behavior:**
  - Normal: Mostly 2xx with occasional 4xx
  - Attack: Surge in 5xx (40%) and 429 rate limit errors (20%)
- **Use Case:** Identify infrastructure stress vs. client-side issues

#### 6. IP Concentration Score
- **Type:** Stat panel
- **Shows:** Average events per unique IP in the last 10 minutes
- **Thresholds:**
  - Green: 1-5 events/IP (normal distributed traffic)
  - Yellow: 5-10 events/IP (slightly concentrated)
  - Red: > 10 events/IP (concentrated attack from few IPs)
- **Attack Behavior:** During attack mode, only 10% of IP pool is used
- **Use Case:** Detect coordinated attacks from small IP ranges

#### 7. Unique Countries (1h)
- **Type:** Stat panel
- **Shows:** Number of unique countries in account activity events (last hour)
- **Use Case:** 
  - Sudden increase = distributed attack or service expansion
  - Normal: Relatively stable count
  - Can correlate with IP concentration for attack patterns

#### 8. Top 10 Countries by Account Activity
- **Type:** Horizontal bar chart
- **Shows:** Event count by country
- **Use Case:** Identify geographic anomalies or attack sources

#### 9. Email Delivery Health
- **Type:** Three stat panels
- **Shows:**
  - **Success Rate %** (green > 90%)
  - **Hard Bounce Rate %** (red if > 10%)
  - **Soft Bounce Rate %** (red if > 20%)
- **Normal Behavior:** 95% success, 5% failures
- **Attack Behavior:** 40% failure rate
- **Use Case:** Monitor email service health and detect email-related attacks

---

## Attack Mode Detection

The dashboards automatically detect attack mode through multiple indicators:

### Primary Indicators
1. **Attack Mode Indicator** shows "ATTACK DETECTED" when composite failure rate > 50%
2. **Event Volume** shows surge in account_activity events (60% of total)
3. **Failure Rate Trends** show elevated failures across all services

### Secondary Indicators
1. **IP Concentration** increases (fewer IPs, more events)
2. **API Response Time** P99 spikes dramatically (1-11 seconds)
3. **HTTP Errors** show 40% 5xx and 20% 429 errors
4. **Email Failures** jump to 40%

### Attack Mode Characteristics

The event generator simulates attacks with these patterns:

- **Duration:** Random intervals (20% chance every 5 minutes)
- **Account Activity:** Becomes 60% of all events
- **IP Pool:** Reduced to 10% (concentrated attacks)
- **Failure Rates:**
  - Account activity: 70% (vs. 5% normal)
  - API 5xx: 40%, API 429: 20%
  - API response spikes: 20% of requests (1-11s vs. 50-250ms)
  - Email: 40% (vs. 5% normal)

---

## Data Sources

Both dashboards query **ClickHouse** using the Grafana ClickHouse plugin.

### Tables Used

1. **pipeline.events** - Raw event data
   - Used for: Real-time queries, percentile calculations, geographic data

2. **pipeline.events_1m_mv** - 1-minute aggregations
   - Used for: Event volume, failure rate trends
   - Columns: event_count, successful_logins, failed_logins, error_count, etc.

3. **pipeline.events_1h_mv** - 1-hour aggregations
   - Used for: Longer-term trends
   - Includes: unique_countries, unique_ips

4. **pipeline.data_quality_mv** - Data quality metrics
   - Used for: Quality score, missing fields, duplicates
   - Columns: total_events, missing_ip, missing_user_agent, missing_email, duplicate_count

### Query Time Filters

Grafana provides `$timeFilter` variable automatically:
- Filters queries to the selected time range
- Applied as: `WHERE $timeFilter` in SQL
- Works with ClickHouse `timestamp` DateTime64 column

---

## Customization

### Editing Dashboards

1. Click the gear icon (⚙️) in the top right
2. Select "Settings"
3. Make changes to panels, queries, or layout
4. Click "Save dashboard"

**Note:** Changes are stored in the Grafana container. To persist:
1. Click "Dashboard settings" → "JSON Model"
2. Copy the JSON
3. Save to `infra/grafana/dashboards/*.json`
4. Rebuild containers

### Adding New Panels

All ClickHouse materialized views are available for queries. Useful fields include:

**From events table:**
- `type`, `timestamp`, `sourceIp`, `userId`
- `success`, `action`, `failureReason`
- `statusCode`, `responseTimeMs`, `method`, `path`
- `geoCountry`, `geoCity`, `geoLatitude`, `geoLongitude`
- `bounceType`, `recipientEmail`, `templateId`

**Aggregate functions:**
- `count()`, `countIf(condition)`, `uniq(field)`
- `sum()`, `avg()`, `min()`, `max()`
- `quantile(0.50)`, `quantile(0.95)`, `quantile(0.99)`

### Time Range Presets

Dashboard defaults:
- **Pipeline Health:** Last 30 minutes
- **Business Metrics:** Last 1 hour

Quick ranges available: 5m, 15m, 30m, 1h, 3h, 6h, 12h, 24h, 7d

---

## Troubleshooting

### Dashboard Shows "No Data"

1. **Check ClickHouse connection:**
   ```bash
   docker compose logs clickhouse | grep -i error
   ```

2. **Verify events are flowing:**
   ```bash
   docker compose logs event-generator
   docker compose logs stream-worker
   ```

3. **Query ClickHouse directly:**
   ```bash
   docker compose exec clickhouse clickhouse-client -q "SELECT count() FROM pipeline.events"
   ```

### Panels Show Errors

1. **Check Grafana logs:**
   ```bash
   docker compose logs grafana
   ```

2. **Verify datasource:**
   - Go to Configuration → Data Sources → ClickHouse
   - Click "Test" button
   - Should show "Data source is working"

3. **Check query syntax:**
   - Edit panel
   - Look for red error messages under query
   - ClickHouse syntax is case-sensitive

### Dashboard Not Loading

1. **Restart Grafana:**
   ```bash
   docker compose restart grafana
   ```

2. **Check provisioning:**
   ```bash
   docker compose exec grafana ls -la /etc/grafana/provisioning/dashboards
   ```

3. **Verify dashboard files exist:**
   ```bash
   ls -la infra/grafana/dashboards/
   ```

---

## Performance Considerations

### Query Performance

- **1-minute views** are fast (pre-aggregated)
- **Raw events table** queries on short time ranges (< 1 hour) are acceptable
- **Percentile calculations** on raw data are expensive but cached

### Refresh Rates

- **Pipeline Health:** 5s refresh is appropriate for ops monitoring
- **Business Metrics:** 10s refresh balances freshness with load
- Can be adjusted per-dashboard or per-panel

### Data Retention

ClickHouse tables grow indefinitely in this demo. For production:
- Set TTL on events table: `ALTER TABLE events MODIFY TTL timestamp + INTERVAL 30 DAY`
- Materialized views automatically clean up when source data expires

---

## Integration with Alerts (Future)

Grafana supports alerting on panel queries. Potential alerts:

1. **Pipeline lag > 60 seconds** - Critical data processing delay
2. **Data quality score < 90%** - Poor data quality
3. **Attack mode detected** - Automated incident creation
4. **Event type stopped flowing** - Service failure
5. **API P99 > 5 seconds** - Performance degradation

To enable:
1. Edit panel
2. Click "Alert" tab
3. Configure alert conditions
4. Set notification channel (email, Slack, PagerDuty, etc.)

---

## Comparison: Grafana vs. Web Dashboard

| Feature | Grafana (port 3001) | Web Dashboard (port 3000) |
|---------|---------------------|---------------------------|
| **Audience** | DevOps/SRE/Data Engineering | Trust & Safety Analysts |
| **Purpose** | Monitor pipeline health | Explore event data |
| **Focus** | Infrastructure metrics | Business insights |
| **Data Quality** | System-level monitoring | Data validation results |
| **Attack Detection** | Automated indicators | Manual investigation |
| **Customization** | Full dashboard editing | Fixed layouts |
| **Alerting** | Built-in support | None |
| **Time Ranges** | Flexible (5m to 7d+) | Fixed recent windows |
| **Search** | No | Yes (Meilisearch) |
| **Percentiles** | Yes (P50, P95, P99) | Basic stats only |

**Use Grafana when:** Monitoring system health, detecting incidents, tracking SLIs/SLOs  
**Use Web Dashboard when:** Investigating specific events, searching for patterns, data analysis

---

## Next Steps

- Explore both dashboards while the system is running
- Wait for attack mode to trigger (5-minute intervals) and observe the changes
- Try different time ranges to see historical patterns
- Experiment with editing panels to create custom views

For more information:
- [Grafana Documentation](https://grafana.com/docs/)
- [ClickHouse Grafana Plugin](https://grafana.com/grafana/plugins/grafana-clickhouse-datasource/)
- [ClickHouse SQL Reference](https://clickhouse.com/docs/en/sql-reference/)