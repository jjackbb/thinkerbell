import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

const base = process.env.VOTE_TEST_REST_URL;
const secret = process.env.VOTE_TEST_JWT_SECRET;
if (!base || !secret) throw new Error('Set VOTE_TEST_REST_URL and VOTE_TEST_JWT_SECRET for the isolated PostgREST test');
const url = new URL(base);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('Vote REST test only accepts a localhost URL');
}

const userIds = {
  author: '11111111-1111-1111-1111-111111111111',
  first: '22222222-2222-2222-2222-222222222222',
  second: '33333333-3333-3333-3333-333333333333',
};

function jwt(userId) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    role: 'authenticated', sub: userId, exp: Math.floor(Date.now() / 1000) + 600,
  })}`;
  const signature = createHmac('sha256', secret).update(content).digest('base64url');
  return `${content}.${signature}`;
}

async function request(path, userId, method = 'GET', body) {
  const response = await fetch(new URL(path, url), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { Authorization: `Bearer ${jwt(userId)}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function vote(userId, storyId, option) {
  return request('/rpc/vote_story', userId, 'POST', { p_story_id: storyId, p_option: option });
}

function row(response) {
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

test('isolated REST voting respects retries, changes, accounts, and access', async () => {
  const story = 'http-story';
  assert.notEqual((await vote(null, story, 'A')).status, 200, 'anonymous RPC must be unavailable');
  assert.notEqual((await vote(userIds.author, story, 'A')).status, 200, 'author must not vote');

  let saved = row(await vote(userIds.first, story, 'A'));
  assert.deepEqual([saved.votesA, saved.votesB], [1, 0]);

  saved = row(await vote(userIds.first, story, 'A'));
  assert.deepEqual([saved.votesA, saved.votesB], [1, 0], 'same choice must be idempotent');

  saved = row(await vote(userIds.first, story, 'B'));
  assert.deepEqual([saved.votesA, saved.votesB], [0, 1]);
  assert.notEqual((await vote(userIds.first, story, 'A')).status, 200, 'second change must fail');

  saved = row(await vote(userIds.second, story, 'A'));
  assert.deepEqual([saved.votesA, saved.votesB], [1, 1]);

  for (const userId of [userIds.first, userIds.second]) {
    const visible = await request(`/votes?select=option&storyId=eq.${story}`, userId);
    assert.equal(visible.status, 200);
    assert.equal(visible.data.length, 1, 'each account must see only its own vote');
  }

  const directWrite = await request('/votes', userIds.first, 'POST', {
    storyId: story, userId: userIds.first, option: 'A',
  });
  assert.notEqual(directWrite.status, 201, 'direct vote table write must fail');
  assert.notEqual((await vote(userIds.first, 'private-story', 'A')).status, 200, 'private story must not be returned');
});
