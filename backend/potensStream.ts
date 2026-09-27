/** Read the provider's SSE rather than trusting a connection close as success. */
export async function consumePotensStream(
  body: ReadableStream<Uint8Array>,
  onText: (chunk: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let completed = false;

  const handleLine = (rawLine: string) => {
    const line = rawLine.trimEnd();
    if (!line.startsWith('data: ')) return;
    const payload = line.slice(6);
    if (payload === '[DONE]') {
      completed = true;
      return;
    }
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(payload);
    } catch {
      throw new Error('AI_PROVIDER_STREAM_INVALID');
    }
    if (event.type === 'error') throw new Error('AI_PROVIDER_STREAM_FAILED');
    if (event.type === 'done') {
      completed = true;
      return;
    }
    if (event.type === 'text') {
      if (typeof event.text !== 'string') throw new Error('AI_PROVIDER_STREAM_INVALID');
      answer += event.text;
      if (answer.length > 20000) throw new Error('AI_PROVIDER_STREAM_TOO_LONG');
      if (event.text) onText(event.text);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer);
    if (!completed || !answer.trim()) throw new Error('AI_PROVIDER_STREAM_INCOMPLETE');
    return answer;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
