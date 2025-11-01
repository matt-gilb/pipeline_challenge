# API Guide

## Overview

The Demo Dashboard provides a REST API for querying event data, metrics, and search functionality. All endpoints are available at `http://localhost:3000/api`.

## Table of Contents

- [Endpoints](#endpoints)
  - [GET /api/metrics](#1-get-apimetrics) - Time-series metrics
  - [GET /api/data-quality](#2-get-apidata-quality) - Data quality metrics
  - [POST /api/search](#3-post-apisearch) - Search and filter events
- [Common Use Cases](#common-use-cases)
- [Data Types](#data-types)
- [Time Range Format](#time-range-format)
- [Error Handling](#error-handling)
- [Examples with jq](#examples-with-jq)
- [Testing](#testing)

---

## Endpoints

### 1. GET `/api/metrics`

Retrieve time-series metrics aggregated by minute and event type.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `timeRange` | string | Yes | Time window for metrics | `1 HOUR`, `15 MINUTE`, `6 HOUR`, `1 DAY` |

#### Response Format

Returns an array of metric objects, one per minute per event type.

```json
[
  {
    "minute": "2025-11-02 14:30:00",
    "type": "account_activity",
    "event_count": 245,
    "successful_logins": 234,
    "failed_logins": 11,
    "avg_response_time_ms": 0,
    "error_count": 0,
    "warning_count": 0,
    "emails_sent": 0,
    "hard_bounces": 0
  },
  {
    "minute": "2025-11-02 14:30:00",
    "type": "api_request",
    "event_count": 269,
    "successful_logins": 0,
    "failed_logins": 0,
    "avg_response_time_ms": 151.37,
    "error_count": 6,
    "warning_count": 7,
    "emails_sent": 0,
    "hard_bounces": 0
  }
]
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `minute` | string | Timestamp for the minute bucket (YYYY-MM-DD HH:MM:SS) |
| `type` | string | Event type: `account_activity`, `api_request`, or `email_send` |
| `event_count` | number | Total events in this minute |
| `successful_logins` | number | Successful login attempts (account_activity only) |
| `failed_logins` | number | Failed login attempts (account_activity only) |
| `avg_response_time_ms` | number | Average API response time in milliseconds (api_request only) |
| `error_count` | number | Count of 5xx status codes (api_request only) |
| `warning_count` | number | Count of 4xx status codes (api_request only) |
| `emails_sent` | number | Successfully sent emails (email_send only) |
| `hard_bounces` | number | Hard bounce count (email_send only) |

#### Example Request

```bash
curl "http://localhost:3000/api/metrics?timeRange=1%20HOUR"
```

#### Error Responses

**400 Bad Request** - Invalid time range format
```json
{
  "error": "Invalid time range parameter"
}
```

**500 Internal Server Error** - Database error
```json
{
  "error": "Failed to fetch metrics"
}
```

---

### 2. GET `/api/data-quality`

Retrieve data quality metrics including missing fields, duplicates, and quality scores.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `timeRange` | string | Yes | Time window for metrics | `1 HOUR`, `15 MINUTE`, `6 HOUR`, `1 DAY` |

#### Response Format

Returns an array of data quality metrics aggregated by minute.

```json
[
  {
    "minute": "2025-11-02 14:30:00",
    "total_events": 757,
    "missing_ip": 0,
    "missing_user": 0,
    "missing_user_agent": 0,
    "missing_email": 0,
    "unique_ids": 757,
    "duplicate_count": 0,
    "quality_score": "100.00"
  }
]
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `minute` | string | Timestamp for the minute bucket |
| `total_events` | number | Total events in this minute |
| `missing_ip` | number | Count of events with missing IP address |
| `missing_user` | number | Count of events with missing user ID |
| `missing_user_agent` | number | Count of account_activity events with null user agent |
| `missing_email` | number | Count of email_send events with null recipient email |
| `unique_ids` | number | Count of unique event IDs |
| `duplicate_count` | number | Count of duplicate event IDs |
| `quality_score` | string | Percentage score (0-100) indicating data quality |

#### Quality Score Calculation

```
quality_score = (1 - (total_issues / total_events)) * 100

where total_issues = missing_ip + missing_user + missing_user_agent +
                     missing_email + duplicate_count
```

#### Example Request

```bash
curl "http://localhost:3000/api/data-quality?timeRange=1%20HOUR"
```

#### Error Responses

**400 Bad Request** - Invalid time range format
```json
{
  "error": "Invalid time range parameter"
}
```

**500 Internal Server Error** - Database error
```json
{
  "error": "Failed to fetch data quality metrics"
}
```

---

### 3. POST `/api/search`

Search and filter events using Meilisearch.

#### Request Body

```json
{
  "query": "search term",
  "filters": ["type = 'account_activity'", "success = true"],
  "sort": ["timestamp:desc"],
  "limit": 50,
  "offset": 0
}
```

#### Request Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `query` | string | Yes | Search query (can be empty for all results) | - |
| `filters` | array | No | Array of filter strings | `[]` |
| `sort` | array | No | Array of sort criteria | `["timestamp:desc"]` |
| `limit` | number | No | Maximum results to return (1-100) | `50` |
| `offset` | number | No | Number of results to skip for pagination | `0` |

#### Filter Syntax

Filters use Meilisearch filter syntax:

| Filter Type | Example | Description |
|-------------|---------|-------------|
| Equality | `type = 'account_activity'` | Exact match |
| Multiple values | `type IN ['account_activity', 'api_request']` | Match any value |
| Numeric comparison | `statusCode >= 400` | Greater than or equal |
| Null check | `action IS NOT NULL` | Not null |
| Combined | `type = 'api_request' AND statusCode >= 500` | Multiple conditions |

#### Available Filter Fields

- `type` - Event type (account_activity, api_request, email_send)
- `timestamp` - Event timestamp
- `success` - Success status (true/false)
- `action` - Account action type
- `method` - HTTP method (GET, POST, etc.)
- `statusCode` - HTTP status code
- `bounceType` - Email bounce type (hard, soft, none)
- `geoLocation.country` - Geographic country code

#### Sort Syntax

Sort criteria format: `field:order`

- Order: `asc` (ascending) or `desc` (descending)
- Available sort fields: `timestamp`, `responseTimeMs`

#### Response Format

```json
{
  "hits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-11-02T14:30:45.123Z",
      "sourceIp": "192.168.1.100",
      "userId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "type": "account_activity",
      "action": "login",
      "success": true,
      "userAgent": "Mozilla/5.0...",
      "geoLocation": {
        "country": "US",
        "city": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194
      }
    }
  ],
  "estimatedTotalHits": 1523,
  "offset": 0,
  "limit": 50,
  "processingTimeMs": 12,
  "query": "192.168"
}
```

#### Example Requests

**Basic search:**
```bash
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "192.168.1.100"
  }'
```

**Search with filters:**
```bash
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "filters": [
      "type = \"account_activity\"",
      "success = false"
    ],
    "limit": 20
  }'
```

**Search API errors:**
```bash
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "filters": [
      "type = \"api_request\"",
      "statusCode >= 500"
    ],
    "sort": ["timestamp:desc"]
  }'
```

**Pagination:**
```bash
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "login",
    "limit": 25,
    "offset": 25
  }'
```

#### Error Responses

**400 Bad Request** - Invalid request body
```json
{
  "error": "Failed to perform search"
}
```

**500 Internal Server Error** - Search service error
```json
{
  "error": "Failed to perform search"
}
```

---

## Common Use Cases

### 1. Monitor Failed Logins

```bash
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "filters": [
      "type = \"account_activity\"",
      "action = \"login\"",
      "success = false"
    ],
    "sort": ["timestamp:desc"],
    "limit": 100
  }'
```

### 2. Find API Errors in Last Hour

```bash
# First get metrics
curl "http://localhost:3000/api/metrics?timeRange=1%20HOUR" | \
  jq '[.[] | select(.type == "api_request" and .error_count > 0)]'

# Then search for specific errors
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "filters": ["type = \"api_request\"", "statusCode >= 500"],
    "limit": 50
  }'
```

### 3. Track Email Bounces

```bash
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "filters": [
      "type = \"email_send\"",
      "bounceType IN [\"hard\", \"soft\"]"
    ],
    "sort": ["timestamp:desc"]
  }'
```

### 4. Investigate Suspicious User Activity

```bash
# Search by user ID
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "sort": ["timestamp:desc"],
    "limit": 100
  }'
```

### 5. Check Data Quality

```bash
curl "http://localhost:3000/api/data-quality?timeRange=1%20HOUR" | \
  jq '[.[] | select(.quality_score < "100.00")]'
```

---

## Rate Limiting

Currently, there are no rate limits enforced. For production use, consider implementing:
- Rate limiting per IP address
- API key authentication
- Request throttling

---

## CORS

CORS is not currently configured. The API is intended for same-origin use by the dashboard.

For external access, add CORS headers to the Next.js configuration.

---

## Data Types

### Event Types

| Type | Description |
|------|-------------|
| `account_activity` | User authentication and account changes |
| `api_request` | API endpoint requests |
| `email_send` | Email delivery events |

### Account Actions

- `login` - User login attempt
- `logout` - User logout
- `password_change` - Password changed
- `two_factor_enabled` - 2FA enabled
- `two_factor_disabled` - 2FA disabled
- `account_created` - New account
- `account_deleted` - Account deleted

### HTTP Methods

- `GET`, `POST`, `PUT`, `DELETE`, `PATCH`

### Email Bounce Types

- `none` - Successfully delivered
- `soft` - Temporary failure
- `hard` - Permanent failure

---

## Time Range Format

Valid time range formats follow the pattern: `<number> <unit>`

| Example | Description |
|---------|-------------|
| `15 MINUTE` | Last 15 minutes |
| `1 HOUR` | Last hour |
| `6 HOUR` | Last 6 hours |
| `1 DAY` | Last 24 hours |
| `7 DAY` | Last week |

Case-insensitive. Must include space between number and unit.

---

## Performance Notes

- **Metrics endpoint:** Queries are optimized with materialized views. Fast for large time ranges.
- **Data quality endpoint:** Calculates aggregations on-the-fly. May be slower for large time ranges.
- **Search endpoint:** Uses Meilisearch for fast full-text search. Returns in <20ms typically.

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Human-readable error message"
}
```

HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `500` - Internal server error

---

## Examples with jq

Process API responses with jq for easier parsing:

```bash
# Get total events per type
curl -s "http://localhost:3000/api/metrics?timeRange=1%20HOUR" | \
  jq 'group_by(.type) | map({type: .[0].type, total: map(.event_count) | add})'

# Calculate average API response time
curl -s "http://localhost:3000/api/metrics?timeRange=1%20HOUR" | \
  jq '[.[] | select(.type == "api_request")] |
      map(.avg_response_time_ms) |
      add / length'

# Find minutes with quality issues
curl -s "http://localhost:3000/api/data-quality?timeRange=1%20HOUR" | \
  jq '[.[] | select(.quality_score != "100.00")]'
```

---

## Testing

Test all endpoints are working:

```bash
# Test metrics
curl -s "http://localhost:3000/api/metrics?timeRange=1%20HOUR" | \
  jq 'length'

# Test data quality
curl -s "http://localhost:3000/api/data-quality?timeRange=1%20HOUR" | \
  jq '.[0].quality_score'

# Test search
curl -s -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "", "limit": 1}' | \
  jq '.hits | length'
```

All should return valid responses without errors.

---

**Last Updated:** November 2, 2025
**API Version:** 1.0
**Base URL:** http://localhost:3000/api
