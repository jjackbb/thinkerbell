import React, { useState, useEffect } from 'react';
import { UserProfile, Story, Comment } from '../types';
import { RefreshCw, Check, ShieldCheck, LogOut, ChevronRight, User, ChevronDown, ChevronUp, AlertTriangle, Trash2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkIsAdmin, fetchMyInquiries, submitInquiry, fetchAllInquiries, replyToInquiry, type Inquiry } from '../lib/inquiries';

interface MyPageViewProps {
  user: UserProfile;
  myStories: Story[];
  myVotes: { storyId: string; title: string; option: 'A' | 'B' }[];
  myComments: Comment[];
  onUpdateNickname: (nickname: string) => void;
  onGenerateRandomNickname: () => void;
  onSelectStory: (story: Story) => void;
  /** 지금 남아 있는 AI 대화방 수 */
  aiChatCount?: number;
  /** AI 대화 전체 삭제. 되돌릴 수 없다 */
  onDeleteAllAiChats?: () => Promise<void> | void;
  /**
   * 로그인 없이 둘러보는 중인가.
   *
   * 게스트에게는 계정에 딸린 것이 하나도 없다 — 이메일도, 사연도, 문의도.
   * 그 자리를 빈 껍데기로 남기면 "고장 났나?"로 읽히므로 아예 감춘다.
   */
  isGuest?: boolean;
  /**
   * 로그인하러 보내달라고 부모에게 부탁한다.
   *
   * 여기서 따로 모달을 띄우면 화면마다 다른 안내가 뜬다. 로그인 안내는
   * App.tsx 한 곳(LoginPromptModal)에서만 띄운다.
   */
  onRequireLogin?: (message: string) => void;
}

