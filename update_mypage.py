import os

filepath = '/Users/b/Documents/Antigravity/thinkerbell/src/components/MyPageView.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Update viewMode state
content = content.replace(
    "const [viewMode, setViewMode] = useState<'summary' | 'more'>('summary');",
    "const [viewMode, setViewMode] = useState<'summary' | 'more' | 'account' | 'notifications' | 'support'>('summary');"
)

# 2. Update imports
content = content.replace(
    "import { RefreshCw, Check, ShieldCheck, LogOut, ChevronRight, User } from 'lucide-react';",
    "import { RefreshCw, Check, ShieldCheck, LogOut, ChevronRight, User, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';"
)

# 3. Add states for new components
new_states = """
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
"""
content = content.replace(
    "const [successMessage, setSuccessMessage] = useState<string | null>(null);",
    "const [successMessage, setSuccessMessage] = useState<string | null>(null);\n" + new_states
)

# 4. Insert Account, Notification, Support Views
new_views = """
  if (viewMode === 'account') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-28">
        <header className="flex items-center gap-3 py-4">
          <button onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
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
              <input type="password" placeholder="기존 비밀번호" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#3ECF8E]" />
              <input type="password" placeholder="새 비밀번호 (6자 이상)" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#3ECF8E]" />
              <input type="password" placeholder="새 비밀번호 확인" className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg font-bold text-[#1C1C1C] focus:outline-none focus:border-[#3ECF8E]" />
              <button className="w-full py-3 bg-[#1C1C1C] hover:bg-black text-[#3ECF8E] font-bold text-sm rounded-lg transition-colors cursor-pointer">
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
          <button onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
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
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${notifyBalanceGame ? 'bg-[#3ECF8E]' : 'bg-[#E5E7EB]'}`}
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
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${notifyVotes ? 'bg-[#3ECF8E]' : 'bg-[#E5E7EB]'}`}
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
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${notifyComments ? 'bg-[#3ECF8E]' : 'bg-[#E5E7EB]'}`}
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
          <button onClick={() => setViewMode('summary')} className="material-symbols-outlined text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity">
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
            className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg text-[#1C1C1C] focus:outline-none focus:border-[#3ECF8E] resize-none mb-4"
          />
          <button className="w-full py-3 bg-[#1C1C1C] hover:bg-black text-[#3ECF8E] font-bold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50" disabled={!inquiryText.trim()}>
            문의하기
          </button>
        </section>
      </div>
    );
  }
"""

content = content.replace(
    "// Summary View",
    new_views + "\n  // Summary View"
)

# 5. Replace "EDIT" text link with a Button
content = content.replace(
    """<button
                    onClick={() => {
                      setNicknameInput(user.nickname);
                      setIsEditingNickname(true);
                    }}
                    className="font-mono text-xs text-[#3ECF8E] underline cursor-pointer"
                  >
                    EDIT
                  </button>""",
    """<button
                    onClick={() => {
                      setNicknameInput(user.nickname);
                      setIsEditingNickname(true);
                    }}
                    className="px-4 py-1.5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#1C1C1C] rounded-lg font-mono text-xs font-bold transition-all cursor-pointer"
                  >
                    EDIT
                  </button>"""
)

# 6. Bind viewMode changes to Settings buttons
content = content.replace(
    """<button className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#3ECF8E] transition-colors font-bold text-sm text-[#1C1C1C]">
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
        </button>""",
    """<button onClick={() => setViewMode('account')} className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#3ECF8E] transition-colors font-bold text-sm text-[#1C1C1C] cursor-pointer">
          <span>계정 설정 및 정보</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>
        <button onClick={() => setViewMode('notifications')} className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#3ECF8E] transition-colors font-bold text-sm text-[#1C1C1C] cursor-pointer">
          <span>알림 설정</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>
        <button onClick={() => setViewMode('support')} className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#3ECF8E] transition-colors font-bold text-sm text-[#1C1C1C] cursor-pointer">
          <span>도움말 및 문의</span>
          <ChevronRight className="w-5 h-5 text-[#5f5e5e]" />
        </button>"""
)

with open(filepath, 'w') as f:
    f.write(content)
print("done")
