import { AiError, type StructuredSpec } from './contracts.js';
export type StoryCheckResult = {
  isAdult: boolean; hasProfanity: boolean; sanitizedTitle: string; sanitizedText: string;
  issueMySide: string; issueYourSide: string;
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AiError('SCHEMA_INVALID');
  return value as Record<string, unknown>;
}
function bounded(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new AiError('SCHEMA_INVALID');
  return value;
}
export const storySpec: StructuredSpec<StoryCheckResult> = {
  jsonSchema: { type: 'object', additionalProperties: false,
    required: ['isAdult','hasProfanity','sanitizedTitle','sanitizedText','issueMySide','issueYourSide'],
    properties: { isAdult: { type: 'boolean' }, hasProfanity: { type: 'boolean' },
      sanitizedTitle: { type: 'string', minLength: 1, maxLength: 30 },
      sanitizedText: { type: 'string', minLength: 20, maxLength: 1000 },
      issueMySide: { type: 'string', minLength: 1, maxLength: 40 },
      issueYourSide: { type: 'string', minLength: 1, maxLength: 40 } } },
  validate(value) {
    const v = record(value);
    if (typeof v.isAdult !== 'boolean' || typeof v.hasProfanity !== 'boolean') throw new AiError('SCHEMA_INVALID');
    // Harmless unknown fields are dropped, never forwarded to a database write.
    return { isAdult: v.isAdult, hasProfanity: v.hasProfanity,
      sanitizedTitle: bounded(v.sanitizedTitle, 1, 30), sanitizedText: bounded(v.sanitizedText, 20, 1000),
      issueMySide: bounded(v.issueMySide, 1, 40), issueYourSide: bounded(v.issueYourSide, 1, 40) };
  },
};
export const commentSpec: StructuredSpec<{ sanitizedText: string }> = {
  jsonSchema: { type: 'object', additionalProperties: false, required: ['sanitizedText'],
    properties: { sanitizedText: { type: 'string', minLength: 1, maxLength: 200 } } },
  validate(value) { return { sanitizedText: bounded(record(value).sanitizedText, 1, 200) }; },
};
/** Explicit domain decision: schema success alone never means publishable. */
export function requirePublishableStory(result: StoryCheckResult): StoryCheckResult {
  if (result.isAdult) throw new AiError('BLOCKED');
  return result;
}
