import test from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentAiWarning } from '../frontend/src/lib/aiRetention.ts';
import { aiChatRetentionNotice, aiExpiryLabel, AI_CHAT_RETENTION_NOTICE, aiRetentionBasisNotice } from '../frontend/src/lib/aiFeedbackScale.ts';
import { notificationLabel } from '../frontend/src/lib/notificationModel.ts';
const warning = { id:'notice',kind:'ai_room_expiring',roomId:'room',storyId:null,expiresAt:'2027-04-13T01:30:00Z',retentionVersion:4 };
const room = { id:'room',expiresAt:'2027-04-13T01:30:00Z',retentionVersion:4 };
test('AI warnings match an exact current room and generation, without requiring source-story access', () => {
 assert.equal(isCurrentAiWarning(warning,room),true);
 assert.equal(isCurrentAiWarning(warning,{...room,expiresAt:'2027-04-13T10:30:00+09:00'}),true);
});
test('renewed warnings, mismatched rooms, deleted room and malformed expiry cannot open', () => {
 for(const candidate of [null,undefined,{...room,id:'other'},{...room,retentionVersion:5},{...room,expiresAt:'2027-10-13T01:30:00Z'},{...room,expiresAt:'invalid'}]) assert.equal(isCurrentAiWarning(warning,candidate),false);
 for(const patch of [{kind:'story_comment'},{roomId:null},{retentionVersion:null},{retentionVersion:1.5},{expiresAt:null},{expiresAt:'invalid'}]) assert.equal(isCurrentAiWarning({...warning,...patch},room),false);
});
test('server expiry is formatted in Korea time, never approximated from updatedAt', () => {
 assert.match(aiExpiryLabel('2027-04-13T01:30:00Z'),/2027.*4.*13.*10:30/);
 assert.equal(aiExpiryLabel(undefined),null);assert.equal(aiExpiryLabel(null),null);assert.equal(aiExpiryLabel('invalid'),null);
});
test('disabled retention preserves operating policy; enabled wording specifies normal persisted AI replies', () => {
 assert.equal(aiChatRetentionNotice(false),AI_CHAT_RETENTION_NOTICE);
 assert.match(aiChatRetentionNotice(false),/최종 수정 시각/);
 assert.match(aiChatRetentionNotice(true),/마지막으로 정상 저장된 AI 답변/);
 assert.match(aiChatRetentionNotice(true),/방 열기·고정·공감 비율 변경·평가/);
 assert.doesNotMatch(aiChatRetentionNotice(true),/최종 수정 시각/);
});
test('AI expiry label does not expose room content or imply client-side expiry computation', () => {
 assert.equal(notificationLabel(warning),'AI 대화방의 보관 기한이 곧 끝나요');
});

test('legacy fallback and empty rooms explain their distinct server-selected basis', () => {
 assert.match(aiRetentionBasisNotice('legacy_updated_at'),/기존 수정 시각.*최소 7일/);
 assert.match(aiRetentionBasisNotice('created_at'),/대화방 생성 시각/);
 assert.equal(aiRetentionBasisNotice('completed_turn'),null);
 assert.equal(aiRetentionBasisNotice(undefined),null);
});
