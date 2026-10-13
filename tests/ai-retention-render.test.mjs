import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

async function renderAiList(enabled, basis) {
 const folder=await mkdtemp(path.join(tmpdir(),'ai-retention-render-'));
 try {
  const result=await build({ stdin:{contents:`
   import React from 'react';
   import {renderToStaticMarkup} from 'react-dom/server';
   import {AIChatView} from './frontend/src/components/AIChatView';
   const persona={id:'synthetic-room',name:'연습 상대',role:'직장 상대',category:'직장',avatarIcon:'user',description:'합성 테스트',systemInstruction:'',sampleFirstMessage:'안녕하세요',cardColor:'cream',chatHistory:[],expiresAt:'2027-04-13T01:30:00Z',retentionVersion:4,retentionBasis:${JSON.stringify(basis)}};
   process.stdout.write(renderToStaticMarkup(React.createElement(AIChatView,{personas:[persona],activeSession:null,onStartSession:()=>{},onEndSession:()=>{}})));
  `,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,define:{'import.meta.env':JSON.stringify({VITE_AI_RETENTION_ENABLED:enabled?'true':'false'})},logLevel:'silent'});
  const file=path.join(folder,'render.cjs');await writeFile(file,result.outputFiles[0].text);
  return execFileSync(process.execPath,[file],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 } finally {await rm(folder,{recursive:true,force:true});}
}
test('rendered AI list shows authoritative expiry and legacy grace explanation when enabled', async()=>{
 const html=await renderAiList(true,'legacy_updated_at');
 assert.match(html,/보관 기한: 2027년 4월 13일 10:30 \(한국시간\)/);
 assert.match(html,/기존 수정 시각.*최소 7일/);
 assert.match(html,/마지막으로 정상 저장된 AI 답변/);
});
test('rendered empty-turn room explains creation basis without presenting it as last conversation',async()=>{
 const html=await renderAiList(true,'created_at');
 assert.match(html,/아직 정상 저장된 AI 답변이 없어 대화방 생성 시각/);
 assert.doesNotMatch(html,/기존 수정 시각을 기준/);
});
test('feature-off rendered AI list hides all new expiry metadata and wording',async()=>{
 const html=await renderAiList(false,'legacy_updated_at');
 assert.doesNotMatch(html,/보관 기한:|전환일부터 최소|마지막으로 정상 저장된 AI 답변/);
 assert.match(html,/연습 상대/);
});
