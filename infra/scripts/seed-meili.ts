#!/usr/bin/env node

import { MeiliSearch, Index } from 'meilisearch';

const MEILISEARCH_URL = process.env.MEILISEARCH_URL || 'http://localhost:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_KEY || 'pipeline_secure_master_key_2024';

// Index configurations
const INDEXES = {
  EVENTS: {
    name: 'events',
    primaryKey: 'id',
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
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
    },
  },
};

async function setupIndex(client: MeiliSearch, config: typeof INDEXES.EVENTS): Promise<Index> {
  console.log(`Setting up index: ${config.name}`);

  try {
    // Try to get existing index first
    let index: Index;
    try {
      index = await client.getIndex(config.name);
      console.log(`Index ${config.name} already exists`);
    } catch {
      // Index doesn't exist, create it
      const createTask = await client.createIndex(config.name, {
        primaryKey: config.primaryKey,
      });

      // Wait for index creation to complete
      await client.waitForTask(createTask.taskUid);
      index = await client.getIndex(config.name);
      console.log(`Created index ${config.name}`);
    }

    // Update settings
    const settingsTask = await index.updateSettings({
      searchableAttributes: config.searchableAttributes,
      filterableAttributes: config.filterableAttributes,
      sortableAttributes: config.sortableAttributes,
      typoTolerance: config.typoTolerance,
    });

    // Wait for settings update to complete
    await client.waitForTask(settingsTask.taskUid);

    console.log(`✅ Index ${config.name} configured successfully`);
    return index;
  } catch (error) {
    console.error(`❌ Failed to setup index ${config.name}:`, error);
    throw error;
  }
}

async function main() {
  console.log('Initializing Meilisearch indexes...');

  const client = new MeiliSearch({
    host: MEILISEARCH_URL,
    apiKey: MEILISEARCH_KEY,
  });

  try {
    // Test connection
    await client.health();
    console.log('✅ Connected to Meilisearch');

    // Setup indexes
    await setupIndex(client, INDEXES.EVENTS);

    console.log('✅ All indexes configured successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Meilisearch:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
