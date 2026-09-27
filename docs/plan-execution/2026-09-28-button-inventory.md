# 버튼 정적 위치 목록 — 2026-09-28 갱신

[PLAN.md](../../PLAN.md)의 버튼 계약을 위한 코드 위치 점검표다. 현재 TSX에서 직접 선언한 `<button>` 167곳을 TypeScript AST로 추출했다. 앞선 164곳 목록 이후 3곳이 늘었다. 이 수에는 현재 화면에서 사용하지 않는 컴포넌트도 포함된다. 조건부·반복 노출과 실제 작동은 확인하지 않았다. 위치 번호와 줄 번호는 안정적인 `button_id`가 아니다. `onClick`이 없어도 폼 제출이나 상위 이벤트에서 동작할 수 있다.

재집계 명령: `node tools/generate-button-inventory.mjs`

| 번호 | 코드 위치 | 정적 문구/접근성 이름 | 동작 연결(정적 코드) |
| ---: | --- | --- | --- |
| 1 | [frontend/src/App.tsx:1649](../../frontend/src/App.tsx) | 다시 시도 | {() => setHiddenStoriesLoadNonce(n => n + 1)} |
| 2 | [frontend/src/App.tsx:1682](../../frontend/src/App.tsx) | (동적 JSX/아이콘) | {() => setSelectedCategory(cat)} |
| 3 | [frontend/src/App.tsx:1698](../../frontend/src/App.tsx) | 최신순 | {() => setSortBy('latest')} |
| 4 | [frontend/src/App.tsx:1708](../../frontend/src/App.tsx) | HOT | {() => setSortBy('votes')} |
| 5 | [frontend/src/App.tsx:1730](../../frontend/src/App.tsx) | 사연 등록하기 | {openCreateStory} |
| 6 | [frontend/src/App.tsx:1882](../../frontend/src/App.tsx) | 사연 올리기 | {openCreateStory} |
| 7 | [frontend/src/App.tsx:1893](../../frontend/src/App.tsx) | "익명 사연 쓰기" | {openCreateStory} |
| 8 | [frontend/src/App.tsx:1950](../../frontend/src/App.tsx) | 취소 | {() => setAppealTargetId(null)} |
| 9 | [frontend/src/App.tsx:1956](../../frontend/src/App.tsx) | 제출하기 | {() => { const el = document.getElementById('appeal-text') as HTMLTextAreaElement \| null; const text = el?.value.trim() ?? ' |
| 10 | [frontend/src/App.tsx:2090](../../frontend/src/App.tsx) | 되돌리기 | {() => void handleRestoreStory(undoHiddenStoryId)} |
| 11 | [frontend/src/components/AIChatModeSelectionModal.tsx:47](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => setStep('mode')} |
| 12 | [frontend/src/components/AIChatModeSelectionModal.tsx:55](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 13 | [frontend/src/components/AIChatModeSelectionModal.tsx:64](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => { track('ai_mode_select', { mode: 'simulation' }); setStep('opening'); }} |
| 14 | [frontend/src/components/AIChatModeSelectionModal.tsx:79](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => { track('ai_mode_select', { mode: 'explanation' }); onSelectMode('explanation'); }} |
| 15 | [frontend/src/components/AIChatModeSelectionModal.tsx:104](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => onSelectMode('simulation', o.id)} |
| 16 | [frontend/src/components/AIChatView.tsx:515](../../frontend/src/components/AIChatView.tsx) | 사연 보러 가기 | {onGoToFeed} |
| 17 | [frontend/src/components/AIChatView.tsx:548](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === persona.id ? null : persona.id); }} |
| 18 | [frontend/src/components/AIChatView.tsx:567](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setOpenMenuId(null); onTogglePinPersona(persona.id); }} |
| 19 | [frontend/src/components/AIChatView.tsx:572](../../frontend/src/components/AIChatView.tsx) | 오류 신고 | {(e) => { e.stopPropagation(); setOpenMenuId(null); onReportErrorPersona(persona.id); }} |
| 20 | [frontend/src/components/AIChatView.tsx:577](../../frontend/src/components/AIChatView.tsx) | 삭제 | {(e) => { e.stopPropagation(); setOpenMenuId(null); void onDeletePersona(persona.id); }} |
| 21 | [frontend/src/components/AIChatView.tsx:601](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); openPersona(persona); }} |
| 22 | [frontend/src/components/AIChatView.tsx:631](../../frontend/src/components/AIChatView.tsx) | "대화창 나가기" | {handleLeave} |
| 23 | [frontend/src/components/AIChatView.tsx:647](../../frontend/src/components/AIChatView.tsx) | "공감 비율 설정 변경" | {onOpenSettings} |
| 24 | [frontend/src/components/AIChatView.tsx:651](../../frontend/src/components/AIChatView.tsx) | "대화창 닫기" | {handleLeave} |
| 25 | [frontend/src/components/AIChatView.tsx:707](../../frontend/src/components/AIChatView.tsx) | 다시 보내기 | {() => { void sendMessage(failedText, true); }} |
| 26 | [frontend/src/components/AIChatView.tsx:758](../../frontend/src/components/AIChatView.tsx) | 🤝 화해로 끝내기 | {() => setSimEndResult('success')} |
| 27 | [frontend/src/components/AIChatView.tsx:765](../../frontend/src/components/AIChatView.tsx) | ⚡ 결렬로 끝내기 | {() => setSimEndResult('fail')} |
| 28 | [frontend/src/components/AIChatView.tsx:802](../../frontend/src/components/AIChatView.tsx) | 로그인하고 대화 이어가기 | {() => onRequireLogin('AI와 대화를 이어가려면 로그인이 필요해요.')} |
| 29 | [frontend/src/components/AIChatView.tsx:815](../../frontend/src/components/AIChatView.tsx) | 대화 마무리 | {beginFinish} |
| 30 | [frontend/src/components/AIChatView.tsx:824](../../frontend/src/components/AIChatView.tsx) | 새 답변 요청 | {retrySave} |
| 31 | [frontend/src/components/AIChatView.tsx:835](../../frontend/src/components/AIChatView.tsx) | 보내기 | (form submit 또는 상위 핸들러) |
| 32 | [frontend/src/components/AIChatView.tsx:854](../../frontend/src/components/AIChatView.tsx) | "취소" | {() => setShowExitChoice(false)} |
| 33 | [frontend/src/components/AIChatView.tsx:873](../../frontend/src/components/AIChatView.tsx) | 남겨두고 닫기 | {keepAndClose} |
| 34 | [frontend/src/components/AIChatView.tsx:879](../../frontend/src/components/AIChatView.tsx) | 대화 삭제하고 닫기 | {() => { void discardAndClose(); }} |
| 35 | [frontend/src/components/AIChatView.tsx:899](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {() => { void finishWithFeedback((index + 1) as 1 \| 2 \| 3 \| 4 \| 5); }} |
| 36 | [frontend/src/components/AIChatView.tsx:908](../../frontend/src/components/AIChatView.tsx) | 건너뛰기 | {() => { void finishWithFeedback(null); }} |
| 37 | [frontend/src/components/AIChatView.tsx:910](../../frontend/src/components/AIChatView.tsx) | 평가 없이 닫기 | {finishAndKeep} |
| 38 | [frontend/src/components/AIChatView.tsx:912](../../frontend/src/components/AIChatView.tsx) | 대화로 돌아가기 | {() => setShowFeedback(false)} |
| 39 | [frontend/src/components/AIErrorReportModal.tsx:40](../../frontend/src/components/AIErrorReportModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 40 | [frontend/src/components/AIErrorReportModal.tsx:68](../../frontend/src/components/AIErrorReportModal.tsx) | 취소 | {onClose} |
| 41 | [frontend/src/components/AIErrorReportModal.tsx:75](../../frontend/src/components/AIErrorReportModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 42 | [frontend/src/components/AIExplainSettingsModal.tsx:29](../../frontend/src/components/AIExplainSettingsModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 43 | [frontend/src/components/AIExplainSettingsModal.tsx:89](../../frontend/src/components/AIExplainSettingsModal.tsx) | 확인 | {() => onConfirm(ratio)} |
| 44 | [frontend/src/components/AdultVerificationModal.tsx:20](../../frontend/src/components/AdultVerificationModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 45 | [frontend/src/components/AdultVerificationModal.tsx:43](../../frontend/src/components/AdultVerificationModal.tsx) | 간편 성인 인증하기 | {() => { onVerify(); onClose(); }} |
| 46 | [frontend/src/components/AnalyticsConsent.tsx:20](../../frontend/src/components/AnalyticsConsent.tsx) | 거부 | {() => setAnalyticsConsent('refused')} |
| 47 | [frontend/src/components/AnalyticsConsent.tsx:21](../../frontend/src/components/AnalyticsConsent.tsx) | 동의 | {() => setAnalyticsConsent('accepted')} |
| 48 | [frontend/src/components/AnalyticsConsent.tsx:40](../../frontend/src/components/AnalyticsConsent.tsx) | (동적 JSX/아이콘) | {() => setAnalyticsConsent('refused')} |
| 49 | [frontend/src/components/AnalyticsConsent.tsx:41](../../frontend/src/components/AnalyticsConsent.tsx) | 동의 | {() => setAnalyticsConsent('accepted')} |
| 50 | [frontend/src/components/BalanceGameSection.tsx:253](../../frontend/src/components/BalanceGameSection.tsx) | "이전 배너 보기" | {handlePrev} |
| 51 | [frontend/src/components/BalanceGameSection.tsx:260](../../frontend/src/components/BalanceGameSection.tsx) | "다음 배너 보기" | {handleNext} |
| 52 | [frontend/src/components/BalanceGameSection.tsx:291](../../frontend/src/components/BalanceGameSection.tsx) | 다시 불러오기 | {() => void loadState()} |
| 53 | [frontend/src/components/BalanceGameSection.tsx:313](../../frontend/src/components/BalanceGameSection.tsx) | (동적 JSX/아이콘) | {() => handleVote(game.id, 'B')} |
| 54 | [frontend/src/components/BalanceGameSection.tsx:324](../../frontend/src/components/BalanceGameSection.tsx) | (동적 JSX/아이콘) | {() => handleVote(game.id, 'A')} |
| 55 | [frontend/src/components/BalanceGameSection.tsx:355](../../frontend/src/components/BalanceGameSection.tsx) | {\`밸런스 게임 ${idx + 1} 보기\`} | {() => setCurrentIndex(idx)} |
| 56 | [frontend/src/components/CreateStoryModal.tsx:115](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 57 | [frontend/src/components/CreateStoryModal.tsx:137](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | {() => setCategory(cat)} |
| 58 | [frontend/src/components/CreateStoryModal.tsx:232](../../frontend/src/components/CreateStoryModal.tsx) | 취소 | {onClose} |
| 59 | [frontend/src/components/CreateStoryModal.tsx:239](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 60 | [frontend/src/components/CrisisSupportModal.tsx:87](../../frontend/src/components/CrisisSupportModal.tsx) | (동적 JSX/아이콘) | {onContinue} |
| 61 | [frontend/src/components/CrisisSupportModal.tsx:94](../../frontend/src/components/CrisisSupportModal.tsx) | 닫기 | {onClose} |
| 62 | [frontend/src/components/DeleteConfirmModal.tsx:26](../../frontend/src/components/DeleteConfirmModal.tsx) | 취소 | {onClose} |
| 63 | [frontend/src/components/DeleteConfirmModal.tsx:33](../../frontend/src/components/DeleteConfirmModal.tsx) | (동적 JSX/아이콘) | {onConfirm} |
| 64 | [frontend/src/components/Header.tsx:59](../../frontend/src/components/Header.tsx) | "사연 등록" | {onOpenCreateStory} |
| 65 | [frontend/src/components/Header.tsx:73](../../frontend/src/components/Header.tsx) | {\`내 계정 (${user.nickname})\`} | {onOpenProfile} |
| 66 | [frontend/src/components/LoginPromptModal.tsx:30](../../frontend/src/components/LoginPromptModal.tsx) | 로그인 하러가기 | {onGoToLogin} |
| 67 | [frontend/src/components/LoginPromptModal.tsx:36](../../frontend/src/components/LoginPromptModal.tsx) | 더 둘러볼게요 | {onClose} |
| 68 | [frontend/src/components/MyPageView.tsx:331](../../frontend/src/components/MyPageView.tsx) | 로그인 하러가기 | {() => onRequireLogin?.('로그인하면 사연 등록과 투표, 댓글, AI 대화를 모두 이용하실 수 있어요.')} |
| 69 | [frontend/src/components/MyPageView.tsx:347](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setFaqOpen(faqOpen === i ? null : i)} |
| 70 | [frontend/src/components/MyPageView.tsx:387](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 71 | [frontend/src/components/MyPageView.tsx:395](../../frontend/src/components/MyPageView.tsx) | 작성한 사연 ( ) | {() => handleTabChange('stories')} |
| 72 | [frontend/src/components/MyPageView.tsx:403](../../frontend/src/components/MyPageView.tsx) | 참여한 투표 ( ) | {() => handleTabChange('votes')} |
| 73 | [frontend/src/components/MyPageView.tsx:411](../../frontend/src/components/MyPageView.tsx) | 작성한 댓글 ( ) | {() => handleTabChange('comments')} |
| 74 | [frontend/src/components/MyPageView.tsx:428](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setCurrentPage(i + 1)} |
| 75 | [frontend/src/components/MyPageView.tsx:450](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 76 | [frontend/src/components/MyPageView.tsx:474](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 77 | [frontend/src/components/MyPageView.tsx:484](../../frontend/src/components/MyPageView.tsx) | 계정 탈퇴 | {() => setShowDeleteModal(true)} |
| 78 | [frontend/src/components/MyPageView.tsx:519](../../frontend/src/components/MyPageView.tsx) | 취소 | {() => setShowDeleteModal(false)} |
| 79 | [frontend/src/components/MyPageView.tsx:522](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { setDeleting(true); const { error } = await supabase.rpc('delete_my_account'); if (error) { setDeleting(false); |
| 80 | [frontend/src/components/MyPageView.tsx:552](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 81 | [frontend/src/components/MyPageView.tsx:599](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { const text = (replyDraft[q.id] ?? '').trim(); if (!text) return; setReplyingId(q.id); const ok = await replyTo |
| 82 | [frontend/src/components/MyPageView.tsx:629](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 83 | [frontend/src/components/MyPageView.tsx:640](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => { const v = !notifyBalanceGame; setNotifyBalanceGame(v); saveNotify({ notifyBalanceGame: v }); }} |
| 84 | [frontend/src/components/MyPageView.tsx:652](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => { const v = !notifyVotes; setNotifyVotes(v); saveNotify({ notifyVotes: v }); }} |
| 85 | [frontend/src/components/MyPageView.tsx:664](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => { const v = !notifyComments; setNotifyComments(v); saveNotify({ notifyComments: v }); }} |
| 86 | [frontend/src/components/MyPageView.tsx:680](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 87 | [frontend/src/components/MyPageView.tsx:693](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setFaqOpen(faqOpen === i ? null : i)} |
| 88 | [frontend/src/components/MyPageView.tsx:719](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { setInquirySending(true); const { data: sess } = await supabase.auth.getUser(); const uid = sess?.user?.id; if  |
| 89 | [frontend/src/components/MyPageView.tsx:807](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 90 | [frontend/src/components/MyPageView.tsx:814](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { const nickname = await onGenerateRandomNickname(); if (nickname) { setNicknameInput(nickname); setNicknameErro |
| 91 | [frontend/src/components/MyPageView.tsx:835](../../frontend/src/components/MyPageView.tsx) | EDIT | {() => { setNicknameInput(user.nickname); setIsEditingNickname(true); }} |
| 92 | [frontend/src/components/MyPageView.tsx:880](../../frontend/src/components/MyPageView.tsx) | 작성한 사연 ( ) | {() => handleTabChange('stories')} |
| 93 | [frontend/src/components/MyPageView.tsx:888](../../frontend/src/components/MyPageView.tsx) | 참여한 투표 ( ) | {() => handleTabChange('votes')} |
| 94 | [frontend/src/components/MyPageView.tsx:896](../../frontend/src/components/MyPageView.tsx) | 작성한 댓글 ( ) | {() => handleTabChange('comments')} |
| 95 | [frontend/src/components/MyPageView.tsx:909](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => { setStoryVisibilityFilter(filter); setCurrentPage(1); }} |
| 96 | [frontend/src/components/MyPageView.tsx:924](../../frontend/src/components/MyPageView.tsx) | 더보기 | {() => setViewMode('more')} |
| 97 | [frontend/src/components/MyPageView.tsx:943](../../frontend/src/components/MyPageView.tsx) | 다시 시도 | {onRetryHiddenStories} |
| 98 | [frontend/src/components/MyPageView.tsx:951](../../frontend/src/components/MyPageView.tsx) | 다시 보기 | {() => void onRestoreStory(story.id)} |
| 99 | [frontend/src/components/MyPageView.tsx:959](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('account')} |
| 100 | [frontend/src/components/MyPageView.tsx:963](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('notifications')} |
| 101 | [frontend/src/components/MyPageView.tsx:967](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('support')} |
| 102 | [frontend/src/components/MyPageView.tsx:974](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('inquiryAdmin')} |
| 103 | [frontend/src/components/MyPageView.tsx:1014](../../frontend/src/components/MyPageView.tsx) | 그만두기 | {() => setConfirmWipe(false)} |
| 104 | [frontend/src/components/MyPageView.tsx:1021](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { setWiping(true); await onDeleteAllAiChats(); setWiping(false); setConfirmWipe(false); }} |
| 105 | [frontend/src/components/MyPageView.tsx:1035](../../frontend/src/components/MyPageView.tsx) | 전부 지우기 | {() => setConfirmWipe(true)} |
| 106 | [frontend/src/components/MyPageView.tsx:1047](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => supabase.auth.signOut()} |
| 107 | [frontend/src/components/Navbar.tsx:15](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | {() => onTabChange('feed')} |
| 108 | [frontend/src/components/Navbar.tsx:27](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | {() => onTabChange('ai-chat')} |
| 109 | [frontend/src/components/Navbar.tsx:39](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | {() => onTabChange('mypage')} |
| 110 | [frontend/src/components/PremiumModal.tsx:29](../../frontend/src/components/PremiumModal.tsx) | "닫기" | {onClose} |
| 111 | [frontend/src/components/PremiumModal.tsx:60](../../frontend/src/components/PremiumModal.tsx) | 내 사연 보기 | {onOpenMyStories} |
| 112 | [frontend/src/components/PremiumModal.tsx:67](../../frontend/src/components/PremiumModal.tsx) | 기존 대화 이어가기 | {onOpenExistingChats} |
| 113 | [frontend/src/components/PremiumModal.tsx:74](../../frontend/src/components/PremiumModal.tsx) | 닫기 | {onClose} |
| 114 | [frontend/src/components/ReportModal.tsx:96](../../frontend/src/components/ReportModal.tsx) | "닫기" | {onClose} |
| 115 | [frontend/src/components/ReportModal.tsx:156](../../frontend/src/components/ReportModal.tsx) | 취소 | {onClose} |
| 116 | [frontend/src/components/ReportModal.tsx:164](../../frontend/src/components/ReportModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 117 | [frontend/src/components/SessionSummaryCard.tsx:49](../../frontend/src/components/SessionSummaryCard.tsx) | 오늘의 대화 요약으로 돌아가기 | {() => setCollapsed(false)} |
| 118 | [frontend/src/components/SessionSummaryCard.tsx:85](../../frontend/src/components/SessionSummaryCard.tsx) | (동적 JSX/아이콘) | {() => { setCollapsed(true); onJumpToMessage(m.id); }} |
| 119 | [frontend/src/components/SessionSummaryCard.tsx:115](../../frontend/src/components/SessionSummaryCard.tsx) | 더 이야기할래요 | {onContinue} |
| 120 | [frontend/src/components/SessionSummaryCard.tsx:122](../../frontend/src/components/SessionSummaryCard.tsx) | 여기서 마무리 | {onFinish} |
| 121 | [frontend/src/components/ShareResultBar.tsx:62](../../frontend/src/components/ShareResultBar.tsx) | 닉네임 없이 결과만 담긴 카드로 나갑니다 | {onPreview} |
| 122 | [frontend/src/components/ShareResultBar.tsx:73](../../frontend/src/components/ShareResultBar.tsx) | "결과 카드 이미지 저장" | {handleDownload} |
| 123 | [frontend/src/components/ShareResultBar.tsx:83](../../frontend/src/components/ShareResultBar.tsx) | 결과 공유하기 | {handleShare} |
| 124 | [frontend/src/components/StoryCard.tsx:129](../../frontend/src/components/StoryCard.tsx) | 이의 제기 | {(e) => { e.stopPropagation(); onAppeal?.(story.id); }} |
| 125 | [frontend/src/components/StoryCard.tsx:181](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} |
| 126 | [frontend/src/components/StoryCard.tsx:194](../../frontend/src/components/StoryCard.tsx) | 수정 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(story.id); }} |
| 127 | [frontend/src/components/StoryCard.tsx:199](../../frontend/src/components/StoryCard.tsx) | 숨기기 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onHide(story.id); }} |
| 128 | [frontend/src/components/StoryCard.tsx:203](../../frontend/src/components/StoryCard.tsx) | 신고 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onReport(story.id); }} |
| 129 | [frontend/src/components/StoryCard.tsx:207](../../frontend/src/components/StoryCard.tsx) | 삭제 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(story.id); }} |
| 130 | [frontend/src/components/StoryCard.tsx:227](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} |
| 131 | [frontend/src/components/StoryCard.tsx:260](../../frontend/src/components/StoryCard.tsx) | 니 편 | {(e) => { e.stopPropagation(); if (isBlurRequired && onRequireAdultVerification) { onRequireAdultVerification(); return; } ha |
| 132 | [frontend/src/components/StoryCard.tsx:283](../../frontend/src/components/StoryCard.tsx) | 내 편 | {(e) => { e.stopPropagation(); if (isBlurRequired && onRequireAdultVerification) { onRequireAdultVerification(); return; } ha |
| 133 | [frontend/src/components/StoryCard.tsx:329](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); if (isBlurRequired) { if (onRequireAdultVerification) onRequireAdultVerification(); return; }  |
| 134 | [frontend/src/components/StoryCard.tsx:369](../../frontend/src/components/StoryCard.tsx) | 전체 | {() => setActiveCommentTab('all')} |
| 135 | [frontend/src/components/StoryCard.tsx:375](../../frontend/src/components/StoryCard.tsx) | 내 편 | {() => setActiveCommentTab('A')} |
| 136 | [frontend/src/components/StoryCard.tsx:381](../../frontend/src/components/StoryCard.tsx) | 니 편 | {() => setActiveCommentTab('B')} |
| 137 | [frontend/src/components/StoryCard.tsx:388](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {() => setActiveCommentTab(null)} |
| 138 | [frontend/src/components/StoryDetailModal.tsx:290](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} |
| 139 | [frontend/src/components/StoryDetailModal.tsx:302](../../frontend/src/components/StoryDetailModal.tsx) | 수정 | {() => { setIsMenuOpen(false); onEditStory(story.id); onClose(); }} |
| 140 | [frontend/src/components/StoryDetailModal.tsx:307](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {async () => { const next = isPrivate ? 'public' : 'private'; if (next === 'private' && !window.confirm( '사연을 비공개로 옮길까요? 다른 이 |
| 141 | [frontend/src/components/StoryDetailModal.tsx:322](../../frontend/src/components/StoryDetailModal.tsx) | 숨기기 | {async () => { setIsMenuOpen(false); if (await onHideStory(story.id)) onClose(); }} |
| 142 | [frontend/src/components/StoryDetailModal.tsx:326](../../frontend/src/components/StoryDetailModal.tsx) | 신고 | {() => { setIsMenuOpen(false); onReportStory(story.id); }} |
| 143 | [frontend/src/components/StoryDetailModal.tsx:330](../../frontend/src/components/StoryDetailModal.tsx) | 삭제 | {() => { setIsMenuOpen(false); onDeleteStory(story.id); }} |
| 144 | [frontend/src/components/StoryDetailModal.tsx:337](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 145 | [frontend/src/components/StoryDetailModal.tsx:392](../../frontend/src/components/StoryDetailModal.tsx) | 사연 보기 | {() => setShowSensitiveBody(true)} |
| 146 | [frontend/src/components/StoryDetailModal.tsx:427](../../frontend/src/components/StoryDetailModal.tsx) | 니 편 | {() => handleVote('B')} |
| 147 | [frontend/src/components/StoryDetailModal.tsx:441](../../frontend/src/components/StoryDetailModal.tsx) | 내 편 | {() => handleVote('A')} |
| 148 | [frontend/src/components/StoryDetailModal.tsx:500](../../frontend/src/components/StoryDetailModal.tsx) | 시작하기 | {() => onStartAIChat(story)} |
| 149 | [frontend/src/components/StoryDetailModal.tsx:560](../../frontend/src/components/StoryDetailModal.tsx) | {\`댓글 공감 ${c.userLiked ? '취소' : '하기'} · ${c.likeCount}개\`} | {() => onLikeComment(c.id)} |
| 150 | [frontend/src/components/StoryDetailModal.tsx:572](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {() => setCommentMenuOpenId(commentMenuOpenId === c.id ? null : c.id)} |
| 151 | [frontend/src/components/StoryDetailModal.tsx:577](../../frontend/src/components/StoryDetailModal.tsx) | 수정 | {() => { setEditingCommentId(c.id); setEditingCommentText(c.content); setCommentMenuOpenId(null); }} |
| 152 | [frontend/src/components/StoryDetailModal.tsx:578](../../frontend/src/components/StoryDetailModal.tsx) | 삭제 | {async () => { if (!onDeleteComment \|\| commentMutationId) return; setCommentMutationId(c.id); let deleted = false; try { de |
| 153 | [frontend/src/components/StoryDetailModal.tsx:595](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {() => onReportComment(c.id)} |
| 154 | [frontend/src/components/StoryDetailModal.tsx:610](../../frontend/src/components/StoryDetailModal.tsx) | 취소 | {() => setEditingCommentId(null)} |
| 155 | [frontend/src/components/StoryDetailModal.tsx:611](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {async () => { if (!onEditComment \|\| commentMutationId \|\| !editingCommentText.trim()) return; setCommentMutationId(c.id); |
| 156 | [frontend/src/components/StoryDetailModal.tsx:654](../../frontend/src/components/StoryDetailModal.tsx) | 로그인하고 댓글 남기기 | {() => onRequireLogin?.('댓글을 남기려면 로그인이 필요해요.')} |
| 157 | [frontend/src/components/StoryDetailModal.tsx:679](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 158 | [frontend/src/components/StoryDetailModal.tsx:718](../../frontend/src/components/StoryDetailModal.tsx) | 닫기 | {closePreview} |
| 159 | [frontend/src/components/WeeklyTopBanner.tsx:211](../../frontend/src/components/WeeklyTopBanner.tsx) | "이전 배너 보기" | {toggleBanner} |
| 160 | [frontend/src/components/WeeklyTopBanner.tsx:218](../../frontend/src/components/WeeklyTopBanner.tsx) | "다음 배너 보기" | {toggleBanner} |
| 161 | [frontend/src/components/WeeklyTopBanner.tsx:263](../../frontend/src/components/WeeklyTopBanner.tsx) | {paneLabel(pane.key)} | {() => setActiveIndex(idx)} |
| 162 | [frontend/src/components/WelcomeModal.tsx:153](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 163 | [frontend/src/components/WelcomeModal.tsx:164](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | {() => void handleResend(confirmationEmail)} |
| 164 | [frontend/src/components/WelcomeModal.tsx:172](../../frontend/src/components/WelcomeModal.tsx) | 다른 이메일로 가입하기 | {() => { setConfirmationEmail(null); setEmail(''); setErrorMsg(''); setResendMessage(''); setIsLoginMode(false); }} |
| 165 | [frontend/src/components/WelcomeModal.tsx:237](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 166 | [frontend/src/components/WelcomeModal.tsx:247](../../frontend/src/components/WelcomeModal.tsx) | 로그인 없이 둘러보기 | {() => { setShowExpiredLink(false); onGuestBrowse(); }} |
| 167 | [frontend/src/components/WelcomeModal.tsx:260](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | {() => { setIsLoginMode(confirmationEmail \|\| showExpiredLink ? true : !isLoginMode); setConfirmationEmail(null); setShowExp |

이 목록은 버튼 기능·GA4·권한 검증의 완료 증거가 아니다. 다음 검토에서 안정적인 `button_id`, 화면/노출 조건, 요청 성공·실패·취소, 이벤트 또는 제외 이유, 실제 검증 케이스를 채운다. 특히 위기 지원·개인정보 행동의 외부 분석 전송은 별도 판단이 필요하다.
