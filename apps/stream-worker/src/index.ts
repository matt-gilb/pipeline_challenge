import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { createClient } from '@clickhouse/client';
import { MeiliSearch, Index } from 'meilisearch';
import { Event, validateEvent } from '@pipeline/shared';
import pino from 'pino';
import { getOrCreateIndex } from './clients';

// Initialize logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Configure clients
const kafka = new Kafka({
  clientId: 'stream-worker',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const clickhouse = createClient({
  host: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
  username: 'web_user',
  password: 'password',
  database: 'pipeline',
});

const meilisearch = new MeiliSearch({
  host: `http://${process.env.MEILISEARCH_HOST || 'localhost'}:7700`,
  apiKey: process.env.MEILISEARCH_KEY || 'pipeline_secure_master_key_2024',
});

// Constants
const CONSUMER_GROUP = 'stream-worker-group';
const TOPICS = {
  ACCOUNT_ACTIVITY: 'account-activity',
  API_REQUESTS: 'api-requests',
  EMAIL_EVENTS: 'email-events',
};

// Track metrics
const metrics = {
  processedEvents: 0,
  failedEvents: 0,
  lastProcessedTimestamp: Date.now(),
};

// Handle graceful shutdown
let isShuttingDown = false;
const consumers: Consumer[] = [];

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Shutting down stream worker...');

  try {
    await Promise.all(consumers.map((consumer) => consumer.disconnect()));
    await clickhouse.close();
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

let eventsIndex: Index;

// Process each message
async function processMessage({ topic, partition, message }: EachMessagePayload) {
  if (!message.value) return;

  try {
    // Parse and validate event
    const event = validateEvent(JSON.parse(message.value.toString()));

    // Insert into ClickHouse
    await insertIntoClickHouse(event);

    // Index in Meilisearch (convert timestamp to Unix timestamp for filtering)
    if (eventsIndex) {
      const meiliEvent = {
        ...event,
        timestamp: Math.floor(new Date(event.timestamp).getTime() / 1000),
      };
      await eventsIndex.addDocuments([meiliEvent]);
    }

    // Update metrics
    metrics.processedEvents++;
    metrics.lastProcessedTimestamp = Date.now();

    logger.debug({
      msg: 'Processed event',
      topic,
      partition,
      type: event.type,
      timestamp: event.timestamp,
    });
  } catch (err) {
    metrics.failedEvents++;
    logger.error({
      msg: 'Failed to process message',
      topic,
      partition,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Insert event into ClickHouse
async function insertIntoClickHouse(event: Event) {
  // Convert ISO timestamp to ClickHouse DateTime64 format (YYYY-MM-DD HH:MM:SS.mmm)
  const timestampDate = new Date(event.timestamp);
  const year = timestampDate.getUTCFullYear();
  const month = String(timestampDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(timestampDate.getUTCDate()).padStart(2, '0');
  const hours = String(timestampDate.getUTCHours()).padStart(2, '0');
  const minutes = String(timestampDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(timestampDate.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(timestampDate.getUTCMilliseconds()).padStart(3, '0');
  const formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;

  const values = {
    id: event.id,
    timestamp: formattedTimestamp,
    sourceIp: event.sourceIp,
    userId: event.userId,
    type: event.type,
    // Account activity fields
    action: event.type === 'account_activity' ? event.action : null,
    success: 'success' in event ? (event.success ? 1 : 0) : null,
    failureReason: 'failureReason' in event ? event.failureReason : null,
    userAgent: 'userAgent' in event ? event.userAgent : null,
    geoCountry: event.type === 'account_activity' ? event.geoLocation.country : null,
    geoCity: event.type === 'account_activity' ? event.geoLocation.city : null,
    geoLatitude: event.type === 'account_activity' ? event.geoLocation.latitude : null,
    geoLongitude: event.type === 'account_activity' ? event.geoLocation.longitude : null,
    // API request fields
    method: event.type === 'api_request' ? event.method : null,
    path: event.type === 'api_request' ? event.path : null,
    statusCode: event.type === 'api_request' ? event.statusCode : null,
    responseTimeMs: event.type === 'api_request' ? event.responseTimeMs : null,
    requestSize: event.type === 'api_request' ? event.requestSize : null,
    responseSize: event.type === 'api_request' ? event.responseSize : null,
    // Email fields
    recipientEmail: event.type === 'email_send' ? event.recipientEmail : null,
    templateId: event.type === 'email_send' ? event.templateId : null,
    messageId: event.type === 'email_send' ? event.messageId : null,
    bounceType: event.type === 'email_send' ? event.bounceType : null,
  };

  await clickhouse.insert({
    table: 'events',
    values: [values],
    format: 'JSONEachRow',
  });
}

// Create and run consumers for each topic
async function runConsumers() {
  const topics = Object.values(TOPICS);

  for (const topic of topics) {
    const consumer = kafka.consumer({ groupId: `${CONSUMER_GROUP}-${topic}` });
    consumers.push(consumer);

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    await consumer.run({
      eachMessage: processMessage,
    });

    logger.info(`Started consumer for topic: ${topic}`);
  }
}

// Start processing
async function main() {
  try {
    // Initialize Meilisearch index
    eventsIndex = await getOrCreateIndex('events');

    // Configure index settings
    await eventsIndex.updateSettings({
      searchableAttributes: [
        'userId',
        'sourceIp',
        'recipientEmail',
        'path',
        'geoLocation.country',
        'geoLocation.city',
      ],
      filterableAttributes: [
        'type',
        'timestamp',
        'success',
        'action',
        'method',
        'statusCode',
        'bounceType',
        'geoLocation.country',
      ],
      sortableAttributes: ['timestamp', 'responseTimeMs'],
    });

    // Start consumers
    await runConsumers();
    logger.info('Stream worker started successfully');

    // Log metrics periodically
    setInterval(() => {
      logger.info({
        msg: 'Processing metrics',
        processedEvents: metrics.processedEvents,
        failedEvents: metrics.failedEvents,
        lastProcessedTimestamp: new Date(metrics.lastProcessedTimestamp).toISOString(),
      });
    }, 60000);
  } catch (err) {
    logger.error('Failed to start stream worker:', err);
    await shutdown();
  }
}

main().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
