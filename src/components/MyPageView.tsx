import React, { useState } from 'react';
import { UserProfile, Story, Comment } from '../types';
import { RefreshCw, Check, ShieldCheck, LogOut, ChevronRight, User, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [viewMode, setViewMode] = useState<'summary' | 'more' | 'account' | 'notifications' | 'support'>('summary');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(user.nickname);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Settings States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  
  const [notifyBalanceGame, setNotifyBalanceGame] = useState(true);
  const [notifyVotes, setNotifyVotes] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);

  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [inquiryText, setInquiryText] = useState('');

  const faqs = [
    { q: '사연 등록은 어떻게 하나요?', a: '하단 + 버튼이나 피드 상단의 사연 등록 버튼을 눌러 작성하실 수 있습니다. 100% 익명으로 보장됩니다.' },
    { q: 'AI 페르소나는 어떻게 생성되나요?', a: '작성하신 사연 내용과 선택하신 상대방 성격 키워드를 바탕으로 최적화된 프롬프트가 자동 생성되어 AI에 주입됩니다.' },
    { q: '투표 결과는 누가 볼 수 있나요?', a: '사연을 열람하는 모든 유저가 실시간 투표 비율을 볼 수 있지만, 누가 어디에 투표했는지는 비공개입니다.' }
  ];


  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    onUpdateNickname(nicknameInput.trim());
    setIsEditingNickname(false);
    setSuccessMessage('닉네임이 성공적으로 변경되었습니다!');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleTabChange = (tab: 'stories' | 'votes' | 'comments') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const renderTabItems = (items: any[]) => {
    if (activeTab === 'stories') {
      if (items.length === 0) return <p className="text-center py-8 font-mono text-xs text-[#5f5e5e]">작성한 사연이 없습니다.</p>;
      return (items as Story[]).map((s) => (
        <div
          key={s.id}
          onClick={() => onSelectStory(s)}
          className="bg-[#f3f4f5] hover:bg-white border border-[#E5E7EB] p-4 rounded-lg cursor-pointer transition-colors flex justify-between items-center"
        >
          <div>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FF6B5A]/20 text-[#A32E1D] font-bold rounded mr-2">
              {s.category}
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-[#1C1C1C] inline">{s.title}</h4>
            <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-1">{s.body}</p>
          </div>
          <span className="font-mono text-xs text-[#FF6B5A] font-bold whitespace-nowrap ml-3">
            {s.votesA + s.votesB}표
          </span>
        </div>
      ));
    }
    
    if (activeTab === 'votes') {
      if (items.length === 0) return <p className="text-center py-8 font-mono text-xs text-[#5f5e5e]">참여한 투표가 없습니다.</p>;
      return items.map((v: any, i: number) => (
        <div
          key={i}
          className="bg-[#f3f4f5] border border-[#E5E7EB] p-4 rounded-lg flex justify-between items-center"
        >
          <p className="text-xs sm:text-sm font-bold text-[#1C1C1C] line-clamp-1 flex-1 pr-2">{v.title}</p>
          <span className={`font-mono text-xs font-bold px-3 py-1 rounded text-white ${
            v.option === 'A' ? 'bg-[#FF6B5A]' : 'bg-[#6C7BE8]'
          }`}>
            {v.option === 'A' ? '내 편' : '니 편'}
          </span>
        </div>
      ));
    }
    
    if (activeTab === 'comments') {
      if (items.length === 0) return <p className="text-center py-8 font-mono text-xs text-[#5f5e5e]">작성한 댓글이 없습니다.</p>;
      return (items as Comment[]).map((c) => (
        <div
          key={c.id}
          className="bg-[#f3f4f5] border border-[#E5E7EB] p-4 rounded-lg space-y-1"
        >
          <span className="font-mono text-[10px] text-[#FF6B5A] font-bold">{c.anonymousId}</span>
          <p className="text-xs text-[#1C1C1C] font-medium leading-relaxed">{c.content}</p>
        </div>
      ));
    }
    return null;
  };

  const currentList = activeTab === 'stories' ? myStories : activeTab === 'votes' ? myVotes : myComments;

  if (viewMode === 'more') {
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(currentList.length / itemsPerPage));
    const paginatedItems = currentList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-28">
        <header className="flex items-center gap-3 py-4">
          <button aria-label="요약 화면으로 돌아가기" onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
            arrow_back
          </button>
          <h2 className="text-lg font-bold font-headline-md">작성 활동 내역</h2>
        </header>

        <section className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-4">
          <div className="flex border-b border-[#E5E7EB] pb-3 gap-3 font-mono text-xs">
            <button
              onClick={() => handleTabChange('stories')}
              className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'stories' ? 'bg-[#1C1C1C] text-[#FF6B5A]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
              }`}
            >
              작성한 사연 ({myStories.length})
            </button>
            <button
              onClick={() => handleTabChange('votes')}
              className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'votes' ? 'bg-[#1C1C1C] text-[#FF6B5A]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
              }`}
            >
              참여한 투표 ({myVotes.length})
            </button>
            <button
              onClick={() => handleTabChange('comments')}
              className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'comments' ? 'bg-[#1C1C1C] text-[#FF6B5A]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
              }`}
            >
              작성한 댓글 ({myComments.length})
            </button>
          </div>

          <div className="space-y-3">
            {renderTabItems(paginatedItems)}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                    currentPage === i + 1 ? 'bg-[#1C1C1C] text-[#FF6B5A]' : 'bg-[#f3f4f5] text-[#5f5e5e] hover:bg-[#E5E7EB]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  
  if (viewMode === 'account') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-28">
        <header className="flex items-center gap-3 py-4">
          <button aria-label="요약 화면으로 돌아가기" onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
            arrow_back
          </button>
          <h2 className="text-lg font-bold font-headline-md">계정 설정 및 정보</h2>
        </header>
        <section className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-[#5f5e5e] mb-2">보안 처리된 이메일 계정</h3>
            <p className="text-[#1C1C1C] font-mono text-sm font-bold bg-[#f8f9fa] p-3 rounded-lg border border-[#E5E7EB]">
              a****@gmail.com
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#5f5e5e] mb-2">비밀번호 변경</h3>
            <div className="space-y-3">
              <input type="password" placeholder="기존 비밀번호" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A]" />
              <input type="password" placeholder="새 비밀번호 (6자 이상)" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A]" />
              <input type="password" placeholder="새 비밀번호 확인" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A]" />
              <button className="w-full py-3 bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] font-bold text-sm rounded-lg transition-colors cursor-pointer">
                비밀번호 변경
              </button>
            </div>
          </div>
          <div className="pt-6 border-t border-[#E5E7EB]">
            <button onClick={() => setShowDeleteModal(true)} className="w-full py-3 border border-red-200 text-red-500 hover:bg-red-50 font-bold text-sm rounded-lg transition-colors cursor-pointer">
              계정 탈퇴
            </button>
          </div>
        </section>

        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <div className="flex items-center gap-2 text-red-500 mb-4">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-lg font-bold">계정 탈퇴</h2>
              </div>
              <p className="text-xs text-[#5f5e5e] mb-4 leading-relaxed">
                탈퇴 시 모든 사연과 댓글, 활동 내역이 영구적으로 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까? (개인정보 처리 방침에 따라 30일 후 완전 파기됩니다.)
              </p>
              
              <div className="mb-6 space-y-2">
                <label className="text-xs font-bold text-[#1C1C1C]">탈퇴 사유 선택</label>
                <select 
                  value={deleteReason} 
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg text-[#1C1C1C] focus:outline-none focus:border-red-400"
                >
                  <option value="">사유를 선택해주세요</option>
                  <option value="1">서비스 이용이 불편함</option>
                  <option value="2">AI 대화 품질 불만족</option>
                  <option value="3">개인정보 보호 우려</option>
                  <option value="4">기타</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-[#f3f4f5] text-[#5f5e5e] hover:bg-[#E5E7EB] font-bold text-sm rounded-xl transition-colors cursor-pointer">
                  취소
                </button>
                <button className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50" disabled={!deleteReason}>
                  탈퇴하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'notifications') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-28">
        <header className="flex items-center gap-3 py-4">
          <button aria-label="요약 화면으로 돌아가기" onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
            arrow_back
          </button>
          <h2 className="text-lg font-bold font-headline-md">알림 설정</h2>
        </header>
        <section className="bg-white border border-[#E5E7EB] rounded-lg divide-y divide-[#E5E7EB]">
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-bold text-sm text-[#1C1C1C]">오늘의 밸런스 게임</h3>
              <p className="text-xs text-[#5f5e5e] mt-1">새로운 밸런스 게임이 등록될 때 알림을 받습니다.</p>
            </div>
            <button 
              onClick={() => setNotifyBalanceGame(!notifyBalanceGame)}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${notifyBalanceGame ? 'bg-[#FF6B5A]' : 'bg-[#E5E7EB]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifyBalanceGame ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-bold text-sm text-[#1C1C1C]">사연 투표 (10표 이상)</h3>
              <p className="text-xs text-[#5f5e5e] mt-1">내 사연에 10개 이상의 투표가 쌓이면 알림을 받습니다.</p>
            </div>
            <button 
              onClick={() => setNotifyVotes(!notifyVotes)}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${notifyVotes ? 'bg-[#FF6B5A]' : 'bg-[#E5E7EB]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifyVotes ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-bold text-sm text-[#1C1C1C]">새 댓글</h3>
              <p className="text-xs text-[#5f5e5e] mt-1">내 사연에 새로운 댓글이 달리면 알림을 받습니다.</p>
            </div>
            <button 
              onClick={() => setNotifyComments(!notifyComments)}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${notifyComments ? 'bg-[#FF6B5A]' : 'bg-[#E5E7EB]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifyComments ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (viewMode === 'support') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-28">
        <header className="flex items-center gap-3 py-4">
          <button aria-label="요약 화면으로 돌아가기" onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
            arrow_back
          </button>
          <h2 className="text-lg font-bold font-headline-md">도움말 및 문의</h2>
        </header>

        <section className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#E5E7EB] bg-[#f8f9fa]">
            <h3 className="font-bold text-sm text-[#1C1C1C]">자주 묻는 질문</h3>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button 
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 hover:bg-[#f8f9fa] transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold text-sm text-[#1C1C1C]">Q. {faq.q}</span>
                  {faqOpen === i ? <ChevronUp className="w-4 h-4 text-[#5f5e5e]" /> : <ChevronDown className="w-4 h-4 text-[#5f5e5e]" />}
                </button>
                {faqOpen === i && (
                  <div className="p-5 bg-[#f8f9fa] text-sm text-[#5f5e5e] leading-relaxed">
                    A. {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#E5E7EB] rounded-lg p-5 mt-6">
          <h3 className="font-bold text-sm text-[#1C1C1C] mb-4">1:1 문의 작성</h3>
          <textarea 
            value={inquiryText}
            onChange={(e) => setInquiryText(e.target.value)}
            placeholder="문의하실 내용을 상세히 적어주세요. (답변은 가입하신 이메일로 발송됩니다)"
            rows={5}
            className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A] resize-none mb-4"
          />
          <button className="w-full py-3 bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] font-bold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50" disabled={!inquiryText.trim()}>
            문의하기
          </button>
        </section>
      </div>
    );
  }

  // Summary View
  const summaryItems = currentList.slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-28">
      {/* Profile Banner */}
      <section className="bg-[#1C1C1C] text-white p-6 sm:p-8 rounded-lg border border-[#1C1C1C] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#FF6B5A] text-[#1C1C1C] flex items-center justify-center font-bold text-2xl">
              <User className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-[#FF6B5A]/20 text-[#FF6B5A] font-bold border border-[#FF6B5A]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
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
                    className="p-1.5 bg-[#FF6B5A] text-[#1C1C1C] rounded text-xs font-bold cursor-pointer"
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
                    className="px-4 py-1.5 bg-[#FF6B5A] hover:bg-[#FF6B5A]/90 text-[#1C1C1C] rounded-lg font-mono text-xs font-bold transition-all cursor-pointer"
                  >
                    EDIT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mt-4 p-2 bg-[#FF6B5A]/20 text-[#FF6B5A] font-mono text-xs font-bold rounded border border-[#FF6B5A]/30 flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMessage}
          </div>
        )}
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-lg flex flex-col justify-between">
          <span className="font-mono text-xs text-[#FF6B5A] font-bold">내 사연</span>
          <div>
            <p className="font-mono text-3xl font-bold text-[#1C1C1C] mt-2">{myStories.length}</p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-lg flex flex-col justify-between">
          <span className="font-mono text-xs text-[#FF6B5A] font-bold">참여한 투표 수</span>
          <div>
            <p className="font-mono text-3xl font-bold text-[#1C1C1C] mt-2">{myVotes.length}</p>
          </div>
        </div>
      </section>

      {/* Activity Tabs */}
      <section className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-4 relative">
        <div className="flex border-b border-[#E5E7EB] pb-3 gap-3 font-mono text-xs">
          <button
            onClick={() => handleTabChange('stories')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'stories' ? 'bg-[#1C1C1C] text-[#FF6B5A]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
            }`}
          >
            작성한 사연 ({myStories.length})
          </button>
          <button
            onClick={() => handleTabChange('votes')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'votes' ? 'bg-[#1C1C1C] text-[#FF6B5A]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
            }`}
          >
            참여한 투표 ({myVotes.length})
          </button>
          <button
            onClick={() => handleTabChange('comments')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'comments' ? 'bg-[#1C1C1C] text-[#FF6B5A]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
            }`}
          >
            작성한 댓글 ({myComments.length})
          </button>
        </div>

        <div className="space-y-3">
          {renderTabItems(summaryItems)}
        </div>

        {currentList.length > 3 && (
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setViewMode('more')}
              className="text-[#5f5e5e] hover:text-[#1C1C1C] font-mono text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              더보기 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* Settings List */}
      <section className="space-y-3">
        <button onClick={() => setViewMode('account')} className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#FF6B5A] transition-colors font-bold text-sm text-[#1C1C1C] cursor-pointer">
          <span>계정 설정 및 정보</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>
        <button onClick={() => setViewMode('notifications')} className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#FF6B5A] transition-colors font-bold text-sm text-[#1C1C1C] cursor-pointer">
          <span>알림 설정</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>
        <button onClick={() => setViewMode('support')} className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#FF6B5A] transition-colors font-bold text-sm text-[#1C1C1C] cursor-pointer">
          <span>도움말 및 문의</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>

        {/* 위기 상담은 어느 화면에서든 1~2번 터치로 닿아야 한다.
            깊은 메뉴에 묻어두면 정작 필요한 순간에 못 찾는다 */}
        <a
          href="tel:109"
          className="w-full flex items-center justify-between p-4 bg-white border border-[#FF6B5A] rounded-lg hover:bg-[#FF6B5A]/5 transition-colors cursor-pointer"
        >
          <span className="flex flex-col text-left">
            <span className="font-bold text-sm text-[#1C1C1C]">힘들 때 상담 전화</span>
            <span className="text-[11px] text-[#5f5e5e] font-normal">자살예방상담전화 · 24시간 익명</span>
          </span>
          <span className="font-mono text-lg font-bold text-[#D6452F]">109</span>
        </a>

        <div className="pt-4">
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full py-3.5 bg-[#1C1C1C] hover:bg-black text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#FF6B5A]" />
            <span>로그아웃</span>
          </button>
        </div>
      </section>
    </div>
  );
};