export const MyPageView: React.FC<MyPageViewProps> = ({
  user,
  myStories,
  myVotes,
  myComments,
  onUpdateNickname,
  onGenerateRandomNickname,
  onSelectStory,
  aiChatCount = 0,
  onDeleteAllAiChats,
  isGuest = false,
  onRequireLogin,
}) => {
  /** 되돌릴 수 없는 동작이라 한 번 더 묻는다 */
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [activeTab, setActiveTab] = useState<'stories' | 'votes' | 'comments'>('stories');
  const [viewMode, setViewMode] = useState<'summary' | 'more' | 'account' | 'notifications' | 'support' | 'inquiryAdmin'>('summary');
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
  const [inquirySending, setInquirySending] = useState(false);
  const [inquiryDone, setInquiryDone] = useState(false);
  const [myInquiries, setMyInquiries] = useState<Inquiry[]>([]);

  /** 운영자에게만 '문의 관리' 메뉴가 보인다 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  /** 로그인한 계정의 이메일. 화면에는 가려서 보여준다 */
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  /* successMessage는 요약 화면에서만 렌더된다. 이 화면에서 성공을 알리려면
     폼 안에 따로 두어야 한다 — 없으면 눌러도 아무 반응 없는 것처럼 보인다 */
  const [pwDone, setPwDone] = useState(false);

  const [deleting, setDeleting] = useState(false);

  /**
   * 이메일 가리기.
   *
   * 예전에는 'a****@gmail.com'이 코드에 박혀 있어서, 누가 로그인하든 그 문자열이
   * 떴다. 내 계정이 맞는지 확인하려고 보는 화면인데 남의 주소가 보이는 셈이었다.
   */
  const maskEmail = (email: string): string => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const head = local.slice(0, 1);
    return `${head}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
  };

  // 알림 설정은 계정에 붙여 둔다. 그래야 기기를 바꿔도 따라온다.
  useEffect(() => {
    // 계정이 없는 사람의 정보를 물어볼 곳은 없다. 물어봐야 빈손이고 콘솔만 더러워진다
    if (isGuest) return;
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) return;
      setAccountEmail(u.email ?? null);
      const n = (u.user_metadata ?? {}) as Record<string, unknown>;
      if (typeof n.notifyBalanceGame === 'boolean') setNotifyBalanceGame(n.notifyBalanceGame);
      if (typeof n.notifyVotes === 'boolean') setNotifyVotes(n.notifyVotes);
      if (typeof n.notifyComments === 'boolean') setNotifyComments(n.notifyComments);
    });
  }, [isGuest]);

  useEffect(() => {
    if (isGuest) return;
    checkIsAdmin().then(setIsAdmin);
  }, [isGuest]);

  // 문의 화면에 들어올 때마다 최신 답변을 받아온다
  useEffect(() => {
    if (isGuest) return;
    if (viewMode === 'support') fetchMyInquiries().then(setMyInquiries);
    if (viewMode === 'inquiryAdmin') fetchAllInquiries().then(setAllInquiries);
  }, [viewMode, isGuest]);

  /** 토글을 누르면 화면을 먼저 바꾸고 계정에도 저장한다 */
  const saveNotify = (patch: Record<string, boolean>) => {
    supabase.auth.updateUser({ data: patch });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwDone(false);

    if (pwNext.length < 6) { setPwError('새 비밀번호는 6자 이상이어야 합니다.'); return; }
    if (pwNext !== pwConfirm) { setPwError('새 비밀번호가 서로 다릅니다.'); return; }
    if (!accountEmail) { setPwError('계정 정보를 불러오지 못했습니다.'); return; }

    setPwBusy(true);
    // 세션만 있으면 비밀번호를 바꿀 수 있지만, 자리를 비운 사이 남이 바꾸는 걸 막으려면
    // 기존 비밀번호를 한 번 확인해야 한다.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: accountEmail,
      password: pwCurrent,
    });
    if (authError) {
      setPwBusy(false);
      setPwError('기존 비밀번호가 맞지 않습니다.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pwNext });
    setPwBusy(false);
    if (error) { setPwError(error.message); return; }

    setPwCurrent(''); setPwNext(''); setPwConfirm('');
    setPwDone(true);
    setTimeout(() => setPwDone(false), 4000);
  };

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

  /*
    게스트 화면.

    훅은 전부 이 위에 모여 있으므로 여기서 갈라져도 호출 순서가 흔들리지 않는다.
    아래의 viewMode별 화면은 전부 계정이 있어야 성립하는 것들이라, 섹션마다
    조건을 다는 대신 여기서 한 번에 갈라놓는다 — 로그인한 사람이 보는 코드에는
    손대지 않는 편이 회귀가 없다.

    닉네임은 쓰지 않는다. 게스트에게도 임시 닉네임이 들어 있지만 그건 계정에
    저장된 적 없는 값이라, 자기 이름인 것처럼 보이면 안 된다.
  */
  if (isGuest) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-28">
        <section className="bg-[#1C1C1C] text-white p-6 sm:p-8 rounded-lg border border-[#1C1C1C]">
          <div className="w-12 h-12 rounded-full bg-[#FF6B5A]/20 border border-[#FF6B5A]/30 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-[#FF6B5A]" aria-hidden="true" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-headline-lg">로그인이 필요합니다</h2>
          <p className="text-xs text-white/70 leading-relaxed mt-2">
            지금은 로그인 없이 둘러보는 중이에요. 내 활동은 로그인한 뒤부터 쌓입니다.
          </p>

          <ul className="mt-5 space-y-2.5">
            {[
              '내 사연을 올리고 사람들에게 편을 물어보기',
              '사연 전체 내용을 읽고 내 편·니 편에 투표하기',
              '댓글과 공감 남기기',
              'AI 상대와 대화하고 다음에 이어서 하기',
            ].map((text) => (
              <li key={text} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#FF6B5A] mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm text-white/90 leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => onRequireLogin?.('로그인하면 사연 등록과 투표, 댓글, AI 대화를 모두 이용하실 수 있어요.')}
            className="w-full mt-6 py-3.5 bg-[#FF6B5A] hover:bg-[#FF6B5A]/90 text-[#1C1C1C] font-bold text-sm rounded-lg transition-colors cursor-pointer"
          >
            로그인 하러가기
          </button>
        </section>

        {/* 서비스가 뭔지는 로그인 전에도 알아볼 수 있어야 한다 */}
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

        {/* 위기 상담은 로그인 여부와 상관없이 닿아야 한다. 계정이 없다고 막을 것이 아니다 */}
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
      </div>
    );
  }

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
              {accountEmail ? maskEmail(accountEmail) : '불러오는 중…'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#5f5e5e] mb-2">비밀번호 변경</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input type="password" autoComplete="current-password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="기존 비밀번호" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A]" />
              <input type="password" autoComplete="new-password" value={pwNext} onChange={e => setPwNext(e.target.value)} placeholder="새 비밀번호 (6자 이상)" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A]" />
              <input type="password" autoComplete="new-password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="새 비밀번호 확인" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A]" />
              {pwError && <p className="text-xs text-[#A32E1D] font-bold">{pwError}</p>}
              {pwDone && (
                <p className="text-xs text-[#1C1C1C] font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#FF6B5A]" aria-hidden="true" /> 비밀번호를 변경했습니다.
                </p>
              )}
              <button
                type="submit"
                disabled={pwBusy || !pwCurrent || !pwNext || !pwConfirm}
                className="w-full py-3 bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] font-bold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pwBusy ? '변경하는 중…' : '비밀번호 변경'}
              </button>
            </form>
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
                탈퇴하면 작성하신 사연과 댓글, 투표, AI 대화가 즉시 삭제됩니다. 되돌릴 수 없습니다. 내 사연에 달린 다른 분들의 댓글과 투표도 함께 사라집니다.
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
                <button
                  onClick={async () => {
                    setDeleting(true);
                    const { error } = await supabase.rpc('delete_my_account');
                    if (error) {
                      setDeleting(false);
                      setSuccessMessage(null);
                      alert('탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
                      return;
                    }
                    await supabase.auth.signOut();
                  }}
                  disabled={!deleteReason || deleting}
                  className="flex-1 py-3 bg-[#A32E1D] hover:bg-[#8d2718] text-white font-bold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting ? '처리 중…' : '탈퇴하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'inquiryAdmin') {
    const waiting = allInquiries.filter(q => !q.reply);
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-28">
        <header className="flex items-center gap-3 py-4">
          <button aria-label="요약 화면으로 돌아가기" onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
            arrow_back
          </button>
          <h2 className="text-lg font-bold font-headline-md">문의 관리</h2>
          {waiting.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-[#FF6B5A] text-white text-[11px] font-bold">
              답변 대기 {waiting.length}
            </span>
          )}
        </header>

        {allInquiries.length === 0 ? (
          <section className="bg-white border border-dashed border-[#E5E7EB] rounded-lg p-10 text-center">
            <p className="text-sm text-[#5f5e5e]">들어온 문의가 없습니다.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {allInquiries.map(q => (
              <div key={q.id} className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#5f5e5e]">
                    {new Date(q.createdAt).toLocaleString('ko-KR')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    q.reply ? 'bg-[#f3f4f5] text-[#5f5e5e]' : 'bg-[#FF6B5A]/10 text-[#D6452F]'
                  }`}>
                    {q.reply ? '답변 완료' : '답변 대기'}
                  </span>
                </div>

                <p className="text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap">{q.content}</p>

                {q.reply ? (
                  <div className="pt-3 border-t border-[#E5E7EB]">
                    <p className="text-[11px] font-bold text-[#D6452F] mb-1">보낸 답변</p>
                    <p className="text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap">{q.reply}</p>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
                    <textarea
                      value={replyDraft[q.id] ?? ''}
                      onChange={e => setReplyDraft(d => ({ ...d, [q.id]: e.target.value }))}
                      rows={3}
                      placeholder="답변을 적어주세요."
                      className="w-full p-3 text-xs bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A] resize-none"
                    />
                    <button
                      onClick={async () => {
                        const text = (replyDraft[q.id] ?? '').trim();
                        if (!text) return;
                        setReplyingId(q.id);
                        const ok = await replyToInquiry(q.id, text);
                        setReplyingId(null);
                        if (!ok) { alert('답변을 저장하지 못했습니다.'); return; }
                        setReplyDraft(d => ({ ...d, [q.id]: '' }));
                        fetchAllInquiries().then(setAllInquiries);
                      }}
                      disabled={!(replyDraft[q.id] ?? '').trim() || replyingId === q.id}
                      className="w-full py-2.5 bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {replyingId === q.id ? '보내는 중…' : '답변 보내기'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
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
              onClick={() => { const v = !notifyBalanceGame; setNotifyBalanceGame(v); saveNotify({ notifyBalanceGame: v }); }}
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
              onClick={() => { const v = !notifyVotes; setNotifyVotes(v); saveNotify({ notifyVotes: v }); }}
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
              onClick={() => { const v = !notifyComments; setNotifyComments(v); saveNotify({ notifyComments: v }); }}
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
            placeholder="문의하실 내용을 상세히 적어주세요. 답변은 아래 '내 문의 내역'에서 확인하실 수 있습니다."
            rows={5}
            className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg text-[#1C1C1C] focus:outline-none focus:border-[#FF6B5A] resize-none mb-4"
          />
          <button
            onClick={async () => {
              setInquirySending(true);
              const { data: sess } = await supabase.auth.getUser();
              const uid = sess?.user?.id;
              if (!uid) { setInquirySending(false); return; }
              const ok = await submitInquiry(uid, inquiryText.trim());
              setInquirySending(false);
              if (!ok) { alert('문의를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'); return; }
              setInquiryText('');
              setInquiryDone(true);
              setTimeout(() => setInquiryDone(false), 4000);
              fetchMyInquiries().then(setMyInquiries);
            }}
            disabled={!inquiryText.trim() || inquirySending}
            className="w-full py-3 bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] font-bold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {inquirySending ? '보내는 중…' : '문의하기'}
          </button>
          {inquiryDone && (
            <p className="text-xs text-[#1C1C1C] font-bold flex items-center gap-1.5 mt-3">
              <Check className="w-3.5 h-3.5 text-[#FF6B5A]" aria-hidden="true" /> 문의가 접수되었습니다.
            </p>
          )}
        </section>

        {/* 보낸 뒤 아무것도 안 보이면 접수됐는지 알 수 없다. 답변도 여기서 받는다 */}
        {myInquiries.length > 0 && (
          <section className="bg-white border border-[#E5E7EB] rounded-lg p-5 mt-6 space-y-4">
            <h3 className="font-bold text-sm text-[#1C1C1C]">내 문의 내역</h3>
            {myInquiries.map(q => (
              <div key={q.id} className="border border-[#E5E7EB] rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#5f5e5e]">
                    {new Date(q.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    q.reply ? 'bg-[#FF6B5A]/10 text-[#D6452F]' : 'bg-[#f3f4f5] text-[#5f5e5e]'
                  }`}>
                    {q.reply ? '답변 완료' : '답변 대기'}
                  </span>
                </div>
                <p className="text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap">{q.content}</p>
                {q.reply && (
                  <div className="mt-2 pt-3 border-t border-[#E5E7EB]">
                    <p className="text-[11px] font-bold text-[#D6452F] mb-1">운영자 답변</p>
                    <p className="text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap">{q.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
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

        {/* 운영자에게만 보인다. 권한은 admins 테이블로 판정한다 */}
        {isAdmin && (
          <button onClick={() => setViewMode('inquiryAdmin')} className="w-full flex items-center justify-between p-4 bg-[#1C1C1C] border border-[#1C1C1C] rounded-lg hover:opacity-90 transition-opacity font-bold text-sm text-white cursor-pointer">
            <span>문의 관리 <span className="text-[#FF6B5A]">(운영자)</span></span>
            <ChevronRight className="w-5 h-5 text-[#FF6B5A]" />
          </button>
        )}

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

        {/*
          털어놓은 이야기를 한 번에 없앨 수 있어야 한다. 대화방을 하나씩 지우게 하면
          정작 급할 때 다 못 지운다. 되돌릴 수 없으므로 확인을 한 단계 둔다.
        */}
        {onDeleteAllAiChats && (
          <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg space-y-3">
            <div className="flex items-start gap-2.5">
              <Trash2 className="w-4 h-4 text-[#A32E1D] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="text-left">
                <p className="font-bold text-sm text-[#1C1C1C]">AI 대화 전체 삭제</p>
                <p className="text-[11px] text-[#5f5e5e] leading-relaxed mt-0.5">
                  {aiChatCount > 0
                    ? `지금 ${aiChatCount}개의 대화가 있어요. 지우면 되돌릴 수 없습니다.`
                    : '지울 대화가 없어요.'}
                </p>
                {/* 자동 삭제는 예고 없이 일어나면 안 된다. 정책을 눈에 보이는 곳에 적어둔다 */}
                <p className="text-[11px] text-[#5f5e5e] leading-relaxed mt-1.5">
                  마지막으로 대화한 지 <span className="font-bold text-[#1C1C1C]">6개월</span>이 지난 대화방은
                  자동으로 지워집니다.
                </p>
              </div>
            </div>

            {aiChatCount > 0 && (
              confirmWipe ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmWipe(false)}
                    disabled={wiping}
                    className="flex-1 py-2.5 border border-[#E5E7EB] text-[#5f5e5e] font-bold text-xs rounded-lg hover:bg-[#f3f4f5] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    그만두기
                  </button>
                  <button
                    onClick={async () => {
                      setWiping(true);
                      await onDeleteAllAiChats();
                      setWiping(false);
                      setConfirmWipe(false);
                    }}
                    disabled={wiping}
                    className="flex-1 py-2.5 bg-[#A32E1D] text-white font-bold text-xs rounded-lg hover:bg-[#8d2718] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {wiping ? '지우는 중…' : '정말 전부 지우기'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmWipe(true)}
                  className="w-full py-2.5 border border-[#A32E1D] text-[#A32E1D] font-bold text-xs rounded-lg hover:bg-[#A32E1D]/5 transition-colors cursor-pointer"
                >
                  전부 지우기
                </button>
              )
            )}
          </div>
        )}

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


