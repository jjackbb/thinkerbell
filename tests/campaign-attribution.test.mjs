import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignAttribution, readCampaignAttribution, RECRUITMENT_STORAGE_KEY } from '../frontend/src/lib/analyticsContext.ts';
import { landingCtaHref, signupLandingHref } from '../frontend/src/lib/signupLanding.ts';

test('Meta campaign and creative codes are exact allowlists, never arbitrary labels or UTM values', () => {
  assert.deepEqual(campaignAttribution('meta', 'launch_202610', 'a'), { recruitment_source: 'meta', campaign_code: 'launch_202610', creative_code: 'a' });
  assert.deepEqual(campaignAttribution('meta', 'launch_202610', 'b'), { recruitment_source: 'meta', campaign_code: 'launch_202610', creative_code: 'b' });
  for (const input of ['private@example.invalid', 'secret-token', 'A', 'unapproved', null]) {
    assert.deepEqual(campaignAttribution('meta', input, 'a'), { recruitment_source: 'meta' });
    assert.deepEqual(campaignAttribution('meta', 'launch_202610', input), { recruitment_source: 'meta', campaign_code: 'launch_202610' });
  }
  for (const source of ['sns', 'community', 'qa', 'unknown']) {
    const result = campaignAttribution(source, 'launch_202610', 'a');
    assert.equal(result.campaign_code, undefined); assert.equal(result.creative_code, undefined);
  }
});
test('landing/app/signup links preserve only the fixed public attribution codes', () => {
  const raw = '?source=meta&campaign=launch_202610&creative=b&email=private%40example.invalid&token=secret&utm_campaign=private';
  assert.equal(landingCtaHref('write', 'meta', raw), '/?action=write&source=meta&campaign=launch_202610&creative=b');
  assert.equal(landingCtaHref('browse', 'meta', raw), '/?browse=1&source=meta&campaign=launch_202610&creative=b');
  assert.equal(signupLandingHref('meta', raw), '/landing?source=meta&campaign=launch_202610&creative=b');
  assert.equal(landingCtaHref('write', 'meta', '?campaign=private%40example.invalid&creative=a'), '/?action=write&source=meta');
});
test('existing tab storage carries sanitized attribution, supports old values, and explicit source replaces prior campaign', () => {
  const saved = new Map(); globalThis.sessionStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  globalThis.location = { search: '?source=meta&campaign=launch_202610&creative=a&token=secret&email=private' };
  try {
    const expected = { recruitment_source: 'meta', campaign_code: 'launch_202610', creative_code: 'a' };
    assert.deepEqual(readCampaignAttribution(), expected);
    assert.equal(saved.size, 1); assert.deepEqual(JSON.parse(saved.get(RECRUITMENT_STORAGE_KEY)), expected);
    globalThis.location.search = ''; assert.deepEqual(readCampaignAttribution(), expected);
    globalThis.location.search = '?source=community'; assert.deepEqual(readCampaignAttribution(), { recruitment_source: 'community' });
    globalThis.location.search = ''; saved.set(RECRUITMENT_STORAGE_KEY, 'technical_test'); assert.deepEqual(readCampaignAttribution(), { recruitment_source: 'technical_test' });
    saved.set(RECRUITMENT_STORAGE_KEY, '{"recruitment_source":"meta","campaign_code":"private","creative_code":"secret","email":"private"}');
    assert.deepEqual(readCampaignAttribution(), { recruitment_source: 'meta' });
    saved.set(RECRUITMENT_STORAGE_KEY, 'invalid json'); assert.deepEqual(readCampaignAttribution(), { recruitment_source: 'unattributed' });
  } finally { delete globalThis.sessionStorage; delete globalThis.location; }
});
test('blocked session storage does not affect safe navigation or event metadata', () => {
  globalThis.location = { search: '?source=meta&campaign=launch_202610&creative=a' };
  globalThis.sessionStorage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  try { assert.deepEqual(readCampaignAttribution(), { recruitment_source: 'meta', campaign_code: 'launch_202610', creative_code: 'a' }); }
  finally { delete globalThis.sessionStorage; delete globalThis.location; }
});
