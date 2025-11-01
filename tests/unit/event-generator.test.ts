import { EventGenerator } from '../../apps/event-generator/src/generator';
import { Event, AccountActivityEvent, ApiRequestEvent, EmailEvent } from '@pipeline/shared';

describe('EventGenerator', () => {
  let generator: EventGenerator;

  beforeEach(() => {
    generator = new EventGenerator();
  });

  describe('generateEvent', () => {
    it('should generate a valid event', () => {
      const event = generator.generateEvent();

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.sourceIp).toBeDefined();
      expect(event.userId).toBeDefined();
      expect(event.type).toMatch(/^(account_activity|api_request|email_send)$/);
    });

    it('should generate events with valid UUIDs', () => {
      const event = generator.generateEvent();

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(event.id).toMatch(uuidRegex);
      expect(event.userId).toMatch(uuidRegex);
    });

    it('should generate events with valid timestamps', () => {
      const event = generator.generateEvent();

      const timestamp = new Date(event.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(event.timestamp).toContain('T');
      expect(event.timestamp).toContain('Z');
    });

    it('should generate events with valid IP addresses', () => {
      const event = generator.generateEvent();

      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      expect(event.sourceIp).toMatch(ipv4Regex);
    });

    it('should generate different event types', () => {
      const eventTypes = new Set<string>();

      // Generate 100 events to ensure we get all types
      for (let i = 0; i < 100; i++) {
        const event = generator.generateEvent();
        eventTypes.add(event.type);
      }

      expect(eventTypes.size).toBeGreaterThan(1);
    });
  });

  describe('account_activity events', () => {
    it('should generate valid account activity events', () => {
      let accountEvent: AccountActivityEvent | undefined;

      // Keep generating until we get an account activity event
      for (let i = 0; i < 50; i++) {
        const event = generator.generateEvent();
        if (event.type === 'account_activity') {
          accountEvent = event as AccountActivityEvent;
          break;
        }
      }

      expect(accountEvent).toBeDefined();
      if (!accountEvent) return;

      expect(accountEvent.type).toBe('account_activity');
      expect(accountEvent.action).toMatch(
        /^(login|logout|password_change|two_factor_enabled|two_factor_disabled|account_created|account_deleted)$/
      );
      expect(typeof accountEvent.success).toBe('boolean');
      expect(accountEvent.userAgent).toBeDefined();
      expect(accountEvent.geoLocation).toBeDefined();
      expect(accountEvent.geoLocation.country).toHaveLength(2);
      expect(accountEvent.geoLocation.city).toBeDefined();
      expect(accountEvent.geoLocation.latitude).toBeGreaterThanOrEqual(-90);
      expect(accountEvent.geoLocation.latitude).toBeLessThanOrEqual(90);
      expect(accountEvent.geoLocation.longitude).toBeGreaterThanOrEqual(-180);
      expect(accountEvent.geoLocation.longitude).toBeLessThanOrEqual(180);
    });

    it('should include failure reason when success is false', () => {
      const events: AccountActivityEvent[] = [];

      // Generate many events to find failed ones
      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        if (event.type === 'account_activity' && !event.success) {
          events.push(event as AccountActivityEvent);
        }
      }

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.failureReason).toBeDefined();
        expect(event.failureReason).toBeTruthy();
      });
    });

    it('should not include failure reason when success is true', () => {
      const events: AccountActivityEvent[] = [];

      // Generate many events to find successful ones
      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        if (event.type === 'account_activity' && event.success) {
          events.push(event as AccountActivityEvent);
        }
      }

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.failureReason).toBeUndefined();
      });
    });
  });

  describe('api_request events', () => {
    it('should generate valid API request events', () => {
      let apiEvent: ApiRequestEvent | undefined;

      // Keep generating until we get an API request event
      for (let i = 0; i < 50; i++) {
        const event = generator.generateEvent();
        if (event.type === 'api_request') {
          apiEvent = event as ApiRequestEvent;
          break;
        }
      }

      expect(apiEvent).toBeDefined();
      if (!apiEvent) return;

      expect(apiEvent.type).toBe('api_request');
      expect(apiEvent.method).toMatch(/^(GET|POST|PUT|DELETE|PATCH)$/);
      expect(apiEvent.path).toMatch(/^\/api\//);
      expect(apiEvent.statusCode).toBeGreaterThanOrEqual(100);
      expect(apiEvent.statusCode).toBeLessThanOrEqual(599);
      expect(apiEvent.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(apiEvent.requestSize).toBeGreaterThanOrEqual(0);
      expect(apiEvent.responseSize).toBeGreaterThanOrEqual(0);
      expect(apiEvent.userAgent).toBeDefined();
    });

    it('should generate mostly successful status codes in normal mode', () => {
      const events: ApiRequestEvent[] = [];

      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        if (event.type === 'api_request') {
          events.push(event as ApiRequestEvent);
        }
      }

      const successfulEvents = events.filter((e) => e.statusCode >= 200 && e.statusCode < 300);
      const errorEvents = events.filter((e) => e.statusCode >= 500);

      expect(successfulEvents.length).toBeGreaterThan(errorEvents.length);
    });
  });

  describe('email_send events', () => {
    it('should generate valid email events', () => {
      let emailEvent: EmailEvent | undefined;

      // Keep generating until we get an email event
      for (let i = 0; i < 50; i++) {
        const event = generator.generateEvent();
        if (event.type === 'email_send') {
          emailEvent = event as EmailEvent;
          break;
        }
      }

      expect(emailEvent).toBeDefined();
      if (!emailEvent) return;

      expect(emailEvent.type).toBe('email_send');
      expect(emailEvent.recipientEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(emailEvent.templateId).toBeDefined();
      expect(typeof emailEvent.success).toBe('boolean');
      expect(emailEvent.bounceType).toMatch(/^(hard|soft|none)$/);
    });

    it('should include messageId when email is successful', () => {
      const events: EmailEvent[] = [];

      // Generate many events to find successful ones
      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        if (event.type === 'email_send' && event.success) {
          events.push(event as EmailEvent);
        }
      }

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.messageId).toBeDefined();
        expect(event.bounceType).toBe('none');
      });
    });

    it('should not include messageId when email fails', () => {
      const events: EmailEvent[] = [];

      // Generate many events to find failed ones
      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        if (event.type === 'email_send' && !event.success) {
          events.push(event as EmailEvent);
        }
      }

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.messageId).toBeUndefined();
        expect(event.bounceType).toMatch(/^(hard|soft)$/);
        expect(event.failureReason).toBeDefined();
      });
    });
  });

  describe('attack mode', () => {
    beforeEach(() => {
      generator.setAttackMode(true);
    });

    it('should generate more account activity events in attack mode', () => {
      const eventTypes: Record<string, number> = {
        account_activity: 0,
        api_request: 0,
        email_send: 0,
      };

      for (let i = 0; i < 500; i++) {
        const event = generator.generateEvent();
        eventTypes[event.type]++;
      }

      // In attack mode, account_activity should be the most common
      expect(eventTypes.account_activity).toBeGreaterThan(eventTypes.api_request);
      expect(eventTypes.account_activity).toBeGreaterThan(eventTypes.email_send);
    });

    it('should generate more failures in attack mode', () => {
      const accountEvents: AccountActivityEvent[] = [];
      const apiEvents: ApiRequestEvent[] = [];
      const emailEvents: EmailEvent[] = [];

      for (let i = 0; i < 500; i++) {
        const event = generator.generateEvent();
        if (event.type === 'account_activity') {
          accountEvents.push(event as AccountActivityEvent);
        } else if (event.type === 'api_request') {
          apiEvents.push(event as ApiRequestEvent);
        } else if (event.type === 'email_send') {
          emailEvents.push(event as EmailEvent);
        }
      }

      // Check account activity failures (should be ~70% failure rate in attack mode)
      const failedLogins = accountEvents.filter((e) => !e.success).length;
      const failureRate = failedLogins / accountEvents.length;
      expect(failureRate).toBeGreaterThan(0.5); // At least 50% failures

      // Check API errors (should have more 500/429 errors)
      const apiErrors = apiEvents.filter((e) => e.statusCode >= 400).length;
      const apiErrorRate = apiErrors / apiEvents.length;
      expect(apiErrorRate).toBeGreaterThan(0.3); // At least 30% errors

      // Check email failures
      const failedEmails = emailEvents.filter((e) => !e.success).length;
      const emailFailureRate = failedEmails / emailEvents.length;
      expect(emailFailureRate).toBeGreaterThan(0.3); // At least 30% failures
    });

    it('should use concentrated IP addresses in attack mode', () => {
      const ips = new Set<string>();

      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        ips.add(event.sourceIp);
      }

      // In attack mode, should use fewer unique IPs
      expect(ips.size).toBeLessThan(100);
    });

    it('should generate high response times in attack mode', () => {
      const apiEvents: ApiRequestEvent[] = [];

      for (let i = 0; i < 200; i++) {
        const event = generator.generateEvent();
        if (event.type === 'api_request') {
          apiEvents.push(event as ApiRequestEvent);
        }
      }

      const highLatencyEvents = apiEvents.filter((e) => e.responseTimeMs > 1000);
      expect(highLatencyEvents.length).toBeGreaterThan(0);
    });
  });

  describe('setAttackMode', () => {
    it('should toggle attack mode on', () => {
      generator.setAttackMode(true);

      // Generate events and check for attack patterns
      const events: Event[] = [];
      for (let i = 0; i < 100; i++) {
        events.push(generator.generateEvent());
      }

      const accountEvents = events.filter((e) => e.type === 'account_activity');
      expect(accountEvents.length).toBeGreaterThan(40); // Should be >50% but accounting for randomness
    });

    it('should toggle attack mode off', () => {
      generator.setAttackMode(true);
      generator.setAttackMode(false);

      // Generate events and check for normal patterns
      const eventTypes: Record<string, number> = {
        account_activity: 0,
        api_request: 0,
        email_send: 0,
      };

      for (let i = 0; i < 300; i++) {
        const event = generator.generateEvent();
        eventTypes[event.type]++;
      }

      // In normal mode, distribution should be more even
      const values = Object.values(eventTypes);
      const max = Math.max(...values);
      const min = Math.min(...values);

      // The difference between most and least common shouldn't be too extreme
      expect(max - min).toBeLessThan(150);
    });
  });

  describe('event distribution', () => {
    it('should generate reasonable distribution of events in normal mode', () => {
      const eventTypes: Record<string, number> = {
        account_activity: 0,
        api_request: 0,
        email_send: 0,
      };

      for (let i = 0; i < 300; i++) {
        const event = generator.generateEvent();
        eventTypes[event.type]++;
      }

      // Each type should appear at least a few times
      expect(eventTypes.account_activity).toBeGreaterThan(50);
      expect(eventTypes.api_request).toBeGreaterThan(50);
      expect(eventTypes.email_send).toBeGreaterThan(50);
    });

    it('should generate unique event IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const event = generator.generateEvent();
        ids.add(event.id);
      }

      // All IDs should be unique
      expect(ids.size).toBe(1000);
    });

    it('should use consistent user pool', () => {
      const userIds = new Set<string>();

      for (let i = 0; i < 500; i++) {
        const event = generator.generateEvent();
        userIds.add(event.userId);
      }

      // Should reuse users from a pool (not generate completely unique users each time)
      expect(userIds.size).toBeLessThan(500);
      expect(userIds.size).toBeGreaterThan(50);
    });
  });
});
