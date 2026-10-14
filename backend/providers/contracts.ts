/** Backend-only. Authentication, adult eligibility, quotas and writes belong to callers. */
export type AiTask = 'chat' | 'story' | 'comment';
export type AiMessage = { role: 'user' | 'assistant'; text: string };
export type AiRequest = {
  task: AiTask;
  system: string;
  messages: AiMessage[];
  signal?: AbortSignal;
};
export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  totalTokens?: number;
};
export type AiResult = { text: string; usage: AiUsage; finish: 'stop'; provider: string; model: string };
export type StructuredSpec<T> = { jsonSchema: Record<string, unknown>; validate: (value: unknown) => T };
export interface AiProvider {
  generateText(request: AiRequest): Promise<AiResult>;
  generateStructured<T>(request: AiRequest, spec: StructuredSpec<T>): Promise<AiResult & { value: T }>;
  /** onText is provisional. Never save/charge success until this promise resolves. */
  streamText(request: AiRequest, onText: (text: string) => void): Promise<AiResult>;
}
export type AiErrorCode = 'UNAVAILABLE' | 'INPUT_INVALID' | 'INPUT_LIMIT' | 'AUTH' | 'RATE_LIMIT' |
  'UPSTREAM' | 'BLOCKED' | 'TRUNCATED' | 'INVALID_RESPONSE' | 'INCOMPLETE' | 'OUTPUT_LIMIT' |
  'SCHEMA_INVALID' | 'CANCELLED' | 'TIMEOUT';
export class AiError extends Error {
  constructor(public readonly code: AiErrorCode, public readonly status?: number) {
    super(`AI_${code}`); this.name = 'AiError';
  }
}
