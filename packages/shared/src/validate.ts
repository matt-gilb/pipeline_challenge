import { Event, EventSchema } from './events';

/**
 * Validates an event object against the Event schema
 * @param input The object to validate
 * @returns A validated Event object
 * @throws {import('zod').ZodError} If validation fails
 */
export function validateEvent(input: unknown): Event {
  return EventSchema.parse(input);
}
