import { supabase } from './supabase';
import { AI_FEEDBACK_SCHEMA_VERSION } from './aiFeedbackScale';

export async function submitAiFeedback(
  personaId: string, episodeId: string, score: 1 | 2 | 3 | 4 | 5 | null,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');
  const response = await fetch('/api/ai/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ personaId, episodeId, score, schemaVersion: AI_FEEDBACK_SCHEMA_VERSION }),
  });
  if (!response.ok) throw new Error('AI_FEEDBACK_SAVE_FAILED');
}
