import { EventType, EVENT_TYPES, type Event } from '@pipeline/shared';
import { faker } from '@faker-js/faker';

// Configure constants for generation
const USER_COUNT = 1000;
const IP_COUNT = 500;
const EMAIL_TEMPLATES = [
  'welcome',
  'reset_password',
  'verification',
  'newsletter',
  'security_alert',
] as const;
const API_PATHS = [
  '/api/v1/users',
  '/api/v1/posts',
  '/api/v1/comments',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/products',
  '/api/v1/orders',
] as const;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
const ACCOUNT_ACTIONS = [
  'login',
  'logout',
  'password_change',
  'two_factor_enabled',
  'two_factor_disabled',
  'account_created',
  'account_deleted',
] as const;
const COUNTRIES = [
  'US',
  'GB',
  'CA',
  'FR',
  'DE',
  'JP',
  'AU',
  'IN',
  'BR',
  'MX',
  'CU',
  'KZ',
  'KR',
  'NG',
  'SA',
] as const;

// Pre-generate some realistic data
const userIds = Array.from({ length: USER_COUNT }, () => faker.string.uuid());
const userEmails = userIds.map(() => faker.internet.email());
const sourceIps = Array.from({ length: IP_COUNT }, () => faker.internet.ipv4());

export class EventGenerator {
  private attackMode: boolean = false;

  /**
   * Toggle attack simulation mode
   */
  setAttackMode(enabled: boolean): void {
    this.attackMode = enabled;
  }

  /**
   * Generate a random event
   */
  generateEvent(): Event {
    const type = this.pickEventType();
    const baseEvent = this.generateBaseEvent();

    switch (type) {
      case 'account_activity':
        return this.generateAccountActivityEvent(baseEvent);
      case 'api_request':
        return this.generateApiRequestEvent(baseEvent);
      case 'email_send':
        return this.generateEmailEvent(baseEvent);
    }
  }

  private pickEventType(): EventType {
    if (this.attackMode) {
      // During attack, generate more account activity events
      return Math.random() < 0.6
        ? 'account_activity'
        : EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    }
    return EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  }

  private generateBaseEvent() {
    return {
      id: faker.string.uuid(),
      timestamp: new Date().toISOString(),
      sourceIp: this.attackMode
        ? // During attack, use more concentrated IP range
          sourceIps[Math.floor(Math.random() * (IP_COUNT / 10))]
        : sourceIps[Math.floor(Math.random() * IP_COUNT)],
      userId: userIds[Math.floor(Math.random() * USER_COUNT)],
    };
  }

  private generateAccountActivityEvent(base: ReturnType<typeof this.generateBaseEvent>): Event {
    const action = ACCOUNT_ACTIONS[Math.floor(Math.random() * ACCOUNT_ACTIONS.length)];
    const success = this.attackMode ? Math.random() > 0.7 : Math.random() > 0.05;

    return {
      ...base,
      type: 'account_activity',
      action,
      success,
      failureReason: success ? undefined : 'Invalid credentials',
      userAgent: faker.internet.userAgent(),
      geoLocation: {
        country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
        city: faker.location.city(),
        latitude: faker.location.latitude({ min: -90, max: 90 }),
        longitude: faker.location.longitude({ min: -180, max: 180 }),
      },
    };
  }

  private generateApiRequestEvent(base: ReturnType<typeof this.generateBaseEvent>): Event {
    const path = API_PATHS[Math.floor(Math.random() * API_PATHS.length)];
    const method = HTTP_METHODS[Math.floor(Math.random() * HTTP_METHODS.length)];

    // Generate response time with occasional spikes during attack mode
    const responseTimeMs = this.attackMode
      ? Math.random() > 0.8
        ? Math.floor(Math.random() * 10000 + 1000)
        : Math.floor(Math.random() * 200 + 50)
      : Math.floor(Math.random() * 200 + 50);

    // Generate status code with more errors during attack mode
    let statusCode: number;
    if (this.attackMode) {
      const rand = Math.random();
      if (rand < 0.4) statusCode = 500;
      else if (rand < 0.6) statusCode = 429;
      else if (rand < 0.8) statusCode = 200;
      else statusCode = 400;
    } else {
      const rand = Math.random();
      if (rand < 0.95) statusCode = 200;
      else if (rand < 0.98) statusCode = 400;
      else statusCode = 500;
    }

    return {
      ...base,
      type: 'api_request',
      method,
      path,
      statusCode,
      responseTimeMs,
      userAgent: faker.internet.userAgent(),
      requestSize: Math.floor(Math.random() * 10000),
      responseSize: Math.floor(Math.random() * 50000),
    };
  }

  private generateEmailEvent(base: ReturnType<typeof this.generateBaseEvent>): Event {
    const success = this.attackMode ? Math.random() > 0.4 : Math.random() > 0.05;
    const templateId = EMAIL_TEMPLATES[Math.floor(Math.random() * EMAIL_TEMPLATES.length)];
    const bounceType = !success ? (Math.random() > 0.5 ? 'hard' : 'soft') : 'none';
    const messageId = success ? faker.string.uuid() : undefined;

    return {
      ...base,
      type: 'email_send',
      recipientEmail: userEmails[Math.floor(Math.random() * USER_COUNT)],
      templateId,
      success,
      failureReason: success ? undefined : `Bounce: ${bounceType}`,
      messageId,
      bounceType,
    };
  }
}
