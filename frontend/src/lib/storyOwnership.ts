import type { SupabaseClient } from '@supabase/supabase-js';

/** UI ownership requires a signed-in profile and two nonempty identifiers. */
export function ownsStory(userId: unknown, authorId: unknown, isGuest = false): boolean {
  return !isGuest && typeof userId === 'string' && userId.trim().length > 0 &&
    typeof authorId === 'string' && authorId.trim().length > 0 && userId === authorId;
}

/** A cached profile alone cannot authorize deletion after an account transition. */
export async function deleteOwnedStory(
  client: Pick<SupabaseClient, 'auth' | 'from'>,
  storyId: string,
  ownerId: string,
  isCurrentAccount: () => boolean,
): Promise<void> {
  if (!storyId || !ownerId || !isCurrentAccount()) throw new Error('AUTH_REQUIRED');
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session?.access_token || session.user.id !== ownerId || !isCurrentAccount()) {
    throw new Error('AUTH_REQUIRED');
  }
  const { data, error } = await client.from('stories').delete()
    .eq('id', storyId).eq('authorId', ownerId).select('id').maybeSingle();
  if (!isCurrentAccount()) throw new Error('ACCOUNT_CHANGED');
  if (error || data?.id !== storyId) throw new Error('DELETE_FAILED');
}
