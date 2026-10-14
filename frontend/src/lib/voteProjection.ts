import type { Story } from '../types';

export type VoteRow = { storyId: string; option: 'A' | 'B'; changeCount: number };
export type VoteProjection = { accountId: string | null; epoch: number; rows: VoteRow[] };
export type VoteReadTicket = { accountId: string | null; epoch: number; request: number };
export const emptyVoteProjection = (): VoteProjection => ({ accountId: null, epoch: -1, rows: [] });

export function isCurrentVoteRead(ticket: VoteReadTicket, accountId: string | null, epoch: number, request: number) {
  return ticket.accountId !== null && ticket.accountId === accountId && ticket.epoch === epoch && ticket.request === request;
}

/** Public story refreshes must never own or erase an account's private vote projection. */
export function projectStoryVote(story: Story, projection: VoteProjection, accountId: string | null, epoch: number): Story {
  const row = accountId && projection.accountId === accountId && projection.epoch === epoch
    ? projection.rows.find(vote => vote.storyId === story.id) : undefined;
  const userVoted = row?.option;
  const voteChanged = Boolean(row && row.changeCount >= 1);
  if (story.userVoted === userVoted && story.voteChanged === voteChanged) return story;
  return { ...story, userVoted, voteChanged };
}

export function confirmStoryVote(projection: VoteProjection, accountId: string, epoch: number, row: VoteRow): VoteProjection {
  const previous = projection.accountId === accountId && projection.epoch === epoch ? projection.rows : [];
  return { accountId, epoch, rows: [...previous.filter(vote => vote.storyId !== row.storyId), row] };
}

/** A stale request may release only its own busy marker, including after same-account reauth. */
export function releaseVoteRequest(pending: Map<string, symbol>, storyId: string, request: symbol) {
  if (pending.get(storyId) === request) pending.delete(storyId);
}

/** Token refresh / repeated SIGNED_IN is not a different owner; logout and A→B→A are. */
export function advanceVoteAccount(current: { accountId: string | null; epoch: number }, accountId: string | null) {
  return current.accountId === accountId ? current : { accountId, epoch: current.epoch + 1 };
}
