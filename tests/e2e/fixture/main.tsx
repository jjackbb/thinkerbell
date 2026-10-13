import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { NotificationList } from '../../../frontend/src/components/NotificationList';
import { StoryDetailModal } from '../../../frontend/src/components/StoryDetailModal';
import { AIChatView } from '../../../frontend/src/components/AIChatView';
import { fetchAiWarningTarget } from '../../../frontend/src/lib/aiPersonas';
import type { AIPersona, ChatSession, Comment, Story } from '../../../frontend/src/types';
import { setFixtureAccount } from '../support/supabase';

const story: Story = { id:'story', authorId:'owner-a', authorNickname:'글쓴이', title:'주말 약속을 미뤄도 괜찮을까요?', body:'바쁜 한 주를 보내고 쉬고 싶다고 말했어요. 친구는 오래전부터 정한 약속이라 서운하다고 해요.', category:'친구', createdAt:'2026-10-13T00:00:00Z', votesA:32, votesB:18, commentCount:3, viewCount:50, reportsCount:0, isBlind:false, cardColor:'cream' };
const root: Comment = { id:'root', storyId:'story', authorId:'reader', anonymousId:'익명 1', content:'먼저 사정을 설명하고 다른 날짜를 제안하면 어떨까요?', createdAt:'2026-10-13T01:00:00Z', likeCount:2, reportsCount:0 };
const initial: Comment[] = [root,{...root,id:'reply-1',authorId:'owner-a',anonymousId:'익명 2',content:'고마워요. 그렇게 이야기해 볼게요.',replyRootId:'root',replyToId:'root'},{...root,id:'reply-2',authorId:'another',anonymousId:'익명 3',content:'서로 편한 날을 찾아보세요.',replyRootId:'root',replyToId:'reply-1'}];
function Fixture() {
  const [account,setAccount] = useState('owner-a');
  const accountRef = useRef(account); accountRef.current = account;
  const [mode,setMode] = useState<'notifications'|'story'|'ai'|'closed'>('notifications');
  const [comments,setComments] = useState(initial);
  const [opened,setOpened] = useState('');
  const [login,setLogin] = useState('');
  const [abortedOpen,setAbortedOpen] = useState(false);
  const [personas,setPersonas] = useState<AIPersona[]>([]);
  const [session,setSession] = useState<ChatSession|null>(null);
  const [submissions,setSubmissions] = useState<{id:string;replyToId?:string}[]>([]);
  const chooseAccount = (id:string) => { setFixtureAccount(id); accountRef.current=id;setAccount(id);setOpened('');setPersonas([]);setSession(null);setMode('notifications'); };
  return <>
    <nav aria-label="합성 시험 제어" className="flex flex-wrap gap-3 p-4">
      <button onClick={()=>setMode('notifications')}>알림 화면</button>
      <button onClick={()=>setMode('story')}>사연 화면</button>
      <button onClick={()=>{setMode('closed');setOpened('');}}>닫기</button>
      <button onClick={()=>chooseAccount('owner-a')}>계정 A</button>
      <button onClick={()=>chooseAccount('owner-b')}>계정 B</button>
      <button onClick={()=>{chooseAccount('guest');setMode('story');}}>게스트</button>
    </nav>
    <output data-testid="opened-target">{opened}</output>
    <output data-testid="aborted-open">{String(abortedOpen)}</output>
    <output data-testid="submission-count">{submissions.length}</output>
    <output data-testid="last-reply-target">{submissions.at(-1)?.replyToId ?? ''}</output>
    {login && <p role="status">{login}</p>}
    {mode==='notifications' && account!=='guest' && <main className="max-w-xl mx-auto p-4"><h1 className="text-xl font-bold mb-4">알림</h1><NotificationList key={account} accountId={account} onUnreadChange={()=>{}} onOpen={async(item,signal)=>{
      const owner=account;
      signal?.addEventListener('abort',()=>setAbortedOpen(true),{once:true});
      if(item.kind==='ai_room_expiring') {
        // Uses the real API/owner/generation validation helper, not a cloned expiry implementation.
        const persona=await fetchAiWarningTarget(owner,item,signal);
        if(signal?.aborted || accountRef.current!==owner) return false;
        setPersonas([persona]);setOpened(`ai:${persona.id}`);setMode('ai');return true;
      }
      const response=await fetch(`/fixture/open/${item.id}`,{signal});
      if(!response.ok || signal?.aborted || accountRef.current!==owner) return false;
      setOpened(`story:${item.storyId}`);return true;
    }}/></main>}
    {mode==='story' && <StoryDetailModal story={story} repliesEnabled comments={comments} currentUser={{id:account,nickname:'시험 계정',createdAt:''}} isGuest={account==='guest'} onRequireLogin={setLogin} onClose={()=>setMode('closed')} onVote={async()=>true} onAddComment={async(storyId,content,id,replyToId)=>{
      setSubmissions(previous=>[...previous,{id,replyToId}]);
      const response=await fetch('/fixture/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId,content,id,replyToId})});
      if(!response.ok)return false;
      setComments(previous=>previous.some(c=>c.id===id)?previous:[...previous,{...root,id,storyId,content,replyRootId:replyToId?'root':null,replyToId}]);return true;
    }} onLikeComment={()=>{}} onStartAIChat={()=>{}} onReportStory={()=>{}} onReportComment={()=>{}}/>}
    {mode==='ai' && <AIChatView personas={personas} activeSession={session} onStartSession={persona=>setSession({id:'synthetic-session',personaId:persona.id,personaName:persona.name,personaRole:persona.role,messages:persona.chatHistory??[],createdAt:'2026-10-13T00:00:00Z',status:'active',chatMode:'simulation'})} onEndSession={()=>setSession(null)} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
