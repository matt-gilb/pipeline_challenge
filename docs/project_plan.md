# Demo mini data-pipeline plan

To make evaluation easier, and since this is only for demonstration purposes, I will limit this to a single git repo, powered by Docker Compose (to run a multi-container application). I will use TypeScript everywhere and GitHub Actions for CI.

## Key components:
1. a data ingestion and pipeline service that receives high-volume event streams and processes them into usable, queryable datasets
2. a dashboard or search feature that enables people to explore metrics, monitor data quality, and support decisions.

## Goals & non-goals

**Goals:** ingest faked high-volume events, transform to queryable datasets in real-time (not near real-time), and expose dashboards/search for metrics & data quality. Support _simulated_ event streams. Prioritize scale, correctness, and operability.

**Non-goals:** full ML pipeline, case-management UI, or long-term data governance tooling beyond essentials.

## Top-level shape

Language: 100% TypeScript for all app code (generator, ingestion, stream worker, APIs, web).
Repo: one git repo, PNPM workspaces, infra via Docker Compose. CI with GitHub Actions.
Run mode: docker compose up (ClickHouse, Redpanda/Kafka, Meilisearch, Grafana).

## Acceptance checklist

* [ ] Single command `docker compose up -d` brings everything up
* [ ] No external/cloud configuration required
* [ ] Web dashboard live at :3000 with metrics & search
* [ ] ClickHouse tables auto-created; rollups materialized
* [ ] Data-quality panel shows freshness/duplicates/schema rejects
* [ ] Attack profile toggle (ATTACK) visibly shifts KPIs
* [ ] CI: lint, typecheck, unit tests, and compose smoke pass

---

# Overview

* Services (all via docker compose):
  * Redpanda (Kafka-compatible broker)
  * ClickHouse (OLAP + rollups)
  * Meilisearch (fast investigator search)
  * Stream Worker (TypeScript; Kafka → transforms → ClickHouse + Meili)
  * Event Generator (TypeScript; realistic abuse bursts)
  * Next.js Web (TypeScript dashboards + search UI)
* No cloud dependencies, no trial software.
* Repo: PNPM workspaces for apps + shared package.
* CI: GitHub Actions runs lint, typecheck, tests, and a headless compose sanity check.

---

# Core Services

## Event Generator

This service creates simulated user events that we would want to ingest and monitor. There should be account-related events (login/out, passwords, etc.), and service-related events (requests to our API, and email send events).

This should have an "attack" mode that changes events to look like suspicious activity is occuring. The attack mode is really just to help us build some anomoly detection into our web dashboard and grafana.

## Stream Worker

This is our pipeline core. It ingests the events from the generator via redpanda (our simplified kafka service), and gets them into clickhouse (our DBMS and analytical processing).

## Web UI (dashboard and search)

The Web Dashboard and Search tool is for less-technical analysts or compliance/abuse-prevention teams exploring the event data.

The dashboard should be clear, concise, and easy to check.

The search tool should allow non-technical users to search for records that would indicate dangerous activity.

## Grafana for backend monitoring

Grafana is for infra/ops teams monitoring the data pipeline itself. It will have two main components:
1. Pipeline health and system status
  - This is looking at ingestion rate, processing lag, data quality, missing fields, and event stream health
2. Business metrics and potential attack detection
  - This is looking at changes in failure rates, response time percentiles, http errors, IP concentration, and email delivery rates

## APIs

In addition to the self-contained web-UI and Grafana dashboards, there should be endpoints exposed that allow other teams and services to ingest the data we have for use outside the system.

---

# Health and testing

While this is just a demo, we should strive to have good code coverage for our tests, and an easy way to have them run when changes are introduced.

It will also be important to have an easy way to check the overall health of the application and its various services.
