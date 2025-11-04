/**
 * Mock Kafka Producer
 */
export class MockKafkaProducer {
  private messages: Array<{ topic: string; messages: any[] }> = [];
  public connected = false;

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  async send(payload: { topic: string; messages: any[] }) {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }
    this.messages.push(payload);
    return [{ topicName: payload.topic, partition: 0, errorCode: 0 }];
  }

  getMessages() {
    return this.messages;
  }

  getMessagesByTopic(topic: string) {
    return this.messages.filter((m) => m.topic === topic);
  }

  clear() {
    this.messages = [];
  }
}

/**
 * Mock Kafka Consumer
 */
export class MockKafkaConsumer {
  private subscriptions: string[] = [];
  public connected = false;
  private messageHandlers: Map<string, (payload: any) => Promise<void>> = new Map();

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  async subscribe(config: { topic: string; fromBeginning?: boolean }) {
    if (!this.connected) {
      throw new Error('Consumer not connected');
    }
    this.subscriptions.push(config.topic);
  }

  async run(config: { eachMessage: (payload: any) => Promise<void> }) {
    this.messageHandlers.set('default', config.eachMessage);
  }

  async simulateMessage(topic: string, message: any) {
    const handler = this.messageHandlers.get('default');
    if (handler) {
      await handler({
        topic,
        partition: 0,
        message: {
          key: Buffer.from(message.key || ''),
          value: Buffer.from(JSON.stringify(message.value)),
          timestamp: Date.now().toString(),
          offset: '0',
        },
      });
    }
  }

  getSubscriptions() {
    return this.subscriptions;
  }

  clear() {
    this.subscriptions = [];
    this.messageHandlers.clear();
  }
}

/**
 * Mock Kafka Admin
 */
export class MockKafkaAdmin {
  private topics: string[] = [];
  public connected = false;

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  async createTopics(config: { topics: Array<{ topic: string }> }) {
    this.topics.push(...config.topics.map((t) => t.topic));
  }

  async listTopics() {
    return this.topics;
  }

  clear() {
    this.topics = [];
  }
}

/**
 * Mock ClickHouse Client
 */
export class MockClickHouseClient {
  private data: Map<string, any[]> = new Map();
  private insertedRows: Array<{ table: string; values: any[] }> = [];

  async insert(config: { table: string; values: any[]; format: string }) {
    this.insertedRows.push({ table: config.table, values: config.values });

    const existingData = this.data.get(config.table) || [];
    this.data.set(config.table, [...existingData, ...config.values]);
  }

  async query(config: { query: string; format: string }) {
    return {
      json: async () => {
        // Parse the query to determine which table to return data from
        const tableName = this.extractTableName(config.query);
        return this.data.get(tableName) || [];
      },
      text: async () => JSON.stringify(this.data),
    };
  }

  async close() {
    // Mock close
  }

  private extractTableName(query: string): string {
    const match = query.match(/FROM\s+(\w+)/i);
    return match ? match[1] : 'events';
  }

  getInsertedRows(table?: string) {
    if (table) {
      return this.insertedRows.filter((r) => r.table === table);
    }
    return this.insertedRows;
  }

  setMockData(table: string, data: any[]) {
    this.data.set(table, data);
  }

  clear() {
    this.data.clear();
    this.insertedRows = [];
  }
}

/**
 * Mock Meilisearch Index
 */
export class MockMeilisearchIndex {
  private documents: Map<string, any> = new Map();
  public indexName: string;
  private settings: any = {};

  constructor(indexName: string) {
    this.indexName = indexName;
  }

  async addDocuments(documents: any[]) {
    documents.forEach((doc) => {
      this.documents.set(doc.id, doc);
    });
    return { taskUid: 1, indexUid: this.indexName };
  }

  async updateDocuments(documents: any[]) {
    return this.addDocuments(documents);
  }

  async deleteDocument(documentId: string) {
    this.documents.delete(documentId);
    return { taskUid: 2, indexUid: this.indexName };
  }

  async getDocument(documentId: string) {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    return doc;
  }

  async search(
    query: string,
    options?: {
      filter?: string | string[];
      sort?: string[];
      limit?: number;
      offset?: number;
      facets?: string[];
    }
  ) {
    const docs = Array.from(this.documents.values());

    // Simple filtering logic
    let filtered = docs;
    if (query) {
      filtered = docs.filter((doc) =>
        JSON.stringify(doc).toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply limit and offset
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      hits: paginated,
      query,
      processingTimeMs: 1,
      limit,
      offset,
      estimatedTotalHits: filtered.length,
    };
  }

  async updateSettings(settings: any) {
    this.settings = { ...this.settings, ...settings };
    return { taskUid: 3, indexUid: this.indexName };
  }

  async getSettings() {
    return this.settings;
  }

  getDocuments() {
    return Array.from(this.documents.values());
  }

  clear() {
    this.documents.clear();
  }
}

/**
 * Mock Meilisearch Client
 */
export class MockMeilisearchClient {
  private indexes: Map<string, MockMeilisearchIndex> = new Map();

  async getIndex(indexName: string) {
    if (!this.indexes.has(indexName)) {
      throw new Error(`Index ${indexName} not found`);
    }
    return this.indexes.get(indexName)!;
  }

  async createIndex(indexName: string, options?: { primaryKey?: string }) {
    const index = new MockMeilisearchIndex(indexName);
    this.indexes.set(indexName, index);
    return { taskUid: 0, indexUid: indexName };
  }

  async waitForTask(taskUid: number) {
    // Mock task completion
    return { status: 'succeeded', taskUid };
  }

  async getOrCreateIndex(indexName: string): Promise<MockMeilisearchIndex> {
    if (!this.indexes.has(indexName)) {
      await this.createIndex(indexName);
    }
    return this.indexes.get(indexName)!;
  }

  clear() {
    this.indexes.clear();
  }
}

/**
 * Mock Winston Logger
 */
export class MockLogger {
  public logs: Array<{ level: string; message: string; meta?: any }> = [];

  log(level: string, message: string, meta?: any) {
    this.logs.push({ level, message, meta });
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  clear() {
    this.logs = [];
  }

  getLogs(level?: string) {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return this.logs;
  }
}

/**
 * Create mock Kafka instance
 */
export function createMockKafka() {
  const producer = new MockKafkaProducer();
  const consumer = new MockKafkaConsumer();
  const admin = new MockKafkaAdmin();

  return {
    producer: () => producer,
    consumer: () => consumer,
    admin: () => admin,
  };
}

/**
 * Create mock environment for testing
 */
export function createMockEnvironment() {
  return {
    kafka: createMockKafka(),
    clickhouse: new MockClickHouseClient(),
    meilisearch: new MockMeilisearchClient(),
    logger: new MockLogger(),
  };
}

/**
 * Wait for async operations to complete
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await waitFor(interval);
  }
}
