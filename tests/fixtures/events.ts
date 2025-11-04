import { Event, AccountActivityEvent, ApiRequestEvent, EmailEvent } from '@pipeline/shared';
import { faker } from '@faker-js/faker';

/**
 * Sample base event data
 */
export const BASE_EVENT = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: '2023-10-20T12:00:00.000Z',
  sourceIp: '192.168.1.100',
  userId: '123e4567-e89b-12d3-a456-426614174001',
};

/**
 * Sample account activity event
 */
export const SAMPLE_ACCOUNT_ACTIVITY_EVENT: AccountActivityEvent = {
  ...BASE_EVENT,
  type: 'account_activity',
  action: 'login',
  success: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  geoLocation: {
    country: 'US',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
  },
};

/**
 * Sample failed login event
 */
export const SAMPLE_FAILED_LOGIN_EVENT: AccountActivityEvent = {
  ...BASE_EVENT,
  id: '123e4567-e89b-12d3-a456-426614174002',
  type: 'account_activity',
  action: 'login',
  success: false,
  failureReason: 'Invalid credentials',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  geoLocation: {
    country: 'GB',
    city: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
  },
};

/**
 * Sample API request event
 */
export const SAMPLE_API_REQUEST_EVENT: ApiRequestEvent = {
  ...BASE_EVENT,
  id: '123e4567-e89b-12d3-a456-426614174003',
  type: 'api_request',
  method: 'POST',
  path: '/api/v1/users',
  statusCode: 200,
  responseTimeMs: 150,
  requestSize: 1024,
  responseSize: 2048,
  userAgent: 'curl/7.64.1',
};

/**
 * Sample API request event with error
 */
export const SAMPLE_API_ERROR_EVENT: ApiRequestEvent = {
  ...BASE_EVENT,
  id: '123e4567-e89b-12d3-a456-426614174004',
  type: 'api_request',
  method: 'GET',
  path: '/api/v1/posts',
  statusCode: 500,
  responseTimeMs: 5000,
  requestSize: 512,
  responseSize: 256,
  userAgent: 'PostmanRuntime/7.29.2',
};

/**
 * Sample email event
 */
export const SAMPLE_EMAIL_EVENT: EmailEvent = {
  ...BASE_EVENT,
  id: '123e4567-e89b-12d3-a456-426614174005',
  type: 'email_send',
  recipientEmail: 'user@example.com',
  templateId: 'welcome',
  success: true,
  messageId: '123e4567-e89b-12d3-a456-426614174006',
  bounceType: 'none',
};

/**
 * Sample bounced email event
 */
export const SAMPLE_BOUNCED_EMAIL_EVENT: EmailEvent = {
  ...BASE_EVENT,
  id: '123e4567-e89b-12d3-a456-426614174007',
  type: 'email_send',
  recipientEmail: 'invalid@example.com',
  templateId: 'reset_password',
  success: false,
  failureReason: 'Bounce: hard',
  bounceType: 'hard',
};

/**
 * Collection of all sample events
 */
export const SAMPLE_EVENTS: Event[] = [
  SAMPLE_ACCOUNT_ACTIVITY_EVENT,
  SAMPLE_FAILED_LOGIN_EVENT,
  SAMPLE_API_REQUEST_EVENT,
  SAMPLE_API_ERROR_EVENT,
  SAMPLE_EMAIL_EVENT,
  SAMPLE_BOUNCED_EMAIL_EVENT,
];

/**
 * Factory function to create a custom account activity event
 */
export function createAccountActivityEvent(
  overrides?: Partial<AccountActivityEvent>
): AccountActivityEvent {
  return {
    ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
    ...overrides,
    id: overrides?.id || faker.string.uuid(),
    timestamp: overrides?.timestamp || new Date().toISOString(),
  };
}

/**
 * Factory function to create a custom API request event
 */
export function createApiRequestEvent(overrides?: Partial<ApiRequestEvent>): ApiRequestEvent {
  return {
    ...SAMPLE_API_REQUEST_EVENT,
    ...overrides,
    id: overrides?.id || faker.string.uuid(),
    timestamp: overrides?.timestamp || new Date().toISOString(),
  };
}

/**
 * Factory function to create a custom email event
 */
export function createEmailEvent(overrides?: Partial<EmailEvent>): EmailEvent {
  return {
    ...SAMPLE_EMAIL_EVENT,
    ...overrides,
    id: overrides?.id || faker.string.uuid(),
    timestamp: overrides?.timestamp || new Date().toISOString(),
  };
}

/**
 * Generate multiple events of a specific type
 */
export function generateMultipleEvents(
  count: number,
  type: 'account_activity' | 'api_request' | 'email_send'
): Event[] {
  const events: Event[] = [];
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(Date.now() - i * 1000).toISOString();
    const id = faker.string.uuid();

    switch (type) {
      case 'account_activity':
        events.push(createAccountActivityEvent({ id, timestamp }));
        break;
      case 'api_request':
        events.push(createApiRequestEvent({ id, timestamp }));
        break;
      case 'email_send':
        events.push(createEmailEvent({ id, timestamp }));
        break;
    }
  }
  return events;
}

/**
 * Generate events with suspicious patterns
 */
export function generateSuspiciousEvents(
  count: number,
  userId: string,
  sourceIp: string
): AccountActivityEvent[] {
  const events: AccountActivityEvent[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < count; i++) {
    events.push(
      createAccountActivityEvent({
        id: faker.string.uuid(),
        timestamp: new Date(baseTime - i * 100).toISOString(), // 100ms apart
        userId,
        sourceIp,
        action: i % 3 === 0 ? 'login' : 'password_change',
        success: i % 4 !== 0, // 25% failure rate
      })
    );
  }

  return events;
}

/**
 * Generate events with different geo locations
 */
export function generateGeoDistributedEvents(
  count: number,
  userId: string
): AccountActivityEvent[] {
  const locations = [
    { country: 'US', city: 'New York', latitude: 40.7128, longitude: -74.006 },
    { country: 'GB', city: 'London', latitude: 51.5074, longitude: -0.1278 },
    { country: 'JP', city: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
    { country: 'DE', city: 'Berlin', latitude: 52.52, longitude: 13.405 },
    { country: 'AU', city: 'Sydney', latitude: -33.8688, longitude: 151.2093 },
  ];

  const events: AccountActivityEvent[] = [];

  for (let i = 0; i < count; i++) {
    const location = locations[i % locations.length];
    events.push(
      createAccountActivityEvent({
        id: faker.string.uuid(),
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        userId,
        geoLocation: location,
      })
    );
  }

  return events;
}
