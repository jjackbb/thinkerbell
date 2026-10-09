type FunctionalStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Only the successful new-account creation handler calls this gate.
 * Login/session restoration never consumes a pending introduction. */
export function createSignupLandingGate(storage: () => FunctionalStorage = () => localStorage) {
  const shown = new Set<string>();
  return (createdUserId: unknown, activeUserId: string | null): boolean => {
    if (typeof createdUserId !== 'string' || !createdUserId.trim() ||
        (activeUserId !== null && activeUserId !== createdUserId) || shown.has(createdUserId)) return false;
    const key = `nipyeon_signup_landing_seen:${createdUserId}`;
    try {
      if (storage().getItem(key) === '1') return false;
      // Record before navigation. Refresh, retry and relogin cannot redisplay it.
      storage().setItem(key, '1');
    } catch { /* Creation is one-use on the server; memory protects this mount. */ }
    shown.add(createdUserId);
    return true;
  };
}

/** Failed/ambiguous creation and existing-account responses never enter onboarding. */
export function createdSignupUser(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const value = result as Record<string, unknown>;
  return value.created === true && typeof value.userId === 'string' && value.userId.trim()
    ? value.userId : null;
}

/** Automatic login is separate from creation; even a login failure does not undo signup. */
export async function finishCreatedSignup(
  userId: string,
  login: () => Promise<boolean>,
  onCreated: (userId: string) => void,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  if (!isCurrent()) return false;
  let loggedIn = false;
  try { loggedIn = await login(); } catch { /* The account was already created. */ }
  if (isCurrent()) onCreated(userId);
  return loggedIn;
}

function fixedSource(source: unknown): string {
  return source === 'qa' || source === 'community' || source === 'sns' ? `&source=${source}` : '';
}
export function signupLandingHref(source: unknown): string {
  const suffix = fixedSource(source);
  return `/landing${suffix ? '?' + suffix.slice(1) : ''}`;
}
export function landingCtaHref(action: 'write' | 'browse', source: unknown): string {
  return (action === 'write' ? '/?action=write' : '/?browse=1') + fixedSource(source);
}
