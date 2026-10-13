import type { Comment } from '../types';

export interface CommentThread { id: string; root: Comment | null; replies: Comment[] }
/** Root identifiers are server-owned. Missing roots never promote a reply to an unrelated thread. */
export function groupCommentThreads(comments: Comment[], filter: 'all' | 'A' | 'B', sort: 'latest' | 'likes', currentUserId: string, currentVote: 'A' | 'B' | null): CommentThread[] {
  const visible = comments.filter(c => !c.isBlind);
  const groups = new Map<string, CommentThread>();
  for (const comment of visible) {
    const id = comment.replyRootId || comment.id;
    const group = groups.get(id) ?? { id, root: null, replies: [] };
    if (comment.replyRootId) group.replies.push(comment); else group.root = comment;
    groups.set(id, group);
  }
  return [...groups.values()].filter(group => filter === 'all' || [group.root, ...group.replies].some(c => c && !c.deletedAt && (c.authorId === currentUserId ? currentVote : c.authorVoted) === filter))
    .sort((a, b) => sort === 'likes' ? (b.root?.likeCount ?? 0) - (a.root?.likeCount ?? 0) : Date.parse(b.root?.createdAt ?? b.replies[0]?.createdAt ?? '') - Date.parse(a.root?.createdAt ?? a.replies[0]?.createdAt ?? ''))
    .map(group => ({ ...group, replies: group.replies.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id)) }));
}
export function replyTargetLabel(comment: Comment, comments: Comment[]): string {
  const target = comments.find(c => c.id === comment.replyToId);
  return !target || target.deletedAt || target.isBlind ? '볼 수 없는 댓글' : target.anonymousId;
}
