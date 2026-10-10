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
