import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Production components rendered with synthetic props and no network or credentials.
const story = { id:'synthetic-story',authorId:'owner',authorNickname:'PRIVATE_NAME',title:'합성 사연',body:'합성 본문',category:'친구',createdAt:'2026-10-16T00:00:00Z',votesA:80,votesB:20,commentCount:0,viewCount:10,reportsCount:0,isBlind:false,cardColor:'cream' };
async function render(component,props={}) {
 const folder=await mkdtemp(path.join(tmpdir(),'ui-clarity-'));
 try {
  const result=await build({stdin:{contents:`
    import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
    import {${component}} from './frontend/src/components/${component}';
    globalThis.window={location:{origin:'https://example.invalid',pathname:'/'}};
    const props=${JSON.stringify(props)};
    for (const key of ['onSelectStory','onSelect','onVote','onClose','onAddComment','onLikeComment','onStartAIChat','onReportStory','onReportComment']) props[key]=()=>{};
    process.stdout.write(renderToStaticMarkup(React.createElement(${component},props)));
  `,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,define:{'import.meta.env':JSON.stringify({})},plugins:[{name:'no-real-supabase',setup(build){build.onResolve({filter:/\/supabase$/},()=>({path:'supabase',namespace:'synthetic'}));build.onLoad({filter:/.*/,namespace:'synthetic'},()=>({contents:'export const supabase = {};'}));}}],logLevel:'silent'});
  const file=path.join(folder,'render.cjs');await writeFile(file,result.outputFiles[0].text);
  return execFileSync(process.execPath,[file],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 }finally{await rm(folder,{recursive:true,force:true});}
}
test('unvoted ranking does not expose percentages, side counts, or outcome-dependent bars',async()=>{
 const html=await render('WeeklyTopBanner',{weeklyTopStories:[story]});
 assert.match(html,/니 편 \?\?%/);
 assert.doesNotMatch(html,/투표하면 결과를 볼 수 있어요/);
 assert.doesNotMatch(html,/80%|20%|80표|20표|width:80|width:20/);
 assert.match(html,/<button type="button" data-action-id="weekly-top-banner-action-01"/);
 const reversed=await render('WeeklyTopBanner',{weeklyTopStories:[{...story,votesA:20,votesB:80}]});
 assert.equal(html,reversed,'same total must render identically before voting');
});
test('voter and signed-in author can see ranking results, guest ownership does not count',async()=>{
 for(const props of [{weeklyTopStories:[{...story,userVoted:'A'}]},{weeklyTopStories:[story],currentUser:{id:'owner'}}]){
  const html=await render('WeeklyTopBanner',props);assert.match(html,/80%/);assert.match(html,/20%/);
 }
 const guest=await render('WeeklyTopBanner',{weeklyTopStories:[{...story,userVoted:'A'}],currentUser:{id:'owner'},isGuest:true});
 assert.doesNotMatch(guest,/80%|20%/);
});
test('zero and small samples keep the common result policy; hidden panels are inert',async()=>{
 const zero=await render('WeeklyTopBanner',{weeklyTopStories:[{...story,votesA:0,votesB:0}],currentUser:{id:'owner'}});
 assert.match(zero,/아직 투표가 없어요/);assert.doesNotMatch(zero,/50%/);
 const small=await render('WeeklyTopBanner',{weeklyTopStories:[{...story,votesA:2,votesB:1,userVoted:'B'}],realtimeTopStories:[story]});
 assert.match(small,/내 편 2표/);assert.match(small,/니 편 1표/);assert.match(small,/aria-hidden="true" inert=""/);
});
test('public result sharing appears only for voters/authors; locked state explains where it will appear',async()=>{
 const props={story,comments:[],currentUser:{id:'reader',nickname:'reader',createdAt:''}};
 const locked=await render('StoryDetailModal',props);assert.doesNotMatch(locked,/data-button-id="share-result-bar-button-03"/);assert.match(locked,/투표한 뒤 화면 아래/);
 for(const update of [{story:{...story,userVoted:'B'}},{currentUser:{id:'owner'}}]){
  const html=await render('StoryDetailModal',{...props,...update});assert.match(html,/data-button-id="share-result-bar-button-03"/);assert.match(html,/aria-label="사연 닫기"/);
 }
 const privateStory=await render('StoryDetailModal',{...props,story:{...story,visibility:'private'},currentUser:{id:'owner'}});
 assert.doesNotMatch(privateStory,/share-result-bar-button-03|투표한 뒤 화면 아래/);
});
test('feed and detail keep the original vote button wording without new side descriptions',async()=>{
 for(const component of ['StoryCard','StoryDetailModal']){
  const html=await render(component,{story,currentUser:{id:'reader'},comments:[]});
  const ids=component==='StoryCard'?['story-card-button-08','story-card-button-09']:['story-detail-modal-button-09','story-detail-modal-button-10'];
  for(const [index,id] of ids.entries()){
   const button=html.match(new RegExp(`<button[^>]*data-button-id="${id}"[^>]*>([\\s\\S]*?)</button>`));
   assert.ok(button,`${component} ${id}`);
   assert.equal(button[1].trim(),index===0?'니 편':'내 편');
  }
 }
});
test('share bar accurately discloses selected side, link and preview; author card has no selected side',async()=>{
 const html=await render('ShareResultBar',{input:{title:'제목',votesA:8,votesB:2,myChoice:'A'},url:'https://example.invalid/?story=synthetic'});
 assert.match(html,/제목·투표 결과·내 선택 카드와 사연 링크/);assert.match(html,/aria-label="결과 카드 이미지 저장"/);
 const author=await render('ShareResultBar',{input:{title:'제목',votesA:8,votesB:2},url:'https://example.invalid/?story=synthetic'});
 assert.doesNotMatch(author,/내 선택/);
});
test('FAQ and login benefit copy return to the prior wording requested by the user',async()=>{
 const source=await readFile('frontend/src/components/MyPageView.tsx','utf8');
 assert.match(source,/사연을 열람하는 모든 유저가 실시간 투표 비율을 볼 수 있지만, 누가 어디에 투표했는지는 비공개입니다\./);
 assert.match(source,/지금은 로그인 없이 둘러보는 중이에요\. 내 활동은 로그인한 뒤부터 쌓입니다\./);
 assert.match(source,/사연 전체 내용을 읽고 내 편·니 편에 투표하기/);
 assert.doesNotMatch(source,/공개 사연의 전체 내용은 로그인 없이 읽을 수 있어요|작성자는 본인 사연에 투표할 수 없지만 결과는 바로/);
});
test('card footer exposes visible comment and vote labels without changing the numbers',async()=>{
 const html=await render('StoryCard',{story,currentUser:{id:'reader'},comments:[]});
 assert.match(html,/<span>댓글 <\/span>0/);
 assert.match(html,/<span>투표 <\/span>100/);
 assert.doesNotMatch(html,/<span class="sr-only">(?:댓글|투표) /);
});
test('dark supporting-text tokens exceed 4.5:1 on both dark surfaces',async()=>{
 const css=await readFile('frontend/src/index.css','utf8');
 const lum=hex=>{const [r,g,b]=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;};
 for(const name of ['secondary','danger']){
  const color=css.match(new RegExp(`--color-${name}-on-dark: (#[A-Fa-f0-9]+)`))[1];
  for(const bg of ['#1C1C1C','#2A2A2A'])assert.ok((lum(color)+.05)/(lum(bg)+.05)>=4.5,`${name} on ${bg}`);
 }
});
test('previously unnamed icon controls now carry an explicit accessible name',async()=>{
 const cases=[['StoryCard','story-card-button-14'],['StoryDetailModal','story-detail-modal-button-01'],['StoryDetailModal','story-detail-modal-button-07'],['StoryDetailModal','story-detail-modal-button-13'],['AIChatView','ai-chat-view-button-02'],['AIErrorReportModal','ai-error-report-modal-button-01'],['AdultVerificationModal','adult-verification-modal-button-01'],['CreateStoryModal','create-story-modal-button-01']];
 for(const [name,id] of cases){const source=await readFile(`frontend/src/components/${name}.tsx`,'utf8');assert.match(source,new RegExp(`data-button-id="${id}" aria-label="[^"]+"`));}
});
