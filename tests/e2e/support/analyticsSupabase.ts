import { supabase as base, enableAppFixture, setFixtureAccount, switchAppAccount } from './supabase';
// Synthetic accounts/tokens only. No real Supabase client or project is used.
enableAppFixture();
setFixtureAccount(localStorage.getItem('fixture_auth_account') || 'guest');
let release!: () => void;
const ready = localStorage.getItem('fixture_auth_delay') === 'true' ? new Promise<void>(resolve => { release = resolve; }) : Promise.resolve();
const originalGetSession = base.auth.getSession;
(window as any).__analyticsAuth = {
  release: () => release?.(),
  switch: (account: string) => { localStorage.setItem('fixture_auth_account', account); switchAppAccount(account); },
};
export const supabase = {
  ...base,
  auth: { ...base.auth, getSession: async () => { await ready; return originalGetSession(); } },
};
