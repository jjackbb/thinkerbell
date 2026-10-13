import test from 'node:test';
import assert from 'node:assert/strict';
import {sixCalendarMonthsSeoul,retentionMetadata,aiRetentionEnabled} from '../backend/aiRetention.ts';
test('six calendar months clamp month end in Korea time, preserving wall-clock time',()=>{
 for(const [start,end] of [
  ['2026-08-31T03:04:05.006Z','2027-02-28T03:04:05.006Z'],
  ['2023-08-31T03:04:05Z','2024-02-29T03:04:05.000Z'],
  ['2024-02-29T01:00:00Z','2024-08-29T01:00:00.000Z'],
  ['2026-01-31T03:00:00Z','2026-07-31T03:00:00.000Z'],
  ['2026-08-30T16:30:00Z','2027-02-27T16:30:00.000Z'],
  ['2026-03-31T14:59:59.999Z','2026-09-30T14:59:59.999Z'],
 ])assert.equal(sixCalendarMonthsSeoul(start),end);
});
test('retention reference rejects malformed time rather than guessing a deadline',()=>{assert.throws(()=>sixCalendarMonthsSeoul('not-a-time'),/INVALID_RETENTION_TIME/);});
test('retention metadata carries no chat content and never manufactures a deadline',()=>{
 assert.deepEqual(retentionMetadata({chatHistory:['secret'],updatedAt:'now'}),{lastCompletedAt:null,expiresAt:null,retentionVersion:null,retentionBasis:null});
});
test('AI retention requires explicit backend opt-in',()=>{
 const old=process.env.AI_RETENTION_ENABLED;
 try{delete process.env.AI_RETENTION_ENABLED;assert.equal(aiRetentionEnabled(),false);process.env.AI_RETENTION_ENABLED='true';assert.equal(aiRetentionEnabled(),true);}
 finally{if(old===undefined)delete process.env.AI_RETENTION_ENABLED;else process.env.AI_RETENTION_ENABLED=old;}
});
