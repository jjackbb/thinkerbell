import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { privacyNoticeDraft as notice } from '../frontend/src/lib/privacyNoticeDraft.ts';
import { PrivacyNoticeDraft, PrivacyNoticeDraftContent, SignupPrivacyNoticeDraft } from '../frontend/src/components/PrivacyNoticeDraft.tsx';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('shared content names confirmed operator, age and unresolved publication facts', () => {
  const html = renderToStaticMarkup(React.createElement(PrivacyNoticeDraftContent));
  for (const text of ['2026-10-13.review-1', '운영 미적용', '변종현', 'ds5305naver@gmail.com', '만 18세 이상', '국외이전', '법적 근거', '포텐스', '사연 검증', '댓글 표현 검사', '마지막 정상 AI 답변', '달력 기준 6개월', '00:01', '알림 내역은 30일', '중복 알림 방지 기록은 별도']) assert.ok(html.includes(text), text);
  assert.ok(notice.age.includes('아직 운영에 적용하지 않았습니다'));
  assert.ok(!notice.age.includes('14세'));
  assert.ok(notice.sections.some(s => s.title === '선택적 이용 분석'));
  assert.ok(html.includes('별도 내부 분석 기록에는 세션 식별자'));
});
test('preview adds no blanket consent, account action, or storage mutation', () => {
  const html = renderToStaticMarkup(React.createElement(SignupPrivacyNoticeDraft));
  assert.ok(html.includes('기본 서비스를 이용할 수 있습니다'));
  assert.ok(!html.includes('type="checkbox"'));
  const source = read('frontend/src/components/PrivacyNoticeDraft.tsx');
  assert.doesNotMatch(source, /setAnalyticsConsent|localStorage|fetch\(|supabase/);
  const dialog = renderToStaticMarkup(React.createElement(PrivacyNoticeDraft, { isOpen: false, onClose() {} }));
  assert.match(dialog, /<dialog[^>]*aria-labelledby=/);
  assert.doesNotMatch(dialog, /<dialog[^>]* open/);
});
test('production app does not mount the preview or import draft content', () => {
  for (const file of ['frontend/src/App.tsx', 'frontend/src/main.tsx', 'frontend/src/components/WelcomeModal.tsx']) {
    assert.doesNotMatch(read(file), /import .*PrivacyNoticeDraft|privacyNoticeDraft/);
  }
  assert.doesNotMatch(read('frontend/src/App.tsx'), /signupNoticePreview=/);
  assert.doesNotMatch(read('frontend/vite.config.ts'), /privacy\.html|privacy-vite/);
});
test('production bundles exclude unfinished notice and review identifiers', () => {
  const bundle = readdirSync(new URL('../dist/assets/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => read(`dist/assets/${f}`)).join('\n');
  assert.doesNotMatch(bundle, /2026-10-13\.review-1|개인정보 처리 안내 검토|게시 전 확인이 필요한 사항|ds5305naver@gmail\.com/);
});
test('misleading anonymity claims are removed without changing auth submission branches', () => {
  const welcome = read('frontend/src/components/WelcomeModal.tsx');
  assert.doesNotMatch(welcome, /완전한 익명성/);
  assert.doesNotMatch(read('frontend/src/components/CreateStoryModal.tsx'), /100% 완전한 익명/);
  assert.doesNotMatch(read('frontend/src/components/MyPageView.tsx'), /100% 익명으로 보장/);
  assert.match(welcome, /supabase\.auth\.signUp/);
  assert.match(welcome, /\/api\/auth\/email-check\/signup/);
  assert.match(welcome, /!isLoginMode && recoveryPhase === 'idle' && !confirmationEmail && !showExpiredLink && signupNoticePreview/);
});
