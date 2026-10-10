import { supabase } from './supabase';
import type { Story, Comment } from '../types';
// Requires the matching operating public-content-boundary migration before client deployment. No raw-row fallback.
export async function fetchVisibleStories(storyId: string | null = null) {
  const result = await supabase.rpc('read_visible_stories', { p_story_id: storyId });
  return { data: result.error ? null : result.data as Story[], error: result.error };
}
export async function fetchVisibleStory(storyId: string) {
  const result = await fetchVisibleStories(storyId);
  return { data: result.data?.find(story => story.id === storyId) ?? null, error: result.error };
}
export async function fetchVisibleComments(storyId: string | null = null) {
  const result = await supabase.rpc('read_visible_comments', { p_story_id: storyId });
  return { data: result.error ? null : (result.data as Comment[]).filter(comment => !comment.isBlind), error: result.error };
}
