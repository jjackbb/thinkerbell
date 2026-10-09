import type { ChatMessage } from '../types';

/** Remove only the failed exchange before requesting a fresh AI answer. */
export function messagesBeforeRetry(messages: ChatMessage[], input: string): ChatMessage[] {
  const last = messages.at(-1);
  const previous = messages.at(-2);
  const third = messages.at(-3);
  if (last?.sender === 'system' && previous?.sender === 'ai' &&
      third?.sender === 'user' && third.text === input) return messages.slice(0, -3);
  if (last?.sender === 'ai' && previous?.sender === 'user' &&
      previous.text === input) return messages.slice(0, -2);
  if (last?.sender === 'system' && previous?.sender === 'user' &&
      previous.text === input) return messages.slice(0, -2);
  return messages;
}
