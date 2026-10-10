import type { Story } from '../types';
/** A late response may proceed only if the original account, intent and visible source still exist. */
export function canContinueAiNavigation(args: {
  generation: number; currentGeneration: number;
  account: string | null; currentAccount: string | null;
  storyId: string; stories: Story[]; hiddenStoriesReady: boolean; hiddenStoryIds: string[];
}) {
  if (args.generation !== args.currentGeneration || args.account !== args.currentAccount ||
      !args.hiddenStoriesReady || args.hiddenStoryIds.includes(args.storyId)) return false;
  const story = args.stories.find(item => item.id === args.storyId);
  return Boolean(story && !story.isBlind && !story.isAdult && !story.isHidden &&
    (story.visibility !== 'private' || story.authorId === args.account));
}


export interface AiReturnCurrent {
  generation: number;
  account: string | null;
  stories: Story[];
  hiddenStoriesReady: boolean;
  hiddenStoryIds: string[];
}

/** Re-read access before revealing a retained detail; an old response has no UI authority. */
export async function readAiReturnStory(
  origin: { generation: number; account: string | null; storyId: string },
  getCurrent: () => AiReturnCurrent,
  readStory: (id: string) => Promise<{ data: Story | null; error: unknown }>,
): Promise<{ status: 'ready'; story: Story } | { status: 'stale' } | { status: 'unavailable' }> {
  const currentIntent = () => {
    const current = getCurrent();
    return current.generation === origin.generation && current.account === origin.account;
  };
  const permitted = (current: AiReturnCurrent, stories = current.stories) => canContinueAiNavigation({
    ...origin, currentGeneration: current.generation, currentAccount: current.account,
    stories, hiddenStoriesReady: current.hiddenStoriesReady, hiddenStoryIds: current.hiddenStoryIds,
  });
  if (!currentIntent()) return { status: 'stale' };
  if (!permitted(getCurrent())) return { status: 'unavailable' };
  let result: { data: Story | null; error: unknown };
  try { result = await readStory(origin.storyId); }
  catch { result = { data: null, error: true }; }
  if (!currentIntent()) return { status: 'stale' };
  const current = getCurrent();
  if (!permitted(current) || result.error || !result.data || result.data.id !== origin.storyId ||
      !permitted(current, [result.data])) return { status: 'unavailable' };
  return { status: 'ready', story: result.data };
}
