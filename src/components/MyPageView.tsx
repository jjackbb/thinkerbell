import React, { useState } from 'react';
import { UserProfile, Story, Comment } from '../types';
import { RefreshCw, Check, ShieldCheck, LogOut, ChevronRight, User } from 'lucide-react';

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
    setSuccessMessage('닉네임이 성공적으로 변경되었습니다!');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-28">
      {/* Profile Banner */}
      <section className="bg-[#1C1C1C] text-white p-6 sm:p-8 rounded-lg border border-[#1C1C1C] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#3ECF8E] text-[#1C1C1C] flex items-center justify-center font-bold text-2xl">
              <User className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-[#3ECF8E]/20 text-[#3ECF8E] font-bold border border-[#3ECF8E]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED LOGICIAN
                </span>
                <span className="text-[#5f5e5e]">Joined 2024.03</span>
              </div>

              {isEditingNickname ? (
                <form onSubmit={handleSaveNickname} className="flex items-center gap-2 mt-2 font-mono">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    maxLength={12}
                    className="p-1.5 bg-[#f8f9fa] border border-[#E5E7EB] text-[#1C1C1C] rounded text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-[#3ECF8E] text-[#1C1C1C] rounded text-xs font-bold cursor-pointer"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={onGenerateRandomNickname}
                    className="p-1.5 bg-white/10 text-white rounded cursor-pointer"
                    title="랜덤 닉네임"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold font-headline-lg">{user.nickname}</h2>
                  <button
                    onClick={() => {
                      setNicknameInput(user.nickname);
                      setIsEditingNickname(true);
                    }}
                    className="font-mono text-xs text-[#3ECF8E] underline cursor-pointer"
                  >
                    EDIT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mt-4 p-2 bg-[#3ECF8E]/20 text-[#3ECF8E] font-mono text-xs font-bold rounded border border-[#3ECF8E]/30 flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMessage}
          </div>
        )}
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-lg flex flex-col justify-between">
          <span className="font-mono text-xs text-[#3ECF8E] font-bold">MY STORIES</span>
          <div>
            <p className="font-mono text-3xl font-bold text-[#1C1C1C] mt-2">{myStories.length}</p>
            <p className="text-xs text-[#5f5e5e] font-medium">내가 작성한 사연</p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-lg flex flex-col justify-between">
          <span className="font-mono text-xs text-[#3ECF8E] font-bold">VOTES PARTICIPATED</span>
          <div>
            <p className="font-mono text-3xl font-bold text-[#1C1C1C] mt-2">{myVotes.length}</p>
            <p className="text-xs text-[#5f5e5e] font-medium">참여한 투표 수</p>
          </div>
        </div>
      </section>

      {/* Activity Tabs */}
      <section className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-4">
        <div className="flex border-b border-[#E5E7EB] pb-3 gap-3 font-mono text-xs">
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'stories' ? 'bg-[#1C1C1C] text-[#3ECF8E]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
            }`}
          >
            작성 사연 ({myStories.length})
          </button>
          <button
            onClick={() => setActiveTab('votes')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'votes' ? 'bg-[#1C1C1C] text-[#3ECF8E]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
            }`}
          >
            참여 투표 ({myVotes.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'comments' ? 'bg-[#1C1C1C] text-[#3ECF8E]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
            }`}
          >
            작성 댓글 ({myComments.length})
          </button>
        </div>

        {/* Tab Items */}
        <div className="space-y-3">
          {activeTab === 'stories' && (
            myStories.length === 0 ? (
              <p className="text-center py-8 font-mono text-xs text-[#5f5e5e]">작성한 사연이 없습니다.</p>
            ) : (
              myStories.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectStory(s)}
                  className="bg-[#f3f4f5] hover:bg-white border border-[#E5E7EB] p-4 rounded-lg cursor-pointer transition-colors flex justify-between items-center"
                >
                  <div>
                    <span className="font-mono text-[10px] px-2 py-0.5 bg-[#3ECF8E]/20 text-[#006c45] font-bold rounded mr-2">
                      {s.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1C1C1C] inline">{s.title}</h4>
                    <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-1">{s.body}</p>
                  </div>
                  <span className="font-mono text-xs text-[#3ECF8E] font-bold whitespace-nowrap ml-3">
                    {s.votesA + s.votesB}표
                  </span>
                </div>
              ))
            )
          )}

          {activeTab === 'votes' && (
            myVotes.length === 0 ? (
              <p className="text-center py-8 font-mono text-xs text-[#5f5e5e]">참여한 투표가 없습니다.</p>
            ) : (
              myVotes.map((v, i) => (
                <div
                  key={i}
                  className="bg-[#f3f4f5] border border-[#E5E7EB] p-4 rounded-lg flex justify-between items-center"
                >
                  <p className="text-xs sm:text-sm font-bold text-[#1C1C1C] line-clamp-1 flex-1 pr-2">{v.title}</p>
                  <span className={`font-mono text-xs font-bold px-3 py-1 rounded ${
                    v.option === 'A' ? 'bg-[#3ECF8E] text-[#1C1C1C]' : 'bg-[#1C1C1C] text-white'
                  }`}>
                    {v.option === 'A' ? '내편 선택' : '상대편 선택'}
                  </span>
                </div>
              ))
            )
          )}

          {activeTab === 'comments' && (
            myComments.length === 0 ? (
              <p className="text-center py-8 font-mono text-xs text-[#5f5e5e]">작성한 댓글이 없습니다.</p>
            ) : (
              myComments.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#f3f4f5] border border-[#E5E7EB] p-4 rounded-lg space-y-1"
                >
                  <span className="font-mono text-[10px] text-[#3ECF8E] font-bold">{c.anonymousId}</span>
                  <p className="text-xs text-[#1C1C1C] font-medium leading-relaxed">{c.content}</p>
                </div>
              ))
            )
          )}
        </div>
      </section>

      {/* Settings List */}
      <section className="space-y-3">
        <button className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#3ECF8E] transition-colors font-bold text-sm text-[#1C1C1C]">
          <span>계정 설정 및 정보</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>
        <button className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#3ECF8E] transition-colors font-bold text-sm text-[#1C1C1C]">
          <span>알림 설정</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>
        <button className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#3ECF8E] transition-colors font-bold text-sm text-[#1C1C1C]">
          <span>도움말 및 문의</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>

        <div className="pt-4">
          <button className="w-full py-3.5 bg-[#1C1C1C] hover:bg-black text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4 text-[#3ECF8E]" />
            <span>로그아웃</span>
          </button>
        </div>
      </section>
    </div>
  );
};


