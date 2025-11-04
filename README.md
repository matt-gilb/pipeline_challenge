![CI](https://github.com/matt-gilbert/pipeline_challenge/workflows/CI/badge.svg)

# Demo Data Pipeline

A real-time data pipeline for Trust & Safety or Abuse Prevention related workflows that ingests high-volume event streams and provides analytics and search capabilities.

**This is demo code.** While everything works, this was never intended to be used for production. I have designed things to resemble what I would do if this were for a real data pipeline, including CI checks and health checks when starting the application. But this is not robust or ready for real-world use. For one thing, this only works with the built-in event generator, which creates a small set of events with limited detail. The web service is very bare-bones and is only intended to allow access to a functioning dashboard and search page.

### Monitoring & Dashboards

The application provides two distinct interfaces for different audiences:

- **Web Dashboard (port 3000)**: For Trust & Safety analysts, or others in Delivery & Compliance to view event data and explore business metrics
  - **Web Search Tool**: (Located at /search) Search Events and view event details. Used for investigations.
- **Grafana Dashboards (port 3001)**: For DevOps/SRE/Data Engineering teams to monitor pipeline health, system status, and detect attack patterns
  - **Pipeline Health & System Status**: Monitor event ingestion rates, processing lag, data quality scores, and service health
  - **Business Metrics & Attack Detection**: Track failure rates, response times, error distributions, and automated attack indicators

### Attack Mode (simulated)

In our event-generator, a simulated attack mode is automatially toggled every 5 minutes. There's a 20% chance of entering attack mode each interval. When activated, it logs "Entering attack mode...". This happens continously while event-generator is running.

When enabled, the attack simulation modifies event generation behavior:
1. Account Activity Events: 60% of events become account activity (vs. random distribution)
2. IP Concentration: Uses only 10% of the IP pool (more concentrated attacks from fewer IPs)
3. Higher Failure Rates: 70% failure rate for account activities (vs. 5% normally)
4. API Request Issues:
   - 40% get 500 errors, 20% get 429 (rate limit) errors
   - 20% have response time spikes (1-11 seconds vs. 50-250ms normally)
5. Email Failures: 40% failure rate (vs. 5% normally)

## 🚀 Quick Start (Docker Only!)

> [!NOTE]
> No local dependencies needed except Docker!

```bash
# Clone and start everything
git clone https://github.com/matt-gilb/pipeline_challenge.git
cd pipeline_challenge
docker compose up -d

# Open web dashboard
open http://localhost:3000

# Open Grafana dashboard
open http://localhost:3001
```

That's it! The entire application runs in Docker containers. No Node.js, pnpm, or other tools required locally.

---

## Overview

This project implements a real-time data pipeline with two key components:

1. Data Ingestion & Pipeline Service
   - Ingests simulated event streams (account activity, API requests, email events)
   - Processes events in real-time through Kafka/Redpanda
   - Stores data in ClickHouse for analytics
   - Indexes events in Meilisearch for fast searching

2. Dashboard & Search Features
   - Real-time metrics visualization
   - Data quality monitoring
   - Event search interface
   - Support for rule enforcement data-driven decisions

## Architecture

The system is built as a Docker Compose application with the following services:

- **Event Generator**: Simulates high-volume event streams with realistic patterns
- **Stream Worker**: Processes events and loads them into databases
- **Redpanda**: Kafka-compatible message broker
- **ClickHouse**: Analytics database with materialized views
- **Meilisearch**: Search engine for event exploration
- **Web UI**: Next.js dashboard and search interface
- **Grafana**: Infrastructure monitoring and business metrics dashboards

---

## Getting Started

### Prerequisites

**Only Docker is required!**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac/Windows)
- OR Docker Engine + Docker Compose (Linux)

No Node.js, pnpm, or other development tools needed locally.

### Running the Application

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pipeline_challenge.git
   cd pipeline_challenge
   ```

2. Start everything with one command:
   ```bash
   docker compose up -d
   ```

   This will:
   - Build all TypeScript applications inside containers
   - Install dependencies inside containers
   - Start all services

   **First run:** 3-5 minutes (building images)
   **Subsequent runs:** 30-60 seconds (using cached images)

3. Access the interfaces:
   - Dashboard: http://localhost:3000
   - Search: http://localhost:3000/search
   - Grafana: http://localhost:3001 (infrastructure monitoring)

### Useful Commands

```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Reset everything (stop services and remove volumes)
docker compose down -v
```

### Project Structure

The project uses PNPM workspaces (managed inside Docker):

- `/apps`: Application services
  - `event-generator`: Simulated event stream generator
  - `stream-worker`: Event processing and data loading
  - `web`: Next.js dashboard and search UI
- `/packages`: Shared code
  - `shared`: Common types, schemas, and utilities
- `/infra`: Infrastructure configuration
  - Docker Compose files
  - Database initialization
  - Grafana configuration

---

## Features

### Event Generation

- Simulates multiple event types:
  - Account activity (logins, logouts, etc.)
  - API requests with response times
  - Email sending events
- Supports attack mode simulation
- Configurable event rates and patterns

### Real-time Processing

- Stream processing with Kafka/Redpanda
- Automatic schema validation
- Data quality checks
- Multi-database loading

### Analytics & Search

- Real-time metrics dashboard
- Data quality monitoring
- Full-text search
- Faceted filtering
- Suspicious activity detection

## Data Model

### Event Types

1. Account Activity Events
   - Login/logout events
   - Password changes
   - Two-factor authentication
   - Success/failure tracking
   - Geolocation data

2. API Request Events
   - HTTP method and path
   - Response times
   - Status codes
   - Request/response sizes

3. Email Events
   - Recipient information
   - Template tracking
   - Delivery status
   - Bounce handling

## Additional Documentation

- **[detailed_start.md](docs/detailed_start.md)** - Detailed documentation on running this pipeline application
- **[api_guide.md](docs/api_guide.md)** - Details on all API endpoints available
- **[dev_reference.md](docs/dev_reference.md)** - Everything you'd want to know for running or troubleshooting the pipeline application
- **[grafana_guide.md](docs/grafana_guide.md)** - Comprehensive guide to Grafana dashboards for infrastructure monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes (no local build needed, edit files directly)
4. Test with `docker compose up -d --build`
5. Create a Pull Request

---

All content copyright © Matt Gilbert - 2025
