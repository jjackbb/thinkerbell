import { setAnalyticsAccountState, type AnalyticsAccountState } from './analyticsAccountState';

type Session = { access_token: string; user: { id: string } } | null;
type Auth = {
  getSession: () => Promise<{ data: { session: Session }; error?: unknown }>;
  onAuthStateChange: (callback: (event: string, session: Session) => void) => {
    data: { subscription: { unsubscribe: () => void } };
  };
};

/** Both landing and app run this before their first GA4 setup/page-view attempt.
 * Events while identity is unresolved are dropped, never queued or replayed. */
export function installAnalyticsAccountGuard(auth: Auth, options: {
  request?: typeof fetch;
  publish?: (state: AnalyticsAccountState) => void;
} = {}): () => void {
  const request = options.request ?? fetch;
  const publish = options.publish ?? setAnalyticsAccountState;
  let revision = 0;
  let disposed = false;
  let pending: AbortController | null = null;
  const invalidate = () => {
    revision += 1;
    pending?.abort();
    pending = null;
    publish('pending');
    return revision;
  };
  const resolve = async (session: Session, version: number) => {
    if (disposed || revision !== version) return;
    if (!session) { publish('allowed'); return; }
    if (!session.access_token || !session.user?.id) { publish('blocked'); return; }
    const controller = new AbortController();
    pending = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await request('/api/analytics/eligibility', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store', signal: controller.signal,
      });
      const result = response.ok ? await response.json() : null;
      if (!disposed && revision === version) publish(result?.eligible === true ? 'allowed' : 'blocked');
    } catch {
      if (!disposed && revision === version) publish('blocked');
    } finally {
      clearTimeout(timeout);
      if (pending === controller) pending = null;
    }
  };
  // Subscribe first. An auth event invalidates even an unfinished initial read.
  const initialVersion = invalidate();
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    // Supabase also emits INITIAL_SESSION(null) when restoration throws.
    // Only the explicit getSession result can establish an anonymous startup.
    // Do not let this notification invalidate its error/success result.
    if (event === 'INITIAL_SESSION') return;
    const version = invalidate();
    // Do not await another Supabase call inside its synchronous auth callback.
    void Promise.resolve().then(() => resolve(session, version));
  });
  void auth.getSession().then(({ data, error }) => {
    if (disposed || revision !== initialVersion) return;
    if (error) { publish('blocked'); return; }
    void resolve(data.session, initialVersion);
  }).catch(() => {
    if (!disposed && revision === initialVersion) publish('blocked');
  });
  return () => {
    disposed = true;
    invalidate();
    subscription.unsubscribe();
  };
}
