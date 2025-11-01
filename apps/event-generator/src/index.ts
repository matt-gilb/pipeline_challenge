import { Kafka, Producer } from 'kafkajs';
import { EventGenerator } from './generator';
import winston from 'winston';

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// Configure Kafka client
const kafka = new Kafka({
  clientId: 'event-generator',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

// Initialize producer and generator
const producer = kafka.producer();
const generator = new EventGenerator();

// Configure topics - create them if they don't exist
const TOPICS = {
  ACCOUNT_ACTIVITY: 'account-activity',
  API_REQUESTS: 'api-requests',
  EMAIL_EVENTS: 'email-events',
};

// Handle graceful shutdown
let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Shutting down event generator...');
  try {
    await producer.disconnect();
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Create Kafka topics if they don't exist
async function createTopics() {
  const admin = kafka.admin();
  try {
    await admin.connect();
    logger.info('Creating Kafka topics if they do not exist...');

    await admin.createTopics({
      topics: [
        { topic: TOPICS.ACCOUNT_ACTIVITY, numPartitions: 1, replicationFactor: 1 },
        { topic: TOPICS.API_REQUESTS, numPartitions: 1, replicationFactor: 1 },
        { topic: TOPICS.EMAIL_EVENTS, numPartitions: 1, replicationFactor: 1 },
      ],
    });

    logger.info('Kafka topics created or already exist');
  } catch (err: any) {
    // Ignore error if topics already exist
    if (err.type === 'TOPIC_ALREADY_EXISTS') {
      logger.info('Topics already exist');
    } else {
      logger.error('Error creating topics:', err);
      throw err;
    }
  } finally {
    await admin.disconnect();
  }
}

// Generate and send events continuously
async function generateAndSendEvents() {
  try {
    // Create topics first
    await createTopics();

    await producer.connect();
    logger.info('Connected to Kafka');

    // Toggle attack mode every 5 minutes
    setInterval(
      () => {
        const attackMode = Math.random() > 0.8; // 20% chance of attack mode
        generator.setAttackMode(attackMode);
        if (attackMode) {
          logger.info('Entering attack mode - expect increased suspicious activity');
        }
      },
      5 * 60 * 1000
    );

    // Generate events continuously
    while (!isShuttingDown) {
      const event = generator.generateEvent();
      const topic = getTopicForEventType(event.type);

      await producer.send({
        topic,
        messages: [
          {
            key: event.userId,
            value: JSON.stringify(event),
            timestamp: new Date().getTime().toString(),
          },
        ],
      });

      // Log event generation
      logger.debug('Generated event:', { type: event.type, topic });

      // Add random delay between events (1-100ms)
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    }
  } catch (err) {
    logger.error('Error in event generation:', err);
    await shutdown();
  }
}

// Map event types to topics
function getTopicForEventType(type: string): string {
  switch (type) {
    case 'account_activity':
      return TOPICS.ACCOUNT_ACTIVITY;
    case 'api_request':
      return TOPICS.API_REQUESTS;
    case 'email_send':
      return TOPICS.EMAIL_EVENTS;
    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}

// Start generating events
generateAndSendEvents().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
