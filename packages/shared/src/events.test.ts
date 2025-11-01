import {
  AccountActivitySchema,
  ApiRequestSchema,
  EmailEventSchema,
  EventSchema,
  type Event,
} from './events';

describe('Event Schemas', () => {
  describe('AccountActivitySchema', () => {
    it('validates a valid account activity event', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00Z',
        sourceIp: '192.168.1.1',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'account_activity',
        action: 'login',
        success: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        geoLocation: {
          country: 'US',
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194,
        },
      } as const;

      const result = AccountActivitySchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('fails with invalid geo coordinates', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00Z',
        sourceIp: '192.168.1.1',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'account_activity',
        action: 'login',
        success: true,
        userAgent: 'Mozilla/5.0',
        geoLocation: {
          country: 'US',
          city: 'San Francisco',
          latitude: 200, // Invalid latitude
          longitude: -122.4194,
        },
      } as const;

      const result = AccountActivitySchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('ApiRequestSchema', () => {
    it('validates a valid API request event', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00Z',
        sourceIp: '192.168.1.1',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'api_request',
        method: 'POST',
        path: '/api/v1/users',
        statusCode: 200,
        responseTimeMs: 150,
        requestSize: 1024,
        responseSize: 2048,
        userAgent: 'curl/7.64.1',
      } as const;

      const result = ApiRequestSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('fails with invalid status code', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00Z',
        sourceIp: '192.168.1.1',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'api_request',
        method: 'POST',
        path: '/api/v1/users',
        statusCode: 600, // Invalid status code
        responseTimeMs: 150,
        requestSize: 1024,
        responseSize: 2048,
        userAgent: 'curl/7.64.1',
      } as const;

      const result = ApiRequestSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('EmailEventSchema', () => {
    it('validates a valid email event', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00Z',
        sourceIp: '192.168.1.1',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'email_send',
        recipientEmail: 'user@example.com',
        templateId: 'welcome_email',
        success: true,
        messageId: '123e4567-e89b-12d3-a456-426614174002',
        bounceType: 'none',
      } as const;

      const result = EmailEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('fails with invalid email', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00Z',
        sourceIp: '192.168.1.1',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'email_send',
        recipientEmail: 'not-an-email', // Invalid email
        templateId: 'welcome_email',
        success: true,
        messageId: '123e4567-e89b-12d3-a456-426614174002',
        bounceType: 'none',
      } as const;

      const result = EmailEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('EventSchema', () => {
    it('validates all event types', () => {
      const events: Event[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: '2023-10-20T12:00:00Z',
          sourceIp: '192.168.1.1',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          type: 'account_activity',
          action: 'login',
          success: true,
          userAgent: 'Mozilla/5.0',
          geoLocation: {
            country: 'US',
            city: 'San Francisco',
            latitude: 37.7749,
            longitude: -122.4194,
          },
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          timestamp: '2023-10-20T12:00:00Z',
          sourceIp: '192.168.1.1',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          type: 'api_request',
          method: 'GET',
          path: '/api/v1/users',
          statusCode: 200,
          responseTimeMs: 100,
          requestSize: 0,
          responseSize: 1024,
          userAgent: 'curl/7.64.1',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          timestamp: '2023-10-20T12:00:00Z',
          sourceIp: '192.168.1.1',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          type: 'email_send',
          recipientEmail: 'user@example.com',
          templateId: 'welcome_email',
          success: true,
          messageId: '123e4567-e89b-12d3-a456-426614174004',
          bounceType: 'none',
        },
      ];

      events.forEach((event) => {
        const result = EventSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it('fails with mixed event types', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00Z',
        sourceIp: '192.168.1.1',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'account_activity',
        // Email event field mixed with account activity type
        recipientEmail: 'user@example.com',
        action: 'login',
        success: true,
        userAgent: 'Mozilla/5.0',
        geoLocation: {
          country: 'US',
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194,
        },
      } as const;

      const result = EventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });
});
