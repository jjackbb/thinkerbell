/** Fixed UI vocabulary. Never read content, URL parameters or account fields. */
export const ANALYTICS_SCREENS = new Set([
  'feed', 'ai_list', 'ai_chat', 'ai_feedback', 'ai_summary', 'my_page',
  'my_activity', 'account_settings', 'notifications', 'story_detail',
  'story_editor', 'story_edit', 'ai_opening_selection', 'ai_mode_selection', 'ai_settings',
  'login', 'signup', 'email_check', 'email_pending', 'password_recovery',
  'login_prompt', 'quota_notice', 'share_preview',
]);
export function currentAnalyticsScreen(): string | null {
  if (typeof document === 'undefined') return null;
  const surfaces = [...document.querySelectorAll<HTMLElement>('[data-analytics-screen]')]
    .filter(el => el.getClientRects().length > 0);
  // Any mounted sensitive overlay blocks background analytics too.
  if (surfaces.some(el => el.dataset.analyticsScreen === 'excluded')) return null;
  const top = surfaces.sort((a, b) => Number(b.dataset.analyticsLayer ?? 0) - Number(a.dataset.analyticsLayer ?? 0))[0];
  return top && ANALYTICS_SCREENS.has(top.dataset.analyticsScreen ?? '') ? top.dataset.analyticsScreen! : null;
}
export function analyticsSurfaceBlocked(): boolean {
  if (typeof document === 'undefined') return false;
  return [...document.querySelectorAll<HTMLElement>('[data-analytics-screen="excluded"]')]
    .some(el => el.getClientRects().length > 0);
}
