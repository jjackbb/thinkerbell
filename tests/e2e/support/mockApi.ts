import type { Page } from '@playwright/test';
export const baseUrl = 'http://127.0.0.1:4178';
export const room = { id:'room',userId:'owner-a',name:'합성 AI 상대',role:'직장 상대',category:'직장',avatarIcon:'user',description:'테스트 전용 대화방',systemInstruction:'',sampleFirstMessage:'안녕하세요',cardColor:'cream',chatHistory:[],opening:'oblivious',expiresAt:'2027-04-13T01:30:00Z',lastCompletedAt:'2026-10-13T01:30:00Z',retentionVersion:4,retentionBasis:'completed_turn' };
export const aiWarning = {id:'ai-warning',kind:'ai_room_expiring',storyId:null,commentId:null,replyRootId:null,milestone:null,roomId:'room',expiresAt:room.expiresAt,retentionVersion:4,createdAt:'2026-10-13T01:00:00Z',readAt:null};
export function deferred() { let resolve!:()=>void; const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve}; }
export async function mockApi(page: Page, options: { ai?:boolean; empty?:boolean; initialGate?:ReturnType<typeof deferred> } = {}) {
  const notice = (id:string,kind:string,milestone:number|null=null) => ({id,kind,storyId:'story',commentId:null,replyRootId:null,milestone,createdAt:'2026-10-13T01:00:00Z',readAt:null as string|null});
  const state = {
    items: options.empty ? [] : options.ai ? [{...aiWarning}] : [notice('n1','story_comment'),notice('n2','comment_reply'),notice('n3','story_vote_milestone',100)],
    failNextList:false, failNextRead:false, targetStatus:200, targetRoom:{...room},
    listCalls:[] as string[], readCalls:[] as string[], openCalls:[] as string[], comments:[] as any[],
    storyVisible:true, holdNextStory:false, storyGate:null as ReturnType<typeof deferred>|null, heldStoryStarted:false, heldStoryReleased:false, heldStoryUrl:'',
    openGate:null as ReturnType<typeof deferred>|null, commentGate:null as ReturnType<typeof deferred>|null,
    unexpected:[] as string[], errors:[] as string[],
    releasedLists:[] as string[], releasedOpens:[] as string[], finishedRequests:[] as string[], finishedUrls:[] as string[],
  };
  page.on('pageerror',error=>state.errors.push(error.message));
  const recordFinished = (request: import('@playwright/test').Request) => {state.finishedRequests.push(`${request.headers().authorization ?? ''}:${new URL(request.url()).pathname}`);state.finishedUrls.push(request.url());};
  page.on('requestfinished',recordFinished);
  page.on('requestfailed',recordFinished);
  let initial=true;
  await page.route('**/*',async route=>{
    const request=route.request(), url=new URL(request.url());
    if(url.origin!==baseUrl) {state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);await route.abort();return;}
    const path=url.pathname;
    const account=request.headers().authorization?.replace('Bearer fixture:','');
    const json=async(body:any,status=200)=>{try{await route.fulfill({status,json:body});}catch{/* An aborted component fetch can close the route before a held response is released. */}};
    if(path.startsWith('/api/notifications')) {
      if(!['owner-a','owner-b'].includes(account??'')) {state.unexpected.push(`unexpected fixture auth ${account}`);await json({},401);return;}
      const own=account==='owner-a'?state.items:[];
      if(path==='/api/notifications') {
        state.listCalls.push(`${account}:${url.searchParams.get('cursor')??'first'}`);
        if(initial){initial=false;await options.initialGate?.promise;}
        if(state.failNextList){state.failNextList=false;await json({},503);return;}
        const offset=url.searchParams.has('cursor')?2:0;
        await json({notifications:own.slice(offset,offset+2),nextCursor:own.length>offset+2?'older':null,unreadCount:own.filter(n=>!n.readAt).length});state.releasedLists.push(`${account}:${url.searchParams.get('cursor')??'first'}`);return;
      }
      if(path==='/api/notifications/unread-count'){await json({unreadCount:own.filter(n=>!n.readAt).length});return;}
      if(path.endsWith('/target')){await json({room:state.targetRoom},state.targetStatus);return;}
      if(request.method()==='POST' && (path.endsWith('/read') || path.endsWith('/read-all'))) {
        state.readCalls.push(path);
        if(state.failNextRead){state.failNextRead=false;await json({},503);return;}
        const id=path.split('/')[3];
        own.forEach(n=>{if(path.endsWith('/read-all')||n.id===id)n.readAt='2026-10-13T02:00:00Z';});
        await json({updated:true});return;
      }
      state.unexpected.push(`${request.method()} ${path}`);await json({},500);return;
    }
    if(path==='/api/ai/quota'){await json({mode:'server',quotaDay:'2026-10-13',used:0,limit:3});return;}
    if(path==='/fixture/rpc/read_visible_comments'){await json({data:[],error:null});return;}
    if(path==='/fixture/rpc/read_visible_stories'){
      const args=request.postDataJSON();
      const story={id:'story',authorId:'owner-a',authorNickname:'작성자',title:'합성 접근 경계 사연',body:'합성 시험 본문입니다.',category:'친구',createdAt:'2026-10-13T00:00:00Z',votesA:0,votesB:0,commentCount:0,viewCount:0,reportsCount:0,isBlind:false,cardColor:'cream'};
      const data=state.storyVisible && args.p_story_id!=='__schema_probe_no_story__'?[story]:[];
      const held=state.holdNextStory && args.p_story_id==='story';
      if(held){state.holdNextStory=false;state.heldStoryStarted=true;state.heldStoryUrl=request.url();await state.storyGate?.promise;}
      await json({data,error:null});
      if(held)state.heldStoryReleased=true;
      return;
    }
    if(path.startsWith('/fixture/open/')){state.openCalls.push(path);await state.openGate?.promise;await json({opened:true});state.releasedOpens.push(path);return;}
    if(path==='/fixture/comments' && request.method()==='POST'){state.comments.push(request.postDataJSON());await state.commentGate?.promise;await json({saved:true});return;}
    if(path==='/api/account/adult-eligibility'){await json({enabled:false,eligible:false,policyVersion:'adult-self-attestation-v1',attestedAt:null});return;}
    if(path.startsWith('/api/') || path.startsWith('/fixture/') || ['fetch','xhr'].includes(request.resourceType())){state.unexpected.push(`${request.method()} ${path}`);await json({},500);return;}
    await route.continue();
  });
  return state;
}
