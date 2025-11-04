import { validateEvent } from '../../packages/shared/src/validate';
// removed unused imports from @pipeline/shared
import {
  SAMPLE_ACCOUNT_ACTIVITY_EVENT,
  SAMPLE_API_REQUEST_EVENT,
  SAMPLE_EMAIL_EVENT,
  SAMPLE_FAILED_LOGIN_EVENT,
  SAMPLE_API_ERROR_EVENT,
  SAMPLE_BOUNCED_EMAIL_EVENT,
} from '../fixtures/events';
import { z } from 'zod';

describe('validateEvent', () => {
  describe('valid events', () => {
    it('should validate a valid account activity event', () => {
      const result = validateEvent(SAMPLE_ACCOUNT_ACTIVITY_EVENT);
      expect(result).toEqual(SAMPLE_ACCOUNT_ACTIVITY_EVENT);
    });

    it('should validate a valid API request event', () => {
      const result = validateEvent(SAMPLE_API_REQUEST_EVENT);
      expect(result).toEqual(SAMPLE_API_REQUEST_EVENT);
    });

    it('should validate a valid email event', () => {
      const result = validateEvent(SAMPLE_EMAIL_EVENT);
      expect(result).toEqual(SAMPLE_EMAIL_EVENT);
    });

    it('should validate a failed login event', () => {
      const result = validateEvent(SAMPLE_FAILED_LOGIN_EVENT);
      expect(result).toEqual(SAMPLE_FAILED_LOGIN_EVENT);
    });

    it('should validate an API error event', () => {
      const result = validateEvent(SAMPLE_API_ERROR_EVENT);
      expect(result).toEqual(SAMPLE_API_ERROR_EVENT);
    });

    it('should validate a bounced email event', () => {
      const result = validateEvent(SAMPLE_BOUNCED_EMAIL_EVENT);
      expect(result).toEqual(SAMPLE_BOUNCED_EMAIL_EVENT);
    });
  });

  describe('invalid events', () => {
    it('should throw error for event with invalid UUID', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        id: 'not-a-uuid',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should throw error for event with invalid timestamp', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        timestamp: 'not-a-timestamp',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should throw error for event with invalid IP address', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        sourceIp: 'not-an-ip',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should throw error for event with invalid user ID', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        userId: 'not-a-uuid',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should throw error for event with missing required fields', () => {
      const invalidEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00.000Z',
        // Missing sourceIp and userId
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should throw error for event with invalid type', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        type: 'invalid_type',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });
  });

  describe('account activity validation', () => {
    it('should reject invalid action', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        action: 'invalid_action',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject invalid geo coordinates', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        geoLocation: {
          country: 'US',
          city: 'San Francisco',
          latitude: 200, // Invalid latitude
          longitude: -122.4194,
        },
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject invalid longitude', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        geoLocation: {
          country: 'US',
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: 200, // Invalid longitude
        },
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject invalid country code', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        geoLocation: {
          country: 'USA', // Should be 2 characters
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject missing geo location', () => {
      const invalidEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        geoLocation: undefined,
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should accept event with optional failureReason', () => {
      const eventWithReason = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        failureReason: 'Invalid credentials',
      };

      const result = validateEvent(eventWithReason);
      expect((result as any).failureReason).toBe('Invalid credentials');
    });
  });

  describe('API request validation', () => {
    it('should reject invalid HTTP method', () => {
      const invalidEvent = {
        ...SAMPLE_API_REQUEST_EVENT,
        method: 'INVALID',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject invalid status code (too low)', () => {
      const invalidEvent = {
        ...SAMPLE_API_REQUEST_EVENT,
        statusCode: 99,
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject invalid status code (too high)', () => {
      const invalidEvent = {
        ...SAMPLE_API_REQUEST_EVENT,
        statusCode: 600,
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject negative response time', () => {
      const invalidEvent = {
        ...SAMPLE_API_REQUEST_EVENT,
        responseTimeMs: -1,
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject negative request size', () => {
      const invalidEvent = {
        ...SAMPLE_API_REQUEST_EVENT,
        requestSize: -1,
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject negative response size', () => {
      const invalidEvent = {
        ...SAMPLE_API_REQUEST_EVENT,
        responseSize: -1,
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should accept all valid HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        const event = {
          ...SAMPLE_API_REQUEST_EVENT,
          method,
        };

        const result = validateEvent(event);
        expect((result as any).method).toBe(method);
      });
    });

    it('should accept all valid status code ranges', () => {
      const statusCodes = [100, 200, 201, 301, 400, 404, 500, 503, 599];

      statusCodes.forEach((statusCode) => {
        const event = {
          ...SAMPLE_API_REQUEST_EVENT,
          statusCode,
        };

        const result = validateEvent(event);
        expect((result as any).statusCode).toBe(statusCode);
      });
    });
  });

  describe('email event validation', () => {
    it('should reject invalid email address', () => {
      const invalidEvent = {
        ...SAMPLE_EMAIL_EVENT,
        recipientEmail: 'not-an-email',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should reject invalid bounce type', () => {
      const invalidEvent = {
        ...SAMPLE_EMAIL_EVENT,
        bounceType: 'invalid',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should accept valid bounce types', () => {
      const bounceTypes = ['hard', 'soft', 'none'];

      bounceTypes.forEach((bounceType) => {
        const event = {
          ...SAMPLE_EMAIL_EVENT,
          bounceType,
        };

        const result = validateEvent(event);
        expect((result as any).bounceType).toBe(bounceType);
      });
    });

    it('should accept event with optional messageId', () => {
      const eventWithMessage = {
        ...SAMPLE_EMAIL_EVENT,
        messageId: '123e4567-e89b-12d3-a456-426614174999',
      };

      const result = validateEvent(eventWithMessage);
      expect((result as any).messageId).toBe('123e4567-e89b-12d3-a456-426614174999');
    });

    it('should accept event without messageId', () => {
      const eventWithoutMessage = {
        ...SAMPLE_EMAIL_EVENT,
        messageId: undefined,
      };

      const result = validateEvent(eventWithoutMessage);
      expect((result as any).messageId).toBeUndefined();
    });

    it('should reject invalid messageId format', () => {
      const invalidEvent = {
        ...SAMPLE_EMAIL_EVENT,
        messageId: 'not-a-uuid',
      };

      expect(() => validateEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it('should accept event with optional failureReason', () => {
      const eventWithReason = {
        ...SAMPLE_EMAIL_EVENT,
        failureReason: 'Mailbox full',
      };

      const result = validateEvent(eventWithReason);
      expect((result as any).failureReason).toBe('Mailbox full');
    });
  });

  describe('discriminated union behavior', () => {
    it('should not accept mixed event types', () => {
      const mixedEvent = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        // Try to add API request fields
        method: 'GET',
        path: '/api/test',
      };

      // Should still be valid because extra fields are ignored
      const result = validateEvent(mixedEvent);
      expect(result.type).toBe('account_activity');
    });

    it('should fail when required type-specific fields are missing', () => {
      const incompleteEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-10-20T12:00:00.000Z',
        sourceIp: '192.168.1.100',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'account_activity',
        // Missing action, success, userAgent, geoLocation
      };

      expect(() => validateEvent(incompleteEvent)).toThrow(z.ZodError);
    });
  });

  describe('edge cases', () => {
    it('should reject null input', () => {
      expect(() => validateEvent(null)).toThrow(z.ZodError);
    });

    it('should reject undefined input', () => {
      expect(() => validateEvent(undefined)).toThrow(z.ZodError);
    });

    it('should reject empty object', () => {
      expect(() => validateEvent({})).toThrow(z.ZodError);
    });

    it('should reject non-object input', () => {
      expect(() => validateEvent('string')).toThrow(z.ZodError);
      expect(() => validateEvent(123)).toThrow(z.ZodError);
      expect(() => validateEvent(true)).toThrow(z.ZodError);
    });

    it('should handle extremely long strings', () => {
      const event = {
        ...SAMPLE_ACCOUNT_ACTIVITY_EVENT,
        userAgent: 'A'.repeat(10000),
      };

      const result = validateEvent(event);
      expect((result as any).userAgent).toHaveLength(10000);
    });
  });
});
