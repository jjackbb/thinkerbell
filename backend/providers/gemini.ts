import { AiError, type AiProvider, type AiRequest, type AiResult, type AiUsage, type StructuredSpec } from './contracts.js';

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const MODEL = GEMINI_MODEL;
const CAPS = { chat: { input: 20000, output: 1024 }, story: { input: 6000, output: 2048 }, comment: { input: 2000, output: 512 } };
const encoder = new TextEncoder();
type Obj = Record<string, unknown>;
function object(v: unknown): Obj {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new AiError('INVALID_RESPONSE');
  return v as Obj;
}
function json(text: string): unknown {
  try { return JSON.parse(text); } catch { throw new AiError('INVALID_RESPONSE'); }
}
function usage(v: unknown): AiUsage {
  if (v === undefined) return {};
  const source = object(v); const out: AiUsage = {};
  const pairs = [['promptTokenCount','inputTokens'],['candidatesTokenCount','outputTokens'],
    ['thoughtsTokenCount','thinkingTokens'],['totalTokenCount','totalTokens']] as const;
  for (const [key, target] of pairs) {
    const value = source[key];
    if (value !== undefined) {
      if (!Number.isSafeInteger(value) || (value as number) < 0) throw new AiError('INVALID_RESPONSE');
      out[target] = value as number;
    }
  }
  return out;
}
function blockedRatings(v: unknown): boolean {
  if (v === undefined) return false;
  if (!Array.isArray(v)) throw new AiError('INVALID_RESPONSE');
  return v.some(r => {
    const rating = object(r);
    if (rating.blocked !== undefined && typeof rating.blocked !== 'boolean') throw new AiError('INVALID_RESPONSE');
    return rating.blocked === true;
  });
}
/** Decode only candidate zero, visible text and explicit STOP. Unknown finish reasons fail closed. */
function event(value: unknown): { text: string; stop: boolean; usage: AiUsage } {
  const v = object(value);
  if (v.error !== undefined) throw new AiError('UPSTREAM');
  if (v.promptFeedback !== undefined) {
    const feedback = object(v.promptFeedback);
    if (feedback.blockReason !== undefined && feedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED') throw new AiError('BLOCKED');
    if (blockedRatings(feedback.safetyRatings)) throw new AiError('BLOCKED');
  }
  const mappedUsage = usage(v.usageMetadata);
  // Gemini can deliver usage-only events after a terminal candidate.
  if (v.candidates === undefined || (Array.isArray(v.candidates) && v.candidates.length === 0)) {
    if (v.usageMetadata !== undefined) return { text: '', stop: false, usage: mappedUsage };
    throw new AiError('INVALID_RESPONSE');
  }
  if (!Array.isArray(v.candidates) || v.candidates.length !== 1) throw new AiError('INVALID_RESPONSE');
  const c = object(v.candidates[0]);
  if (c.index !== undefined && c.index !== 0) throw new AiError('INVALID_RESPONSE');
  if (blockedRatings(c.safetyRatings)) throw new AiError('BLOCKED');
  if (c.finishReason === 'MAX_TOKENS') throw new AiError('TRUNCATED');
  if (c.finishReason !== undefined && c.finishReason !== 'STOP') throw new AiError('BLOCKED');
  let text = '';
  if (c.content !== undefined) {
    const content = object(c.content);
    if (content.role !== undefined && content.role !== 'model') throw new AiError('INVALID_RESPONSE');
    if (!Array.isArray(content.parts)) throw new AiError('INVALID_RESPONSE');
    for (const raw of content.parts) {
      const part = object(raw);
      if (part.thought !== undefined && typeof part.thought !== 'boolean') throw new AiError('INVALID_RESPONSE');
      if (part.thought === true) continue;
      if (typeof part.text !== 'string') throw new AiError('INVALID_RESPONSE');
      // Never execute or silently accept returned tool/media parts.
      if (Object.keys(part).some(key => !['text','thought','thoughtSignature'].includes(key))) throw new AiError('INVALID_RESPONSE');
      text += part.text;
    }
  }
  return { text, stop: c.finishReason === 'STOP', usage: mappedUsage };
}

export type GeminiDraftOptions = {
  /** Must be explicitly injected. There is deliberately no global fetch or env-key default. */
  fetch: typeof fetch;
  apiKey: string;
  enabled?: boolean;
  model?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxFrameBytes?: number;
  /** Called immediately before transport; failure prevents dispatch. */
  beforeDispatch?: () => Promise<void>;
  /** Raw accounting metadata; never contains request or response text. */
  onUsage?: (usage: unknown) => void;
};
function limit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > fallback) throw new AiError('INPUT_INVALID');
  return value;
}
export function createGeminiDraft(options: GeminiDraftOptions): AiProvider {
  const timeoutMs = limit(options.timeoutMs, 45_000);
  const maxBytes = limit(options.maxResponseBytes, 1_048_576);
  const maxFrame = limit(options.maxFrameBytes, 65_536);
  const model = options.model ?? MODEL;
  async function run<T>(request: AiRequest, onText?: (s: string) => void, spec?: StructuredSpec<T>): Promise<AiResult & { value?: T }> {
    if (!options.enabled || !options.apiKey || model !== MODEL || typeof options.fetch !== 'function') throw new AiError('UNAVAILABLE');
    if (!Object.hasOwn(CAPS, request.task) || typeof request.system !== 'string' || !request.system.trim() ||
        !Array.isArray(request.messages) || !request.messages.length || request.messages.length > 9) throw new AiError('INPUT_INVALID');
    const cap = CAPS[request.task];
    let bytes = encoder.encode(request.system).length + 64;
    if (spec) bytes += encoder.encode(JSON.stringify(spec.jsonSchema)).length;
    for (let i = 0; i < request.messages.length; i++) {
      const message = request.messages[i];
      if (!message || message.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
          typeof message.text !== 'string' || !message.text.trim()) throw new AiError('INPUT_INVALID');
      bytes += encoder.encode(message.text).length + 32;
    }
    const latest = request.messages.at(-1)!;
    if (latest.role !== 'user') throw new AiError('INPUT_INVALID');
    if ((request.task === 'chat' && latest.text.length > 4000) ||
        (request.task !== 'chat' && request.messages.length !== 1)) throw new AiError('INPUT_LIMIT');
    // Conservative UTF-8 byte estimate + framing reserve; not a provider-token guarantee.
    // Drop oldest complete exchanges in the domain layer before calling this adapter.
    if (bytes > cap.input) throw new AiError('INPUT_LIMIT');
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    request.signal?.addEventListener('abort', cancel, { once: true });
    if (request.signal?.aborted) controller.abort();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const cancelled = () => new AiError(timedOut ? 'TIMEOUT' : 'CANCELLED');
    function guard<P>(promise: Promise<P>): Promise<P> {
      return new Promise((resolve, reject) => {
        const abort = () => { cleanup(); reject(cancelled()); };
        const cleanup = () => controller.signal.removeEventListener('abort', abort);
        controller.signal.addEventListener('abort', abort, { once: true });
        promise.then(v => { cleanup(); controller.signal.aborted ? reject(cancelled()) : resolve(v); }, e => { cleanup(); reject(e); });
        if (controller.signal.aborted) abort();
      });
    }
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      if (controller.signal.aborted) throw cancelled();
      const body = {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: request.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
        generationConfig: { candidateCount: 1, maxOutputTokens: cap.output, responseModalities: ['TEXT'],
          thinkingConfig: { thinkingLevel: 'MINIMAL' },
          ...(spec ? { responseMimeType: 'application/json', responseJsonSchema: spec.jsonSchema } : {}) },
        safetySettings: ['HATE_SPEECH','SEXUALLY_EXPLICIT','DANGEROUS_CONTENT','HARASSMENT'].map(category =>
          ({ category: `HARM_CATEGORY_${category}`, threshold: 'BLOCK_LOW_AND_ABOVE' })),
        store: false,
      };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${onText ? 'streamGenerateContent?alt=sse' : 'generateContent'}`;
      if (options.beforeDispatch) await options.beforeDispatch();
      if (controller.signal.aborted) throw cancelled();
      const response = await guard(options.fetch(url, { method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey },
        body: JSON.stringify(body), signal: controller.signal })).catch(() => {
        if (controller.signal.aborted) throw cancelled();
        throw new AiError('UPSTREAM');
      });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new AiError(response.status === 401 || response.status === 403 ? 'AUTH' :
          response.status === 429 ? 'RATE_LIMIT' : 'UPSTREAM', response.status);
      }
      if (!response.body) throw new AiError('INCOMPLETE');
      const contentType = response.headers.get('content-type')?.split(';')[0].trim();
      if (contentType !== (onText ? 'text/event-stream' : 'application/json')) throw new AiError('INVALID_RESPONSE');
      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let total = 0, buffer = '', answer = '', stopped = false;
      let used: AiUsage = {};
      const accept = (payload: string) => {
        if (controller.signal.aborted) throw cancelled();
        const parsed = json(payload);
        if (parsed && typeof parsed === 'object' && 'usageMetadata' in parsed) options.onUsage?.((parsed as Obj).usageMetadata);
        const decoded = event(parsed);
        if (stopped && (decoded.text || decoded.stop)) throw new AiError('INVALID_RESPONSE');
        if (answer.length + decoded.text.length > 20_000) throw new AiError('OUTPUT_LIMIT');
        answer += decoded.text; used = { ...used, ...decoded.usage };
        if (used.inputTokens !== undefined && used.inputTokens > cap.input) throw new AiError('INPUT_LIMIT');
        if ((used.outputTokens ?? 0) + (used.thinkingTokens ?? 0) > cap.output) throw new AiError('OUTPUT_LIMIT');
        if (controller.signal.aborted) throw cancelled();
        if (decoded.text) onText?.(decoded.text);
        if (decoded.stop) stopped = true;
      };
      let line = '', data: string[] = [], frameBytes = 0, pendingCR = false;
      const dispatch = () => {
        if (data.length) accept(data.join('\n'));
        data = []; frameBytes = 0;
      };
      const endLine = () => {
        if (!line) dispatch();
        else if (!line.startsWith(':')) {
          const colon = line.indexOf(':');
          const field = colon < 0 ? line : line.slice(0, colon);
          let value = colon < 0 ? '' : line.slice(colon + 1);
          if (value.startsWith(' ')) value = value.slice(1);
          if (field === 'data') data.push(value);
        }
        line = '';
      };
      const consume = (chunk: string) => {
        for (const ch of chunk) {
          if (pendingCR) { pendingCR = false; if (ch === '\n') continue; }
          frameBytes += encoder.encode(ch).length;
          if (frameBytes > maxFrame) throw new AiError('OUTPUT_LIMIT');
          if (ch === '\r') { endLine(); pendingCR = true; }
          else if (ch === '\n') endLine();
          else line += ch;
        }
      };
      while (true) {
        const result = await guard(reader.read());
        if (result.done) break;
        total += result.value.byteLength;
        if (total > maxBytes) throw new AiError('OUTPUT_LIMIT');
        const text = decoder.decode(result.value, { stream: true });
        if (onText) consume(text); else buffer += text;
      }
      const tail = decoder.decode();
      if (onText) {
        consume(tail);
        // A non-terminated data frame is truncated, even if it contained STOP.
        if (line || data.length) throw new AiError('INCOMPLETE');
      } else { buffer += tail; accept(buffer); }
      if (!stopped || !answer.trim()) throw new AiError('INCOMPLETE');
      if (controller.signal.aborted) throw cancelled();
      const result: AiResult & { value?: T } = { text: answer, usage: used, finish: 'stop', provider: 'gemini', model };
      if (spec) {
        try { result.value = spec.validate(JSON.parse(answer)); }
        catch { throw new AiError('SCHEMA_INVALID'); }
      }
      return result;
    } catch (error) {
      if (controller.signal.aborted) throw cancelled();
      if (error instanceof AiError) throw error;
      // Do not retain/log upstream bodies, request text, keys, URLs or exception causes.
      throw new AiError('INVALID_RESPONSE');
    } finally {
      clearTimeout(timer); request.signal?.removeEventListener('abort', cancel);
      controller.abort();
      if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
  }
  return {
    generateText: request => run(request),
    generateStructured: async <T>(request: AiRequest, spec: StructuredSpec<T>) => {
      const result = await run(request, undefined, spec);
      return { ...result, value: result.value as T };
    },
    streamText: (request, onText) => run(request, onText),
  };
}

