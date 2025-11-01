import { createClient } from '@clickhouse/client';
import { MeiliSearch, Index } from 'meilisearch';
import { Kafka } from 'kafkajs';

// Configure ClickHouse client
export const clickhouse = createClient({
  host: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
  username: 'web_user',
  password: 'password',
  database: 'pipeline',
});

// Configure Meilisearch client
export const meilisearch = new MeiliSearch({
  host: `http://${process.env.MEILISEARCH_HOST || 'localhost'}:7700`,
  apiKey: process.env.MEILISEARCH_KEY || 'pipeline_secure_master_key_2024',
});

// Configure Kafka client
export const kafka = new Kafka({
  clientId: 'stream-worker',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

// Kafka consumer group
export const CONSUMER_GROUP = 'stream-worker-group';

// Kafka topics
export const TOPICS = {
  ACCOUNT_ACTIVITY: 'account-activity',
  API_REQUESTS: 'api-requests',
  EMAIL_EVENTS: 'email-events',
};

// Meilisearch indexes
export const INDEXES = {
  EVENTS: 'events',
};

// Helper function to get or create an index and configure it
export async function getOrCreateIndex(indexName: string): Promise<Index> {
  try {
    // Try to get the index
    return await meilisearch.getIndex(indexName);
  } catch (error) {
    // If index doesn't exist, create it
    const task = await meilisearch.createIndex(indexName, {
      primaryKey: 'id',
    });
    // Wait for task completion and return the index
    await meilisearch.waitForTask(task.taskUid);
    return await meilisearch.getIndex(indexName);
  }
}

// Initialize Meilisearch index settings
export async function initializeMeilisearch() {
  const index = await getOrCreateIndex(INDEXES.EVENTS);

  // Wait for the index to be ready
  await index.updateSettings({
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

  // Return the configured index
  return index;
}
