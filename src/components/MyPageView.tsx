import React, { useState } from 'react';
import { UserProfile, Story, Comment } from '../types';
import { ShieldCheck, RefreshCw, Check, LogOut, ChevronRight } from 'lucide-react';

interface MyPageViewProps {
  user: UserProfile;
  myStories: Story[];
  myVotes: { storyId: string; title: string; option: 'A' | 'B' }[];
  myComments: Comment[];
  onUpdateNickname: (nickname: string) => void;
  onGenerateRandomNickname: () => void;
  onSelectStory: (story: Story) => void;
}

export const MyPageView: React.FC<MyPageViewProps> = ({
  user,
  myStories,
  myVotes,
  myComments,
  onUpdateNickname,
  onGenerateRandomNickname,
  onSelectStory,
}) => {
  const [activeTab, setActiveTab] = useState<'stories' | 'votes' | 'comments'>('stories');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(user.nickname);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    onUpdateNickname(nicknameInput.trim());
    setIsEditingNickname(false);
    setSuccessMessage('닉네임 변경 완료!');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  return (
    <div className="max-w-[420px] mx-auto space-y-6 pb-28">
      {/* Profile Section */}
      <section className="pt-2 pb-4">
        <div className="relative group">
          <div className="w-24 h-24 bg-black flex items-center justify-center mb-3 border-4 border-[#e21500] elevated-tile overflow-hidden">
            <span className="material-symbols-outlined text-white text-[48px]">person</span>
          </div>
          
          {isEditingNickname ? (
            <form onSubmit={handleSaveNickname} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={12}
                className="p-2 border-2 border-black font-mono text-sm font-black bg-white focus:outline-none focus:border-[#e21500]"
              />
              <button
                type="submit"
                className="p-2 bg-[#e21500] text-white border-2 border-black font-mono text-xs font-black"
              >
                저장
              </button>
              <button
                type="button"
                onClick={onGenerateRandomNickname}
                className="p-2 bg-black text-white border-2 border-black"
                title="랜덤 닉네임"
              >
                <RefreshCw className="w-4 h-4 text-[#fffa82]" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-black text-2xl tracking-tighter text-black">{user.nickname}</h2>
              <button
                onClick={() => {
                  setNicknameInput(user.nickname);
                  setIsEditingNickname(true);
                }}
                className="font-mono text-xs text-[#e21500] font-black underline cursor-pointer"
              >
                EDIT
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-[#e21500] px-2 py-0.5 text-white uppercase tracking-widest font-black border border-black">
              Verified Renegade
            </span>
            <span className="font-mono text-[10px] text-[#5e5e5e] font-bold">
              Joined 2024.03
            </span>
          </div>

          {successMessage && (
            <div className="mt-3 p-2 bg-black text-[#fffa82] font-mono text-xs font-black border-2 border-black flex items-center gap-1">
              <Check className="w-4 h-4 text-[#e21500]" /> {successMessage}
            </div>
          )}
        </div>
      </section>

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white border-2 border-black p-4 flex flex-col justify-between aspect-square elevated-tile">
          <span className="font-mono text-[10px] text-[#e21500] uppercase font-black">Level 02</span>
          <div>
            <p className="font-mono text-4xl text-[#e21500] font-black">{myStories.length}</p>
            <p className="text-sm text-black font-black leading-tight">내가 쓴 글</p>
          </div>
        </div>

        <div className="bg-black p-4 flex flex-col justify-between aspect-square border-2 border-black elevated-tile">
          <span className="font-mono text-[10px] text-[#7f7f7f] uppercase opacity-80 font-bold">Active Task</span>
          <div>
            <p className="font-mono text-4xl text-[#fffa82] font-black">{myVotes.length}</p>
            <p className="text-sm text-white font-black leading-tight">참여한 투표</p>
          </div>
        </div>
      </section>

      {/* Activity List Tabs */}
      <section className="space-y-4">
        <div className="flex border-b-4 border-black pb-2 gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-3 py-1.5 border-2 border-black font-black uppercase transition-all cursor-pointer ${
              activeTab === 'stories' ? 'bg-[#e21500] text-white shadow-[2px_2px_0px_#000]' : 'bg-white text-black'
            }`}
          >
            내 사연 ({myStories.length})
          </button>
          <button
            onClick={() => setActiveTab('votes')}
            className={`px-3 py-1.5 border-2 border-black font-black uppercase transition-all cursor-pointer ${
              activeTab === 'votes' ? 'bg-[#e21500] text-white shadow-[2px_2px_0px_#000]' : 'bg-white text-black'
            }`}
          >
            내 투표 ({myVotes.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-3 py-1.5 border-2 border-black font-black uppercase transition-all cursor-pointer ${
              activeTab === 'comments' ? 'bg-[#e21500] text-white shadow-[2px_2px_0px_#000]' : 'bg-white text-black'
            }`}
          >
            내 댓글 ({myComments.length})
          </button>
        </div>

        <div className="space-y-3">
          {activeTab === 'stories' && (
            myStories.length === 0 ? (
              <p className="text-center py-8 font-mono text-xs text-[#5e5e5e] font-bold">작성한 익명 사연이 없습니다.</p>
            ) : (
              myStories.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectStory(s)}
                  className="bg-white border-2 border-black p-4 group hover:border-[#e21500] transition-colors cursor-pointer elevated-tile"
                >
                  <div className="flex justify-between items-start mb-1 font-mono text-[10px]">
                    <span className="bg-[#cdbbff] px-2 py-0.5 text-black font-bold border border-black">{s.category}</span>
                    <span className="text-[#5e5e5e] font-bold">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-black text-sm text-black mb-2">{s.title}</p>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-[#e21500] font-bold">
                    <span>VOTES: {s.votesA + s.votesB}</span>
                    <span>COMMENTS: {s.commentCount}</span>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'votes' && (
            myVotes.length === 0 ? (
              <p className="text-center py-8 font-mono text-xs text-[#5e5e5e] font-bold">참여한 투표가 없습니다.</p>
            ) : (
              myVotes.map((v, i) => (
                <div
                  key={i}
                  className="bg-white border-2 border-black p-3.5 flex justify-between items-center elevated-tile"
                >
                  <p className="font-bold text-xs text-black line-clamp-1 flex-1 pr-2">{v.title}</p>
                  <span className={`font-mono text-[10px] font-black px-2.5 py-1 border border-black uppercase ${
                    v.option === 'A' ? 'bg-[#e21500] text-white' : 'bg-black text-white'
                  }`}>
                    {v.option === 'A' ? '내편' : '상대편'}
                  </span>
                </div>
              ))
            )
          )}

          {activeTab === 'comments' && (
            myComments.length === 0 ? (
              <p className="text-center py-8 font-mono text-xs text-[#5e5e5e] font-bold">작성한 댓글이 없습니다.</p>
            ) : (
              myComments.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border-2 border-black p-3.5 space-y-1 elevated-tile"
                >
                  <span className="font-mono text-[10px] text-[#e21500] font-black">{c.anonymousId}</span>
                  <p className="text-xs text-black font-bold leading-relaxed">{c.content}</p>
                </div>
              ))
            )
          )}
        </div>
      </section>

      {/* Settings Options */}
      <section className="space-y-3 pt-4 border-t-4 border-black">
        <button className="w-full flex items-center justify-between p-4 bg-white border-2 border-black elevated-tile font-black text-sm">
          <span>계정 설정</span>
          <ChevronRight className="w-5 h-5 text-[#e21500]" />
        </button>
        <button className="w-full flex items-center justify-between p-4 bg-white border-2 border-black elevated-tile font-black text-sm">
          <span>알림 관리</span>
          <ChevronRight className="w-5 h-5 text-[#e21500]" />
        </button>
        <button className="w-full flex items-center justify-between p-4 bg-white border-2 border-black elevated-tile font-black text-sm">
          <span>공지사항 및 도움말</span>
          <ChevronRight className="w-5 h-5 text-[#e21500]" />
        </button>
        
        <div className="pt-4">
          <button className="w-full py-3 bg-[#e21500] text-white font-mono rounded-none border-2 border-black elevated-tile hover:bg-[#440a07] transition-colors flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4 text-white" />
            <span className="font-black text-sm uppercase">로그아웃</span>
          </button>
          <p className="text-center font-mono text-[10px] text-[#5e5e5e] mt-3 uppercase tracking-widest font-black">
            System Version 4.0.2 - Security Protocol Active
          </p>
        </div>
      </section>
    </div>
  );
};

