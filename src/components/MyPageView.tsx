import React, { useState } from 'react';
import { UserProfile, Story, Comment } from '../types';
import { User, Sparkles, MessageSquare, ThumbsUp, LogIn, RefreshCw, ShieldCheck, Check } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Profile Header Card */}
      <div className="bg-[#f5f0e0] border border-[#e8e2d0] rounded-3xl p-6 shadow-xs relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-2xl shadow-md transform -rotate-3">
              <User className="w-8 h-8 text-[#ff4d8b]" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ff4d8b] text-white text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% 익명 회원
                </span>
                <span className="text-xs text-[#6a6a6a]">가입일: {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>

              {isEditingNickname ? (
                <form onSubmit={handleSaveNickname} className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    maxLength={10}
                    className="p-2 text-xs font-bold bg-[#fffaf0] border border-[#e8e2d0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#0a0a0a] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={onGenerateRandomNickname}
                    className="p-2 bg-[#b8a4ed] text-[#0a0a0a] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="랜덤 닉네임 생성"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-[#0a0a0a] font-display">
                    {user.nickname}
                  </h2>
                  <button
                    onClick={() => {
                      setNicknameInput(user.nickname);
                      setIsEditingNickname(true);
                    }}
                    className="text-xs text-[#6a6a6a] underline hover:text-[#0a0a0a] cursor-pointer"
                  >
                    변경
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Social Provider Badge */}
          <div className="flex items-center gap-2 bg-[#fffaf0] px-4 py-2 rounded-2xl border border-[#e8e2d0]">
            <LogIn className="w-4 h-4 text-[#ff4d8b]" />
            <span className="text-xs font-bold text-[#0a0a0a]">
              {user.socialProvider ? `${user.socialProvider.toUpperCase()} 인증` : '간편 소셜 연동'}
            </span>
          </div>
        </div>

        {successMessage && (
          <div className="mt-4 p-2 bg-[#0a0a0a] text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1">
            <Check className="w-4 h-4 text-[#ff4d8b]" /> {successMessage}
          </div>
        )}
      </div>

      {/* Activity Tabs */}
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl p-5 shadow-xs">
        <div className="flex border-b border-[#ebe6d6] pb-3 mb-4 gap-2">
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stories'
                ? 'bg-[#0a0a0a] text-white shadow-xs'
                : 'bg-[#f5f0e0] text-[#6a6a6a] hover:text-[#0a0a0a]'
            }`}
          >
            내가 쓴 사연 ({myStories.length})
          </button>

          <button
            onClick={() => setActiveTab('votes')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'votes'
                ? 'bg-[#0a0a0a] text-white shadow-xs'
                : 'bg-[#f5f0e0] text-[#6a6a6a] hover:text-[#0a0a0a]'
            }`}
          >
            참여한 투표 ({myVotes.length})
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-[#0a0a0a] text-white shadow-xs'
                : 'bg-[#f5f0e0] text-[#6a6a6a] hover:text-[#0a0a0a]'
            }`}
          >
            남긴 댓글 ({myComments.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {activeTab === 'stories' && (
            myStories.length === 0 ? (
              <p className="text-center py-8 text-xs text-[#6a6a6a]">아직 작성한 익명 사연이 없습니다.</p>
            ) : (
              myStories.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectStory(s)}
                  className="p-4 bg-[#f5f0e0] border border-[#e8e2d0] rounded-2xl hover:bg-[#ebe6d6] transition-colors cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff4d8b] text-white mr-2">
                      {s.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-[#0a0a0a] inline">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-[#6a6a6a] mt-1 line-clamp-1">
                      {s.body}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#1a3a3a] whitespace-nowrap ml-2">
                    {s.votesA + s.votesB}표 참여
                  </span>
                </div>
              ))
            )
          )}

          {activeTab === 'votes' && (
            myVotes.length === 0 ? (
              <p className="text-center py-8 text-xs text-[#6a6a6a]">아직 참여한 투표가 없습니다.</p>
            ) : (
              myVotes.map((v, i) => (
                <div
                  key={i}
                  className="p-4 bg-[#f5f0e0] border border-[#e8e2d0] rounded-2xl flex justify-between items-center"
                >
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] line-clamp-1">
                    {v.title}
                  </p>
                  <span className={`text-xs font-black px-3 py-1 rounded-xl whitespace-nowrap ${
                    v.option === 'A' ? 'bg-[#ff4d8b] text-white' : 'bg-[#1a3a3a] text-white'
                  }`}>
                    {v.option === 'A' ? '내편 선택' : '상대편 선택'}
                  </span>
                </div>
              ))
            )
          )}

          {activeTab === 'comments' && (
            myComments.length === 0 ? (
              <p className="text-center py-8 text-xs text-[#6a6a6a]">아직 작성한 댓글이 없습니다.</p>
            ) : (
              myComments.map((c) => (
                <div
                  key={c.id}
                  className="p-4 bg-[#f5f0e0] border border-[#e8e2d0] rounded-2xl space-y-1"
                >
                  <span className="text-[10px] font-bold text-[#6a6a6a]">{c.anonymousId}</span>
                  <p className="text-xs text-[#3a3a3a] font-medium leading-relaxed">{c.content}</p>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
