import { z } from 'zod';

// Common fields shared by all events
export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  sourceIp: z.string().ip(),
  userId: z.string().uuid(),
});

// Geo location schema (used by account activity events)
export const GeoLocationSchema = z.object({
  country: z.string().length(2), // ISO 3166-1 alpha-2
  city: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Account activity event schema
export const AccountActivitySchema = BaseEventSchema.extend({
  type: z.literal('account_activity'),
  action: z.enum([
    'login',
    'logout',
    'password_change',
    'two_factor_enabled',
    'two_factor_disabled',
    'account_created',
    'account_deleted',
  ]),
  success: z.boolean(),
  failureReason: z.string().optional(),
  userAgent: z.string(),
  geoLocation: GeoLocationSchema,
});

// API request event schema
export const ApiRequestSchema = BaseEventSchema.extend({
  type: z.literal('api_request'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string(),
  statusCode: z.number().int().min(100).max(599),
  responseTimeMs: z.number().int().min(0),
  requestSize: z.number().int().min(0),
  responseSize: z.number().int().min(0),
  userAgent: z.string(),
});

// Email event schema
export const EmailEventSchema = BaseEventSchema.extend({
  type: z.literal('email_send'),
  recipientEmail: z.string().email(),
  templateId: z.string(),
  success: z.boolean(),
  failureReason: z.string().optional(),
  messageId: z.string().uuid().optional(),
  bounceType: z.enum(['hard', 'soft', 'none']),
});

// Combined event schema
export const EventSchema = z.discriminatedUnion('type', [
  AccountActivitySchema,
  ApiRequestSchema,
  EmailEventSchema,
]);

// Event types
export type Event = z.infer<typeof EventSchema>;
export type AccountActivityEvent = z.infer<typeof AccountActivitySchema>;
export type ApiRequestEvent = z.infer<typeof ApiRequestSchema>;
export type EmailEvent = z.infer<typeof EmailEventSchema>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type GeoLocation = z.infer<typeof GeoLocationSchema>;

// Event type literals
export type EventType = Event['type'];
export const EVENT_TYPES = ['account_activity', 'api_request', 'email_send'] as const;

// Utility type guards
export const isAccountActivityEvent = (event: Event): event is AccountActivityEvent =>
  event.type === 'account_activity';

export const isApiRequestEvent = (event: Event): event is ApiRequestEvent =>
  event.type === 'api_request';

export const isEmailEvent = (event: Event): event is EmailEvent =>
  event.type === 'email_send';
