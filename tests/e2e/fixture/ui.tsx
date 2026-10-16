import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { WeeklyTopBanner } from '../../../frontend/src/components/WeeklyTopBanner';
import { StoryCard } from '../../../frontend/src/components/StoryCard';
import { StoryDetailModal } from '../../../frontend/src/components/StoryDetailModal';
import type { Story } from '../../../frontend/src/types';
const original: Story={id:'ui-synthetic',authorId:'author',authorNickname:'비공개 닉네임',title:'약속 시간을 바꿔도 될까요?',body:'합성 UI 시험용 사연입니다. 실제 계정이나 데이터를 사용하지 않습니다.',category:'친구',createdAt:'2026-10-16T00:00:00Z',votesA:80,votesB:20,commentCount:0,viewCount:10,reportsCount:0,isBlind:false,cardColor:'cream'};
function UiFixture(){
 const [story,setStory]=useState(original);
 const [role,setRole]=useState<'reader'|'author'|'guest'>('reader');
 const [open,setOpen]=useState(false);
 const [login,setLogin]=useState(false);
 const user={id:role,nickname:'합성 사용자',createdAt:''};
 const vote=async(_id:string,option:'A'|'B')=>{if(role==='guest'){setLogin(true);return false;}setStory(current=>({...current,userVoted:option}));return true;};
 return <>
  <nav aria-label="UI 합성 시험 제어" style={{position:'relative',zIndex:100,display:'flex',flexWrap:'wrap',gap:8,background:'white',padding:8}}>
   {(['reader','author','guest'] as const).map(next=><button key={next} onClick={()=>{setRole(next);setStory(original);setOpen(false);setLogin(false);}}>시험 {next}</button>)}
   <button onClick={()=>setStory(current=>({...current,visibility:'private'}))}>시험 비공개</button>
  </nav>
  <main className="p-4 max-w-5xl mx-auto">
   <WeeklyTopBanner currentUser={user} isGuest={role==='guest'} weeklyTopStories={[story]} realtimeTopStories={[story]} onSelectStory={()=>setOpen(true)}/>
   <StoryCard story={story} currentUser={user} isGuest={role==='guest'} onSelect={()=>setOpen(true)} onVote={vote} onReport={()=>{}}/>
  </main>
  {login&&<p role="status">시험 로그인 안내</p>}
  {open&&<StoryDetailModal story={story} comments={[]} currentUser={user} isGuest={role==='guest'} onClose={()=>setOpen(false)} onVote={vote} onRequireLogin={()=>setLogin(true)} onAddComment={async()=>true} onLikeComment={()=>{}} onStartAIChat={()=>{}} onReportStory={()=>{}} onReportComment={()=>{}}/>}
 </>;
}
createRoot(document.getElementById('root')!).render(<UiFixture/>);
