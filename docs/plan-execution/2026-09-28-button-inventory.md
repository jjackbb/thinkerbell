# 버튼 정적 위치 목록 — 2026-09-28

[PLAN.md](../../PLAN.md)의 버튼 계약을 완성하기 위한 **코드 위치 점검표**다. 현재 TSX에서 직접 선언한 `<button>` 164곳을 TypeScript AST로 추출했다. 조건부·반복 렌더링과 실제 화면 노출·작동은 아직 확인하지 않았고, 같은 줄 수가 안정적인 버튼 ID를 뜻하지 않는다. `onClick`이 없는 버튼은 폼 제출이나 상위 이벤트에서 동작할 수 있다. 이 목록만으로 기능·GA4·권한 검증이 완료된 것은 아니다.

| 번호 | 코드 위치 | 정적 문구/접근성 이름 | 동작 연결(정적 코드) |
| ---: | --- | --- | --- |
| 1 | [frontend/src/App.tsx:1524](../../frontend/src/App.tsx) | 다시 시도 | `{() => setHiddenStoriesLoadNonce(n => n + 1)}` |
| 2 | [frontend/src/App.tsx:1557](../../frontend/src/App.tsx) | (동적 JSX/아이콘) | `{() => setSelectedCategory(cat)}` |
| 3 | [frontend/src/App.tsx:1573](../../frontend/src/App.tsx) | 최신순 | `{() => setSortBy('latest')}` |
| 4 | [frontend/src/App.tsx:1583](../../frontend/src/App.tsx) | HOT | `{() => setSortBy('votes')}` |
| 5 | [frontend/src/App.tsx:1605](../../frontend/src/App.tsx) | 사연 등록하기 | `{openCreateStory}` |
| 6 | [frontend/src/App.tsx:1757](../../frontend/src/App.tsx) | 사연 올리기 | `{openCreateStory}` |
| 7 | [frontend/src/App.tsx:1768](../../frontend/src/App.tsx) | "익명 사연 쓰기" "익명 사연 쓰기" | `{openCreateStory}` |
| 8 | [frontend/src/App.tsx:1825](../../frontend/src/App.tsx) | 취소 | `{() => setAppealTargetId(null)}` |
| 9 | [frontend/src/App.tsx:1831](../../frontend/src/App.tsx) | 제출하기 | `{() => { const el = document.getElementById('appeal-text') as HTMLTextAreaElement \| null; const text = el?.va` |
| 10 | [frontend/src/App.tsx:1969](../../frontend/src/App.tsx) | 되돌리기 | `{() => void handleRestoreStory(undoHiddenStoryId)}` |
| 11 | [frontend/src/components/AIChatModeSelectionModal.tsx:47](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | `{() => setStep('mode')}` |
| 12 | [frontend/src/components/AIChatModeSelectionModal.tsx:55](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | `{onClose}` |
| 13 | [frontend/src/components/AIChatModeSelectionModal.tsx:64](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | `{() => { track('ai_mode_select', { mode: 'simulation' }); setStep('opening'); }}` |
| 14 | [frontend/src/components/AIChatModeSelectionModal.tsx:79](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | `{() => { track('ai_mode_select', { mode: 'explanation' }); onSelectMode('explanation'); }}` |
| 15 | [frontend/src/components/AIChatModeSelectionModal.tsx:104](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | `{() => onSelectMode('simulation', o.id)}` |
| 16 | [frontend/src/components/AIChatView.tsx:452](../../frontend/src/components/AIChatView.tsx) | 사연 보러 가기 | `{onGoToFeed}` |
| 17 | [frontend/src/components/AIChatView.tsx:485](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | `{(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === persona.id ? null : persona.id); }}` |
| 18 | [frontend/src/components/AIChatView.tsx:504](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | `{(e) => { e.stopPropagation(); setOpenMenuId(null); onTogglePinPersona(persona.id); }}` |
| 19 | [frontend/src/components/AIChatView.tsx:509](../../frontend/src/components/AIChatView.tsx) | 오류 신고 | `{(e) => { e.stopPropagation(); setOpenMenuId(null); onReportErrorPersona(persona.id); }}` |
| 20 | [frontend/src/components/AIChatView.tsx:514](../../frontend/src/components/AIChatView.tsx) | 삭제 | `{(e) => { e.stopPropagation(); setOpenMenuId(null); onDeletePersona(persona.id); }}` |
| 21 | [frontend/src/components/AIChatView.tsx:538](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | `{(e) => { e.stopPropagation(); openPersona(persona); }}` |
| 22 | [frontend/src/components/AIChatView.tsx:568](../../frontend/src/components/AIChatView.tsx) | "대화창 나가기" arrow_back | `{handleLeave}` |
| 23 | [frontend/src/components/AIChatView.tsx:584](../../frontend/src/components/AIChatView.tsx) | "공감 비율 설정 변경" "공감 비율 설정 변경" settings | `{onOpenSettings}` |
| 24 | [frontend/src/components/AIChatView.tsx:588](../../frontend/src/components/AIChatView.tsx) | "대화 끝내기" close | `{() => (notStartedYet ? setShowExitChoice(true) : setShowDeleteModal(true))}` |
| 25 | [frontend/src/components/AIChatView.tsx:644](../../frontend/src/components/AIChatView.tsx) | 다시 보내기 | `{() => { void sendMessage(failedText, true); }}` |
| 26 | [frontend/src/components/AIChatView.tsx:695](../../frontend/src/components/AIChatView.tsx) | 🤝 화해로 끝내기 | `{() => setSimEndResult('success')}` |
| 27 | [frontend/src/components/AIChatView.tsx:702](../../frontend/src/components/AIChatView.tsx) | ⚡ 결렬로 끝내기 | `{() => setSimEndResult('fail')}` |
| 28 | [frontend/src/components/AIChatView.tsx:739](../../frontend/src/components/AIChatView.tsx) | 로그인하고 대화 이어가기 | `{() => onRequireLogin('AI와 대화를 이어가려면 로그인이 필요해요.')}` |
| 29 | [frontend/src/components/AIChatView.tsx:755](../../frontend/src/components/AIChatView.tsx) | 다시 저장 | `{retrySave}` |
| 30 | [frontend/src/components/AIChatView.tsx:766](../../frontend/src/components/AIChatView.tsx) | 보내기 | `(form submit 또는 상위 핸들러)` |
| 31 | [frontend/src/components/AIChatView.tsx:785](../../frontend/src/components/AIChatView.tsx) | "취소" | `{() => setShowExitChoice(false)}` |
| 32 | [frontend/src/components/AIChatView.tsx:804](../../frontend/src/components/AIChatView.tsx) | 남겨두고 닫기 | `{keepAndClose}` |
| 33 | [frontend/src/components/AIChatView.tsx:810](../../frontend/src/components/AIChatView.tsx) | 대화 삭제하고 닫기 | `{discardAndClose}` |
| 34 | [frontend/src/components/AIChatView.tsx:829](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | `{() => setShowDeleteModal(false)}` |
| 35 | [frontend/src/components/AIChatView.tsx:838](../../frontend/src/components/AIChatView.tsx) | 취소 | `{() => setShowDeleteModal(false)}` |
| 36 | [frontend/src/components/AIChatView.tsx:844](../../frontend/src/components/AIChatView.tsx) | 삭제 | `{confirmEndChat}` |
| 37 | [frontend/src/components/AIErrorReportModal.tsx:30](../../frontend/src/components/AIErrorReportModal.tsx) | (동적 JSX/아이콘) | `{onClose}` |
| 38 | [frontend/src/components/AIErrorReportModal.tsx:52](../../frontend/src/components/AIErrorReportModal.tsx) | 취소 | `{onClose}` |
| 39 | [frontend/src/components/AIErrorReportModal.tsx:59](../../frontend/src/components/AIErrorReportModal.tsx) | 신고 접수 | `(form submit 또는 상위 핸들러)` |
| 40 | [frontend/src/components/AIExplainSettingsModal.tsx:29](../../frontend/src/components/AIExplainSettingsModal.tsx) | (동적 JSX/아이콘) | `{onClose}` |
| 41 | [frontend/src/components/AIExplainSettingsModal.tsx:89](../../frontend/src/components/AIExplainSettingsModal.tsx) | 확인 | `{() => onConfirm(ratio)}` |
| 42 | [frontend/src/components/AdultVerificationModal.tsx:20](../../frontend/src/components/AdultVerificationModal.tsx) | (동적 JSX/아이콘) | `{onClose}` |
| 43 | [frontend/src/components/AdultVerificationModal.tsx:43](../../frontend/src/components/AdultVerificationModal.tsx) | 간편 성인 인증하기 | `{() => { onVerify(); onClose(); }}` |
| 44 | [frontend/src/components/AnalyticsConsent.tsx:20](../../frontend/src/components/AnalyticsConsent.tsx) | 거부 | `{() => setAnalyticsConsent('refused')}` |
| 45 | [frontend/src/components/AnalyticsConsent.tsx:21](../../frontend/src/components/AnalyticsConsent.tsx) | 동의 | `{() => setAnalyticsConsent('accepted')}` |
| 46 | [frontend/src/components/AnalyticsConsent.tsx:40](../../frontend/src/components/AnalyticsConsent.tsx) | (동적 JSX/아이콘) | `{() => setAnalyticsConsent('refused')}` |
| 47 | [frontend/src/components/AnalyticsConsent.tsx:41](../../frontend/src/components/AnalyticsConsent.tsx) | 동의 | `{() => setAnalyticsConsent('accepted')}` |
| 48 | [frontend/src/components/BalanceGameSection.tsx:253](../../frontend/src/components/BalanceGameSection.tsx) | "이전 배너 보기" | `{handlePrev}` |
| 49 | [frontend/src/components/BalanceGameSection.tsx:260](../../frontend/src/components/BalanceGameSection.tsx) | "다음 배너 보기" | `{handleNext}` |
| 50 | [frontend/src/components/BalanceGameSection.tsx:291](../../frontend/src/components/BalanceGameSection.tsx) | 다시 불러오기 | `{() => void loadState()}` |
| 51 | [frontend/src/components/BalanceGameSection.tsx:313](../../frontend/src/components/BalanceGameSection.tsx) | (동적 JSX/아이콘) | `{() => handleVote(game.id, 'B')}` |
| 52 | [frontend/src/components/BalanceGameSection.tsx:324](../../frontend/src/components/BalanceGameSection.tsx) | (동적 JSX/아이콘) | `{() => handleVote(game.id, 'A')}` |
| 53 | [frontend/src/components/CreateStoryModal.tsx:115](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | `{onClose}` |
| 54 | [frontend/src/components/CreateStoryModal.tsx:137](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | `{() => setCategory(cat)}` |
| 55 | [frontend/src/components/CreateStoryModal.tsx:232](../../frontend/src/components/CreateStoryModal.tsx) | 취소 | `{onClose}` |
| 56 | [frontend/src/components/CreateStoryModal.tsx:239](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | `(form submit 또는 상위 핸들러)` |
| 57 | [frontend/src/components/CrisisSupportModal.tsx:87](../../frontend/src/components/CrisisSupportModal.tsx) | (동적 JSX/아이콘) | `{onContinue}` |
| 58 | [frontend/src/components/CrisisSupportModal.tsx:94](../../frontend/src/components/CrisisSupportModal.tsx) | 닫기 | `{onClose}` |
| 59 | [frontend/src/components/DeleteConfirmModal.tsx:26](../../frontend/src/components/DeleteConfirmModal.tsx) | 취소 | `{onClose}` |
| 60 | [frontend/src/components/DeleteConfirmModal.tsx:33](../../frontend/src/components/DeleteConfirmModal.tsx) | (동적 JSX/아이콘) | `{onConfirm}` |
| 61 | [frontend/src/components/Header.tsx:59](../../frontend/src/components/Header.tsx) | "사연 등록" | `{onOpenCreateStory}` |
| 62 | [frontend/src/components/Header.tsx:73](../../frontend/src/components/Header.tsx) | {`내 계정 (${user.nickname})`} | `{onOpenProfile}` |
| 63 | [frontend/src/components/LoginPromptModal.tsx:30](../../frontend/src/components/LoginPromptModal.tsx) | 로그인 하러가기 | `{onGoToLogin}` |
| 64 | [frontend/src/components/LoginPromptModal.tsx:36](../../frontend/src/components/LoginPromptModal.tsx) | 더 둘러볼게요 | `{onClose}` |
| 65 | [frontend/src/components/MyPageView.tsx:326](../../frontend/src/components/MyPageView.tsx) | 로그인 하러가기 | `{() => onRequireLogin?.('로그인하면 사연 등록과 투표, 댓글, AI 대화를 모두 이용하실 수 있어요.')}` |
| 66 | [frontend/src/components/MyPageView.tsx:342](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => setFaqOpen(faqOpen === i ? null : i)}` |
| 67 | [frontend/src/components/MyPageView.tsx:382](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" arrow_back | `{() => setViewMode('summary')}` |
| 68 | [frontend/src/components/MyPageView.tsx:390](../../frontend/src/components/MyPageView.tsx) | 작성한 사연 ( ) | `{() => handleTabChange('stories')}` |
| 69 | [frontend/src/components/MyPageView.tsx:398](../../frontend/src/components/MyPageView.tsx) | 참여한 투표 ( ) | `{() => handleTabChange('votes')}` |
| 70 | [frontend/src/components/MyPageView.tsx:406](../../frontend/src/components/MyPageView.tsx) | 작성한 댓글 ( ) | `{() => handleTabChange('comments')}` |
| 71 | [frontend/src/components/MyPageView.tsx:423](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => setCurrentPage(i + 1)}` |
| 72 | [frontend/src/components/MyPageView.tsx:445](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" arrow_back | `{() => setViewMode('summary')}` |
| 73 | [frontend/src/components/MyPageView.tsx:469](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `(form submit 또는 상위 핸들러)` |
| 74 | [frontend/src/components/MyPageView.tsx:479](../../frontend/src/components/MyPageView.tsx) | 계정 탈퇴 | `{() => setShowDeleteModal(true)}` |
| 75 | [frontend/src/components/MyPageView.tsx:514](../../frontend/src/components/MyPageView.tsx) | 취소 | `{() => setShowDeleteModal(false)}` |
| 76 | [frontend/src/components/MyPageView.tsx:517](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{async () => { setDeleting(true); const { error } = await supabase.rpc('delete_my_account'); if (error) { setD` |
| 77 | [frontend/src/components/MyPageView.tsx:547](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" arrow_back | `{() => setViewMode('summary')}` |
| 78 | [frontend/src/components/MyPageView.tsx:593](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{async () => { const text = (replyDraft[q.id] ?? '').trim(); if (!text) return; setReplyingId(q.id); const ok ` |
| 79 | [frontend/src/components/MyPageView.tsx:623](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" arrow_back | `{() => setViewMode('summary')}` |
| 80 | [frontend/src/components/MyPageView.tsx:634](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => { const v = !notifyBalanceGame; setNotifyBalanceGame(v); saveNotify({ notifyBalanceGame: v }); }}` |
| 81 | [frontend/src/components/MyPageView.tsx:646](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => { const v = !notifyVotes; setNotifyVotes(v); saveNotify({ notifyVotes: v }); }}` |
| 82 | [frontend/src/components/MyPageView.tsx:658](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => { const v = !notifyComments; setNotifyComments(v); saveNotify({ notifyComments: v }); }}` |
| 83 | [frontend/src/components/MyPageView.tsx:674](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" arrow_back | `{() => setViewMode('summary')}` |
| 84 | [frontend/src/components/MyPageView.tsx:687](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => setFaqOpen(faqOpen === i ? null : i)}` |
| 85 | [frontend/src/components/MyPageView.tsx:713](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{async () => { setInquirySending(true); const { data: sess } = await supabase.auth.getUser(); const uid = sess` |
| 86 | [frontend/src/components/MyPageView.tsx:800](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `(form submit 또는 상위 핸들러)` |
| 87 | [frontend/src/components/MyPageView.tsx:807](../../frontend/src/components/MyPageView.tsx) | "랜덤 닉네임" | `{async () => { const nickname = await onGenerateRandomNickname(); if (nickname) { setNicknameInput(nickname); ` |
| 88 | [frontend/src/components/MyPageView.tsx:828](../../frontend/src/components/MyPageView.tsx) | EDIT | `{() => { setNicknameInput(user.nickname); setIsEditingNickname(true); }}` |
| 89 | [frontend/src/components/MyPageView.tsx:873](../../frontend/src/components/MyPageView.tsx) | 작성한 사연 ( ) | `{() => handleTabChange('stories')}` |
| 90 | [frontend/src/components/MyPageView.tsx:881](../../frontend/src/components/MyPageView.tsx) | 참여한 투표 ( ) | `{() => handleTabChange('votes')}` |
| 91 | [frontend/src/components/MyPageView.tsx:889](../../frontend/src/components/MyPageView.tsx) | 작성한 댓글 ( ) | `{() => handleTabChange('comments')}` |
| 92 | [frontend/src/components/MyPageView.tsx:905](../../frontend/src/components/MyPageView.tsx) | 더보기 | `{() => setViewMode('more')}` |
| 93 | [frontend/src/components/MyPageView.tsx:924](../../frontend/src/components/MyPageView.tsx) | 다시 시도 | `{onRetryHiddenStories}` |
| 94 | [frontend/src/components/MyPageView.tsx:932](../../frontend/src/components/MyPageView.tsx) | 다시 보기 | `{() => void onRestoreStory(story.id)}` |
| 95 | [frontend/src/components/MyPageView.tsx:940](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => setViewMode('account')}` |
| 96 | [frontend/src/components/MyPageView.tsx:944](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => setViewMode('notifications')}` |
| 97 | [frontend/src/components/MyPageView.tsx:948](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => setViewMode('support')}` |
| 98 | [frontend/src/components/MyPageView.tsx:955](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => setViewMode('inquiryAdmin')}` |
| 99 | [frontend/src/components/MyPageView.tsx:1000](../../frontend/src/components/MyPageView.tsx) | 그만두기 | `{() => setConfirmWipe(false)}` |
| 100 | [frontend/src/components/MyPageView.tsx:1007](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{async () => { setWiping(true); await onDeleteAllAiChats(); setWiping(false); setConfirmWipe(false); }}` |
| 101 | [frontend/src/components/MyPageView.tsx:1021](../../frontend/src/components/MyPageView.tsx) | 전부 지우기 | `{() => setConfirmWipe(true)}` |
| 102 | [frontend/src/components/MyPageView.tsx:1033](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | `{() => supabase.auth.signOut()}` |
| 103 | [frontend/src/components/Navbar.tsx:15](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | `{() => onTabChange('feed')}` |
| 104 | [frontend/src/components/Navbar.tsx:27](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | `{() => onTabChange('ai-chat')}` |
| 105 | [frontend/src/components/Navbar.tsx:39](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | `{() => onTabChange('mypage')}` |
| 106 | [frontend/src/components/PremiumModal.tsx:29](../../frontend/src/components/PremiumModal.tsx) | "닫기" | `{onClose}` |
| 107 | [frontend/src/components/PremiumModal.tsx:60](../../frontend/src/components/PremiumModal.tsx) | 내 사연 보기 | `{onOpenMyStories}` |
| 108 | [frontend/src/components/PremiumModal.tsx:67](../../frontend/src/components/PremiumModal.tsx) | 기존 대화 이어가기 | `{onOpenExistingChats}` |
| 109 | [frontend/src/components/PremiumModal.tsx:74](../../frontend/src/components/PremiumModal.tsx) | 닫기 | `{onClose}` |
| 110 | [frontend/src/components/ReportModal.tsx:96](../../frontend/src/components/ReportModal.tsx) | "닫기" | `{onClose}` |
| 111 | [frontend/src/components/ReportModal.tsx:156](../../frontend/src/components/ReportModal.tsx) | 취소 | `{onClose}` |
| 112 | [frontend/src/components/ReportModal.tsx:164](../../frontend/src/components/ReportModal.tsx) | (동적 JSX/아이콘) | `(form submit 또는 상위 핸들러)` |
| 113 | [frontend/src/components/SessionSummaryCard.tsx:32](../../frontend/src/components/SessionSummaryCard.tsx) | (동적 JSX/아이콘) | `{() => onPick(m.id)}` |
| 114 | [frontend/src/components/SessionSummaryCard.tsx:104](../../frontend/src/components/SessionSummaryCard.tsx) | 오늘의 대화 요약으로 돌아가기 | `{() => setCollapsed(false)}` |
| 115 | [frontend/src/components/SessionSummaryCard.tsx:163](../../frontend/src/components/SessionSummaryCard.tsx) | (동적 JSX/아이콘) | `{() => { setCollapsed(true); onJumpToMessage(m.id); }}` |
| 116 | [frontend/src/components/SessionSummaryCard.tsx:209](../../frontend/src/components/SessionSummaryCard.tsx) | 더 이야기할래요 | `{onContinue}` |
| 117 | [frontend/src/components/SessionSummaryCard.tsx:216](../../frontend/src/components/SessionSummaryCard.tsx) | 여기서 마무리 | `{onFinish}` |
| 118 | [frontend/src/components/ShareResultBar.tsx:62](../../frontend/src/components/ShareResultBar.tsx) | 닉네임 없이 결과만 담긴 카드로 나갑니다 | `{onPreview}` |
| 119 | [frontend/src/components/ShareResultBar.tsx:73](../../frontend/src/components/ShareResultBar.tsx) | "결과 카드 이미지 저장" | `{handleDownload}` |
| 120 | [frontend/src/components/ShareResultBar.tsx:83](../../frontend/src/components/ShareResultBar.tsx) | 결과 공유하기 | `{handleShare}` |
| 121 | [frontend/src/components/StoryCard.tsx:129](../../frontend/src/components/StoryCard.tsx) | 이의 제기 | `{(e) => { e.stopPropagation(); onAppeal?.(story.id); }}` |
| 122 | [frontend/src/components/StoryCard.tsx:181](../../frontend/src/components/StoryCard.tsx) | "메뉴 더보기" | `{(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}` |
| 123 | [frontend/src/components/StoryCard.tsx:194](../../frontend/src/components/StoryCard.tsx) | 수정 | `{(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(story.id); }}` |
| 124 | [frontend/src/components/StoryCard.tsx:199](../../frontend/src/components/StoryCard.tsx) | 숨기기 | `{(e) => { e.stopPropagation(); setIsMenuOpen(false); onHide(story.id); }}` |
| 125 | [frontend/src/components/StoryCard.tsx:203](../../frontend/src/components/StoryCard.tsx) | 신고 | `{(e) => { e.stopPropagation(); setIsMenuOpen(false); onReport(story.id); }}` |
| 126 | [frontend/src/components/StoryCard.tsx:207](../../frontend/src/components/StoryCard.tsx) | 삭제 | `{(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(story.id); }}` |
| 127 | [frontend/src/components/StoryCard.tsx:227](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | `{(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}` |
| 128 | [frontend/src/components/StoryCard.tsx:260](../../frontend/src/components/StoryCard.tsx) | 니 편 | `{(e) => { e.stopPropagation(); if (isBlurRequired && onRequireAdultVerification) { onRequireAdultVerification(` |
| 129 | [frontend/src/components/StoryCard.tsx:283](../../frontend/src/components/StoryCard.tsx) | 내 편 | `{(e) => { e.stopPropagation(); if (isBlurRequired && onRequireAdultVerification) { onRequireAdultVerification(` |
| 130 | [frontend/src/components/StoryCard.tsx:329](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | `{(e) => { e.stopPropagation(); if (isBlurRequired) { if (onRequireAdultVerification) onRequireAdultVerificatio` |
| 131 | [frontend/src/components/StoryCard.tsx:369](../../frontend/src/components/StoryCard.tsx) | 전체 | `{() => setActiveCommentTab('all')}` |
| 132 | [frontend/src/components/StoryCard.tsx:375](../../frontend/src/components/StoryCard.tsx) | 내 편 | `{() => setActiveCommentTab('A')}` |
| 133 | [frontend/src/components/StoryCard.tsx:381](../../frontend/src/components/StoryCard.tsx) | 니 편 | `{() => setActiveCommentTab('B')}` |
| 134 | [frontend/src/components/StoryCard.tsx:388](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | `{() => setActiveCommentTab(null)}` |
| 135 | [frontend/src/components/StoryDetailModal.tsx:284](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | `{(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}` |
| 136 | [frontend/src/components/StoryDetailModal.tsx:296](../../frontend/src/components/StoryDetailModal.tsx) | 수정 | `{() => { setIsMenuOpen(false); onEditStory(story.id); onClose(); }}` |
| 137 | [frontend/src/components/StoryDetailModal.tsx:301](../../frontend/src/components/StoryDetailModal.tsx) | 숨기기 | `{async () => { setIsMenuOpen(false); if (await onHideStory(story.id)) onClose(); }}` |
| 138 | [frontend/src/components/StoryDetailModal.tsx:305](../../frontend/src/components/StoryDetailModal.tsx) | 신고 | `{() => { setIsMenuOpen(false); onReportStory(story.id); }}` |
| 139 | [frontend/src/components/StoryDetailModal.tsx:309](../../frontend/src/components/StoryDetailModal.tsx) | 삭제 | `{() => { setIsMenuOpen(false); onDeleteStory(story.id); }}` |
| 140 | [frontend/src/components/StoryDetailModal.tsx:316](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | `{onClose}` |
| 141 | [frontend/src/components/StoryDetailModal.tsx:370](../../frontend/src/components/StoryDetailModal.tsx) | 사연 보기 | `{() => setShowSensitiveBody(true)}` |
| 142 | [frontend/src/components/StoryDetailModal.tsx:405](../../frontend/src/components/StoryDetailModal.tsx) | 니 편 | `{() => handleVote('B')}` |
| 143 | [frontend/src/components/StoryDetailModal.tsx:419](../../frontend/src/components/StoryDetailModal.tsx) | 내 편 | `{() => handleVote('A')}` |
| 144 | [frontend/src/components/StoryDetailModal.tsx:478](../../frontend/src/components/StoryDetailModal.tsx) | 시작하기 | `{() => onStartAIChat(story)}` |
| 145 | [frontend/src/components/StoryDetailModal.tsx:538](../../frontend/src/components/StoryDetailModal.tsx) | {`댓글 공감 ${c.userLiked ? '취소' : '하기'} · ${c.likeCount}개`} | `{() => onLikeComment(c.id)}` |
| 146 | [frontend/src/components/StoryDetailModal.tsx:550](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | `{() => setCommentMenuOpenId(commentMenuOpenId === c.id ? null : c.id)}` |
| 147 | [frontend/src/components/StoryDetailModal.tsx:555](../../frontend/src/components/StoryDetailModal.tsx) | 수정 | `{() => { setEditingCommentId(c.id); setEditingCommentText(c.content); setCommentMenuOpenId(null); }}` |
| 148 | [frontend/src/components/StoryDetailModal.tsx:556](../../frontend/src/components/StoryDetailModal.tsx) | 삭제 | `{async () => { if (!onDeleteComment \|\| commentMutationId) return; setCommentMutationId(c.id); let deleted = ` |
| 149 | [frontend/src/components/StoryDetailModal.tsx:573](../../frontend/src/components/StoryDetailModal.tsx) | "신고" | `{() => onReportComment(c.id)}` |
| 150 | [frontend/src/components/StoryDetailModal.tsx:588](../../frontend/src/components/StoryDetailModal.tsx) | 취소 | `{() => setEditingCommentId(null)}` |
| 151 | [frontend/src/components/StoryDetailModal.tsx:589](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | `{async () => { if (!onEditComment \|\| commentMutationId \|\| !editingCommentText.trim()) return; setCommentMu` |
| 152 | [frontend/src/components/StoryDetailModal.tsx:630](../../frontend/src/components/StoryDetailModal.tsx) | 로그인하고 댓글 남기기 | `{() => onRequireLogin?.('댓글을 남기려면 로그인이 필요해요.')}` |
| 153 | [frontend/src/components/StoryDetailModal.tsx:655](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | `(form submit 또는 상위 핸들러)` |
| 154 | [frontend/src/components/StoryDetailModal.tsx:694](../../frontend/src/components/StoryDetailModal.tsx) | 닫기 | `{closePreview}` |
| 155 | [frontend/src/components/WeeklyTopBanner.tsx:211](../../frontend/src/components/WeeklyTopBanner.tsx) | "이전 배너 보기" | `{toggleBanner}` |
| 156 | [frontend/src/components/WeeklyTopBanner.tsx:218](../../frontend/src/components/WeeklyTopBanner.tsx) | "다음 배너 보기" | `{toggleBanner}` |
| 157 | [frontend/src/components/WelcomeModal.tsx:153](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | `(form submit 또는 상위 핸들러)` |
| 158 | [frontend/src/components/WelcomeModal.tsx:164](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | `{() => void handleResend(confirmationEmail)}` |
| 159 | [frontend/src/components/WelcomeModal.tsx:172](../../frontend/src/components/WelcomeModal.tsx) | 다른 이메일로 가입하기 | `{() => { setConfirmationEmail(null); setEmail(''); setErrorMsg(''); setResendMessage(''); setIsLoginMode(false` |
| 160 | [frontend/src/components/WelcomeModal.tsx:237](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | `(form submit 또는 상위 핸들러)` |
| 161 | [frontend/src/components/WelcomeModal.tsx:247](../../frontend/src/components/WelcomeModal.tsx) | 로그인 없이 둘러보기 | `{() => { setShowExpiredLink(false); onGuestBrowse(); }}` |
| 162 | [frontend/src/components/WelcomeModal.tsx:260](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | `{() => { setIsLoginMode(confirmationEmail \|\| showExpiredLink ? true : !isLoginMode); setConfirmationEmail(nu` |
| 163 | [frontend/src/components/BalanceGameSection.tsx:355](../../frontend/src/components/BalanceGameSection.tsx) | 밸런스 게임 번호 보기(동적) | `{() => setCurrentIndex(idx)}` |
| 164 | [frontend/src/components/WeeklyTopBanner.tsx:263](../../frontend/src/components/WeeklyTopBanner.tsx) | 주간 배너 번호 보기(동적) | `{() => setActiveIndex(idx)}` |

다음 검토에서는 각 줄에 안정적인 `button_id`, 화면/노출 조건, 요청 성공·실패·취소, 전송할 이벤트 또는 제외 이유, 실제 검증 케이스를 연결해야 한다. 특히 위기 지원·개인정보 관련 행동은 GA4로 외부 전송할지 별도 확인한다.
