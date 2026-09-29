# 버튼 ID·정적 위치 목록 — 2026-09-28 갱신

[PLAN.md](../../PLAN.md)의 버튼 계약을 위한 코드 위치 점검표다. 현재 TSX에서 직접 선언한 `<button>` 174곳에 고유한 `data-button-id`를 부여하고 TypeScript AST로 검증했다. ID는 문구가 바뀌어도 같은 행동에 유지한다. 반복 렌더링되는 컴포넌트 인스턴스는 같은 행동 ID를 공유한다. 이 수에는 현재 화면에서 사용하지 않는 컴포넌트도 포함된다. 조건부·반복 노출과 실제 작동은 확인하지 않았다. `onClick`이 없어도 폼 제출이나 상위 이벤트에서 동작할 수 있다.

재집계 명령: `node tools/generate-button-inventory.mjs`

| 번호 | button_id | 코드 위치 | 정적 문구/접근성 이름 | 동작 연결(정적 코드) |
| ---: | --- | --- | --- | --- |
| 1 | `app-button-01` | [frontend/src/App.tsx:1752](../../frontend/src/App.tsx) | 다시 시도 | {() => setHiddenStoriesLoadNonce(n => n + 1)} |
| 2 | `app-button-02` | [frontend/src/App.tsx:1785](../../frontend/src/App.tsx) | (동적 JSX/아이콘) | {() => setSelectedCategory(cat)} |
| 3 | `app-button-03` | [frontend/src/App.tsx:1801](../../frontend/src/App.tsx) | 최신순 | {() => setSortBy('latest')} |
| 4 | `app-button-04` | [frontend/src/App.tsx:1811](../../frontend/src/App.tsx) | HOT | {() => setSortBy('votes')} |
| 5 | `app-button-05` | [frontend/src/App.tsx:1833](../../frontend/src/App.tsx) | 사연 등록하기 | {openCreateStory} |
| 6 | `app-button-06` | [frontend/src/App.tsx:1985](../../frontend/src/App.tsx) | 사연 올리기 | {openCreateStory} |
| 7 | `app-button-07` | [frontend/src/App.tsx:1996](../../frontend/src/App.tsx) | "익명 사연 쓰기" | {openCreateStory} |
| 8 | `app-button-08` | [frontend/src/App.tsx:2066](../../frontend/src/App.tsx) | 취소 | {() => setAppealTargetId(null)} |
| 9 | `app-button-09` | [frontend/src/App.tsx:2073](../../frontend/src/App.tsx) | (동적 JSX/아이콘) | {async () => { const el = document.getElementById('appeal-text') as HTMLTextAreaElement \| null; const text = el?.value.trim( |
| 10 | `app-button-10` | [frontend/src/App.tsx:2207](../../frontend/src/App.tsx) | 되돌리기 | {() => void handleRestoreStory(undoHiddenStoryId)} |
| 11 | `ai-chat-mode-selection-modal-button-01` | [frontend/src/components/AIChatModeSelectionModal.tsx:47](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => setStep('mode')} |
| 12 | `ai-chat-mode-selection-modal-button-02` | [frontend/src/components/AIChatModeSelectionModal.tsx:55](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 13 | `ai-chat-mode-selection-modal-button-03` | [frontend/src/components/AIChatModeSelectionModal.tsx:64](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => { track('ai_mode_select', { mode: 'simulation' }); setStep('opening'); }} |
| 14 | `ai-chat-mode-selection-modal-button-04` | [frontend/src/components/AIChatModeSelectionModal.tsx:79](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => { track('ai_mode_select', { mode: 'explanation' }); onSelectMode('explanation'); }} |
| 15 | `ai-chat-mode-selection-modal-button-05` | [frontend/src/components/AIChatModeSelectionModal.tsx:104](../../frontend/src/components/AIChatModeSelectionModal.tsx) | (동적 JSX/아이콘) | {() => onSelectMode('simulation', o.id)} |
| 16 | `ai-chat-view-button-01` | [frontend/src/components/AIChatView.tsx:523](../../frontend/src/components/AIChatView.tsx) | 사연 보러 가기 | {onGoToFeed} |
| 17 | `ai-chat-view-button-02` | [frontend/src/components/AIChatView.tsx:556](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === persona.id ? null : persona.id); }} |
| 18 | `ai-chat-view-button-03` | [frontend/src/components/AIChatView.tsx:575](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setOpenMenuId(null); onTogglePinPersona(persona.id); }} |
| 19 | `ai-chat-view-button-04` | [frontend/src/components/AIChatView.tsx:580](../../frontend/src/components/AIChatView.tsx) | 오류 신고 | {(e) => { e.stopPropagation(); setOpenMenuId(null); onReportErrorPersona(persona.id); }} |
| 20 | `ai-chat-view-button-05` | [frontend/src/components/AIChatView.tsx:585](../../frontend/src/components/AIChatView.tsx) | 삭제 | {(e) => { e.stopPropagation(); setOpenMenuId(null); void onDeletePersona(persona.id); }} |
| 21 | `ai-chat-view-button-06` | [frontend/src/components/AIChatView.tsx:609](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); openPersona(persona); }} |
| 22 | `ai-chat-view-button-07` | [frontend/src/components/AIChatView.tsx:639](../../frontend/src/components/AIChatView.tsx) | "대화창 나가기" | {handleLeave} |
| 23 | `ai-chat-view-button-08` | [frontend/src/components/AIChatView.tsx:655](../../frontend/src/components/AIChatView.tsx) | "공감 비율 설정 변경" | {onOpenSettings} |
| 24 | `ai-chat-view-button-09` | [frontend/src/components/AIChatView.tsx:659](../../frontend/src/components/AIChatView.tsx) | "대화창 닫기" | {handleLeave} |
| 25 | `ai-chat-view-button-10` | [frontend/src/components/AIChatView.tsx:715](../../frontend/src/components/AIChatView.tsx) | 다시 보내기 | {() => { void sendMessage(failedText, true); }} |
| 26 | `ai-chat-view-button-11` | [frontend/src/components/AIChatView.tsx:766](../../frontend/src/components/AIChatView.tsx) | 🤝 화해로 끝내기 | {() => setSimEndResult('success')} |
| 27 | `ai-chat-view-button-12` | [frontend/src/components/AIChatView.tsx:773](../../frontend/src/components/AIChatView.tsx) | ⚡ 결렬로 끝내기 | {() => setSimEndResult('fail')} |
| 28 | `ai-chat-view-button-13` | [frontend/src/components/AIChatView.tsx:810](../../frontend/src/components/AIChatView.tsx) | 로그인하고 대화 이어가기 | {() => onRequireLogin('AI와 대화를 이어가려면 로그인이 필요해요.')} |
| 29 | `ai-chat-view-button-14` | [frontend/src/components/AIChatView.tsx:823](../../frontend/src/components/AIChatView.tsx) | 대화 마무리 | {beginFinish} |
| 30 | `ai-chat-view-button-15` | [frontend/src/components/AIChatView.tsx:832](../../frontend/src/components/AIChatView.tsx) | 새 답변 요청 | {retrySave} |
| 31 | `ai-chat-view-button-16` | [frontend/src/components/AIChatView.tsx:843](../../frontend/src/components/AIChatView.tsx) | 보내기 | (form submit 또는 상위 핸들러) |
| 32 | `ai-chat-view-button-17` | [frontend/src/components/AIChatView.tsx:862](../../frontend/src/components/AIChatView.tsx) | "취소" | {() => setShowExitChoice(false)} |
| 33 | `ai-chat-view-button-18` | [frontend/src/components/AIChatView.tsx:881](../../frontend/src/components/AIChatView.tsx) | 남겨두고 닫기 | {keepAndClose} |
| 34 | `ai-chat-view-button-19` | [frontend/src/components/AIChatView.tsx:887](../../frontend/src/components/AIChatView.tsx) | 대화 삭제하고 닫기 | {() => { void discardAndClose(); }} |
| 35 | `ai-chat-view-button-20` | [frontend/src/components/AIChatView.tsx:907](../../frontend/src/components/AIChatView.tsx) | (동적 JSX/아이콘) | {() => { void finishWithFeedback((index + 1) as 1 \| 2 \| 3 \| 4 \| 5); }} |
| 36 | `ai-chat-view-button-21` | [frontend/src/components/AIChatView.tsx:916](../../frontend/src/components/AIChatView.tsx) | 건너뛰기 | {() => { void finishWithFeedback(null); }} |
| 37 | `ai-chat-view-button-22` | [frontend/src/components/AIChatView.tsx:918](../../frontend/src/components/AIChatView.tsx) | 평가 없이 닫기 | {finishAndKeep} |
| 38 | `ai-chat-view-button-23` | [frontend/src/components/AIChatView.tsx:920](../../frontend/src/components/AIChatView.tsx) | 대화로 돌아가기 | {() => setShowFeedback(false)} |
| 39 | `ai-error-report-modal-button-01` | [frontend/src/components/AIErrorReportModal.tsx:40](../../frontend/src/components/AIErrorReportModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 40 | `ai-error-report-modal-button-02` | [frontend/src/components/AIErrorReportModal.tsx:68](../../frontend/src/components/AIErrorReportModal.tsx) | 취소 | {onClose} |
| 41 | `ai-error-report-modal-button-03` | [frontend/src/components/AIErrorReportModal.tsx:75](../../frontend/src/components/AIErrorReportModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 42 | `ai-explain-settings-modal-button-01` | [frontend/src/components/AIExplainSettingsModal.tsx:29](../../frontend/src/components/AIExplainSettingsModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 43 | `ai-explain-settings-modal-button-02` | [frontend/src/components/AIExplainSettingsModal.tsx:89](../../frontend/src/components/AIExplainSettingsModal.tsx) | 확인 | {() => onConfirm(ratio)} |
| 44 | `adult-verification-modal-button-01` | [frontend/src/components/AdultVerificationModal.tsx:20](../../frontend/src/components/AdultVerificationModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 45 | `adult-verification-modal-button-02` | [frontend/src/components/AdultVerificationModal.tsx:43](../../frontend/src/components/AdultVerificationModal.tsx) | 간편 성인 인증하기 | {() => { onVerify(); onClose(); }} |
| 46 | `analytics-consent-button-01` | [frontend/src/components/AnalyticsConsent.tsx:20](../../frontend/src/components/AnalyticsConsent.tsx) | 거부 | {() => setAnalyticsConsent('refused')} |
| 47 | `analytics-consent-button-02` | [frontend/src/components/AnalyticsConsent.tsx:21](../../frontend/src/components/AnalyticsConsent.tsx) | 동의 | {() => setAnalyticsConsent('accepted')} |
| 48 | `analytics-consent-button-03` | [frontend/src/components/AnalyticsConsent.tsx:40](../../frontend/src/components/AnalyticsConsent.tsx) | (동적 JSX/아이콘) | {() => setAnalyticsConsent('refused')} |
| 49 | `analytics-consent-button-04` | [frontend/src/components/AnalyticsConsent.tsx:41](../../frontend/src/components/AnalyticsConsent.tsx) | 동의 | {() => setAnalyticsConsent('accepted')} |
| 50 | `balance-game-section-button-01` | [frontend/src/components/BalanceGameSection.tsx:253](../../frontend/src/components/BalanceGameSection.tsx) | "이전 배너 보기" | {handlePrev} |
| 51 | `balance-game-section-button-02` | [frontend/src/components/BalanceGameSection.tsx:260](../../frontend/src/components/BalanceGameSection.tsx) | "다음 배너 보기" | {handleNext} |
| 52 | `balance-game-section-button-03` | [frontend/src/components/BalanceGameSection.tsx:291](../../frontend/src/components/BalanceGameSection.tsx) | 다시 불러오기 | {() => void loadState()} |
| 53 | `balance-game-section-button-04` | [frontend/src/components/BalanceGameSection.tsx:313](../../frontend/src/components/BalanceGameSection.tsx) | (동적 JSX/아이콘) | {() => handleVote(game.id, 'B')} |
| 54 | `balance-game-section-button-05` | [frontend/src/components/BalanceGameSection.tsx:324](../../frontend/src/components/BalanceGameSection.tsx) | (동적 JSX/아이콘) | {() => handleVote(game.id, 'A')} |
| 55 | `balance-game-section-self-button-01` | [frontend/src/components/BalanceGameSection.tsx:355](../../frontend/src/components/BalanceGameSection.tsx) | {\`밸런스 게임 ${idx + 1} 보기\`} | {() => setCurrentIndex(idx)} |
| 56 | `create-story-modal-button-01` | [frontend/src/components/CreateStoryModal.tsx:115](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 57 | `create-story-modal-button-02` | [frontend/src/components/CreateStoryModal.tsx:137](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | {() => setCategory(cat)} |
| 58 | `create-story-modal-button-03` | [frontend/src/components/CreateStoryModal.tsx:232](../../frontend/src/components/CreateStoryModal.tsx) | 취소 | {onClose} |
| 59 | `create-story-modal-button-04` | [frontend/src/components/CreateStoryModal.tsx:239](../../frontend/src/components/CreateStoryModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 60 | `crisis-support-modal-button-01` | [frontend/src/components/CrisisSupportModal.tsx:87](../../frontend/src/components/CrisisSupportModal.tsx) | (동적 JSX/아이콘) | {onContinue} |
| 61 | `crisis-support-modal-button-02` | [frontend/src/components/CrisisSupportModal.tsx:94](../../frontend/src/components/CrisisSupportModal.tsx) | 닫기 | {onClose} |
| 62 | `delete-confirm-modal-button-01` | [frontend/src/components/DeleteConfirmModal.tsx:26](../../frontend/src/components/DeleteConfirmModal.tsx) | 취소 | {onClose} |
| 63 | `delete-confirm-modal-button-02` | [frontend/src/components/DeleteConfirmModal.tsx:33](../../frontend/src/components/DeleteConfirmModal.tsx) | (동적 JSX/아이콘) | {onConfirm} |
| 64 | `header-button-01` | [frontend/src/components/Header.tsx:59](../../frontend/src/components/Header.tsx) | "사연 등록" | {onOpenCreateStory} |
| 65 | `header-button-02` | [frontend/src/components/Header.tsx:73](../../frontend/src/components/Header.tsx) | {\`내 계정 (${user.nickname})\`} | {onOpenProfile} |
| 66 | `login-prompt-modal-button-01` | [frontend/src/components/LoginPromptModal.tsx:30](../../frontend/src/components/LoginPromptModal.tsx) | 로그인 하러가기 | {onGoToLogin} |
| 67 | `login-prompt-modal-button-02` | [frontend/src/components/LoginPromptModal.tsx:36](../../frontend/src/components/LoginPromptModal.tsx) | 더 둘러볼게요 | {onClose} |
| 68 | `my-page-view-button-01` | [frontend/src/components/MyPageView.tsx:318](../../frontend/src/components/MyPageView.tsx) | 로그인 하러가기 | {() => onRequireLogin?.('로그인하면 사연 등록과 투표, 댓글, AI 대화를 모두 이용하실 수 있어요.')} |
| 69 | `my-page-view-button-02` | [frontend/src/components/MyPageView.tsx:334](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setFaqOpen(faqOpen === i ? null : i)} |
| 70 | `my-page-view-button-03` | [frontend/src/components/MyPageView.tsx:374](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 71 | `my-page-view-button-04` | [frontend/src/components/MyPageView.tsx:382](../../frontend/src/components/MyPageView.tsx) | 작성한 사연 ( ) | {() => handleTabChange('stories')} |
| 72 | `my-page-view-button-05` | [frontend/src/components/MyPageView.tsx:390](../../frontend/src/components/MyPageView.tsx) | 참여한 투표 ( ) | {() => handleTabChange('votes')} |
| 73 | `my-page-view-button-06` | [frontend/src/components/MyPageView.tsx:398](../../frontend/src/components/MyPageView.tsx) | 작성한 댓글 ( ) | {() => handleTabChange('comments')} |
| 74 | `my-page-view-button-07` | [frontend/src/components/MyPageView.tsx:415](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setCurrentPage(i + 1)} |
| 75 | `my-page-view-button-08` | [frontend/src/components/MyPageView.tsx:437](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 76 | `my-page-view-button-09` | [frontend/src/components/MyPageView.tsx:461](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 77 | `my-page-view-button-10` | [frontend/src/components/MyPageView.tsx:471](../../frontend/src/components/MyPageView.tsx) | 계정 탈퇴 | {() => setShowDeleteModal(true)} |
| 78 | `my-page-view-button-11` | [frontend/src/components/MyPageView.tsx:506](../../frontend/src/components/MyPageView.tsx) | 취소 | {() => setShowDeleteModal(false)} |
| 79 | `my-page-view-button-12` | [frontend/src/components/MyPageView.tsx:509](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { setDeleting(true); const { error } = await supabase.rpc('delete_my_account'); if (error) { setDeleting(false); |
| 80 | `my-page-view-button-13` | [frontend/src/components/MyPageView.tsx:539](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 81 | `my-page-view-button-14` | [frontend/src/components/MyPageView.tsx:586](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { const text = (replyDraft[q.id] ?? '').trim(); if (!text) return; setReplyingId(q.id); const ok = await replyTo |
| 82 | `my-page-view-button-15` | [frontend/src/components/MyPageView.tsx:616](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 83 | `my-page-view-button-19` | [frontend/src/components/MyPageView.tsx:633](../../frontend/src/components/MyPageView.tsx) | "요약 화면으로 돌아가기" | {() => setViewMode('summary')} |
| 84 | `my-page-view-button-20` | [frontend/src/components/MyPageView.tsx:646](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setFaqOpen(faqOpen === i ? null : i)} |
| 85 | `my-page-view-button-21` | [frontend/src/components/MyPageView.tsx:672](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { setInquirySending(true); const { data: sess } = await supabase.auth.getUser(); const uid = sess?.user?.id; if  |
| 86 | `my-page-view-button-22` | [frontend/src/components/MyPageView.tsx:760](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 87 | `my-page-view-button-23` | [frontend/src/components/MyPageView.tsx:767](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { const nickname = await onGenerateRandomNickname(); if (nickname) { setNicknameInput(nickname); setNicknameErro |
| 88 | `my-page-view-button-24` | [frontend/src/components/MyPageView.tsx:788](../../frontend/src/components/MyPageView.tsx) | EDIT | {() => { setNicknameInput(user.nickname); setIsEditingNickname(true); }} |
| 89 | `my-page-view-button-25` | [frontend/src/components/MyPageView.tsx:833](../../frontend/src/components/MyPageView.tsx) | 작성한 사연 ( ) | {() => handleTabChange('stories')} |
| 90 | `my-page-view-button-26` | [frontend/src/components/MyPageView.tsx:841](../../frontend/src/components/MyPageView.tsx) | 참여한 투표 ( ) | {() => handleTabChange('votes')} |
| 91 | `my-page-view-button-27` | [frontend/src/components/MyPageView.tsx:849](../../frontend/src/components/MyPageView.tsx) | 작성한 댓글 ( ) | {() => handleTabChange('comments')} |
| 92 | `my-page-view-button-28` | [frontend/src/components/MyPageView.tsx:862](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => { setStoryVisibilityFilter(filter); setCurrentPage(1); }} |
| 93 | `my-page-view-button-29` | [frontend/src/components/MyPageView.tsx:877](../../frontend/src/components/MyPageView.tsx) | 더보기 | {() => setViewMode('more')} |
| 94 | `my-page-view-button-30` | [frontend/src/components/MyPageView.tsx:896](../../frontend/src/components/MyPageView.tsx) | 다시 시도 | {onRetryHiddenStories} |
| 95 | `my-page-view-button-31` | [frontend/src/components/MyPageView.tsx:904](../../frontend/src/components/MyPageView.tsx) | 다시 보기 | {() => void onRestoreStory(story.id)} |
| 96 | `my-page-view-button-32` | [frontend/src/components/MyPageView.tsx:912](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('account')} |
| 97 | `my-page-view-button-33` | [frontend/src/components/MyPageView.tsx:916](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('notifications')} |
| 98 | `my-page-view-button-34` | [frontend/src/components/MyPageView.tsx:920](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('support')} |
| 99 | `my-page-view-button-35` | [frontend/src/components/MyPageView.tsx:927](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => setViewMode('inquiryAdmin')} |
| 100 | `my-page-view-button-36` | [frontend/src/components/MyPageView.tsx:967](../../frontend/src/components/MyPageView.tsx) | 그만두기 | {() => { setConfirmWipe(false); setWipeError(false); }} |
| 101 | `my-page-view-button-37` | [frontend/src/components/MyPageView.tsx:974](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {async () => { setWiping(true); setWipeError(false); try { if (await onDeleteAllAiChats()) setConfirmWipe(false); else setWip |
| 102 | `my-page-view-button-38` | [frontend/src/components/MyPageView.tsx:994](../../frontend/src/components/MyPageView.tsx) | 전부 지우기 | {() => { setConfirmWipe(true); setWipeError(false); }} |
| 103 | `my-page-view-button-39` | [frontend/src/components/MyPageView.tsx:1007](../../frontend/src/components/MyPageView.tsx) | (동적 JSX/아이콘) | {() => supabase.auth.signOut()} |
| 104 | `navbar-button-01` | [frontend/src/components/Navbar.tsx:15](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | {() => onTabChange('feed')} |
| 105 | `navbar-button-02` | [frontend/src/components/Navbar.tsx:27](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | {() => onTabChange('ai-chat')} |
| 106 | `navbar-button-03` | [frontend/src/components/Navbar.tsx:39](../../frontend/src/components/Navbar.tsx) | (동적 JSX/아이콘) | {() => onTabChange('mypage')} |
| 107 | `premium-modal-button-01` | [frontend/src/components/PremiumModal.tsx:29](../../frontend/src/components/PremiumModal.tsx) | "닫기" | {onClose} |
| 108 | `premium-modal-button-02` | [frontend/src/components/PremiumModal.tsx:60](../../frontend/src/components/PremiumModal.tsx) | 내 사연 보기 | {onOpenMyStories} |
| 109 | `premium-modal-button-03` | [frontend/src/components/PremiumModal.tsx:67](../../frontend/src/components/PremiumModal.tsx) | 기존 대화 이어가기 | {onOpenExistingChats} |
| 110 | `premium-modal-button-04` | [frontend/src/components/PremiumModal.tsx:74](../../frontend/src/components/PremiumModal.tsx) | 닫기 | {onClose} |
| 111 | `report-modal-button-01` | [frontend/src/components/ReportModal.tsx:96](../../frontend/src/components/ReportModal.tsx) | "닫기" | {onClose} |
| 112 | `report-modal-button-02` | [frontend/src/components/ReportModal.tsx:156](../../frontend/src/components/ReportModal.tsx) | 취소 | {onClose} |
| 113 | `report-modal-button-03` | [frontend/src/components/ReportModal.tsx:164](../../frontend/src/components/ReportModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 114 | `session-summary-card-button-01` | [frontend/src/components/SessionSummaryCard.tsx:49](../../frontend/src/components/SessionSummaryCard.tsx) | 오늘의 대화 요약으로 돌아가기 | {() => setCollapsed(false)} |
| 115 | `session-summary-card-button-02` | [frontend/src/components/SessionSummaryCard.tsx:85](../../frontend/src/components/SessionSummaryCard.tsx) | (동적 JSX/아이콘) | {() => { setCollapsed(true); onJumpToMessage(m.id); }} |
| 116 | `session-summary-card-button-03` | [frontend/src/components/SessionSummaryCard.tsx:115](../../frontend/src/components/SessionSummaryCard.tsx) | 더 이야기할래요 | {onContinue} |
| 117 | `session-summary-card-button-04` | [frontend/src/components/SessionSummaryCard.tsx:122](../../frontend/src/components/SessionSummaryCard.tsx) | 여기서 마무리 | {onFinish} |
| 118 | `share-result-bar-button-01` | [frontend/src/components/ShareResultBar.tsx:62](../../frontend/src/components/ShareResultBar.tsx) | 닉네임 없이 결과만 담긴 카드로 나갑니다 | {onPreview} |
| 119 | `share-result-bar-button-02` | [frontend/src/components/ShareResultBar.tsx:73](../../frontend/src/components/ShareResultBar.tsx) | "결과 카드 이미지 저장" | {handleDownload} |
| 120 | `share-result-bar-button-03` | [frontend/src/components/ShareResultBar.tsx:83](../../frontend/src/components/ShareResultBar.tsx) | 결과 공유하기 | {handleShare} |
| 121 | `story-card-button-01` | [frontend/src/components/StoryCard.tsx:129](../../frontend/src/components/StoryCard.tsx) | 이의 제기 | {(e) => { e.stopPropagation(); onAppeal?.(story.id); }} |
| 122 | `story-card-button-02` | [frontend/src/components/StoryCard.tsx:181](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} |
| 123 | `story-card-button-03` | [frontend/src/components/StoryCard.tsx:194](../../frontend/src/components/StoryCard.tsx) | 수정 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(story.id); }} |
| 124 | `story-card-button-04` | [frontend/src/components/StoryCard.tsx:199](../../frontend/src/components/StoryCard.tsx) | 숨기기 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onHide(story.id); }} |
| 125 | `story-card-button-05` | [frontend/src/components/StoryCard.tsx:203](../../frontend/src/components/StoryCard.tsx) | 신고 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onReport(story.id); }} |
| 126 | `story-card-button-06` | [frontend/src/components/StoryCard.tsx:207](../../frontend/src/components/StoryCard.tsx) | 삭제 | {(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(story.id); }} |
| 127 | `story-card-button-07` | [frontend/src/components/StoryCard.tsx:227](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} |
| 128 | `story-card-button-08` | [frontend/src/components/StoryCard.tsx:260](../../frontend/src/components/StoryCard.tsx) | 니 편 | {(e) => { e.stopPropagation(); if (isBlurRequired && onRequireAdultVerification) { onRequireAdultVerification(); return; } ha |
| 129 | `story-card-button-09` | [frontend/src/components/StoryCard.tsx:283](../../frontend/src/components/StoryCard.tsx) | 내 편 | {(e) => { e.stopPropagation(); if (isBlurRequired && onRequireAdultVerification) { onRequireAdultVerification(); return; } ha |
| 130 | `story-card-button-10` | [frontend/src/components/StoryCard.tsx:329](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); if (isBlurRequired) { if (onRequireAdultVerification) onRequireAdultVerification(); return; }  |
| 131 | `story-card-button-11` | [frontend/src/components/StoryCard.tsx:369](../../frontend/src/components/StoryCard.tsx) | 전체 | {() => setActiveCommentTab('all')} |
| 132 | `story-card-button-12` | [frontend/src/components/StoryCard.tsx:375](../../frontend/src/components/StoryCard.tsx) | 내 편 | {() => setActiveCommentTab('A')} |
| 133 | `story-card-button-13` | [frontend/src/components/StoryCard.tsx:381](../../frontend/src/components/StoryCard.tsx) | 니 편 | {() => setActiveCommentTab('B')} |
| 134 | `story-card-button-14` | [frontend/src/components/StoryCard.tsx:388](../../frontend/src/components/StoryCard.tsx) | (동적 JSX/아이콘) | {() => setActiveCommentTab(null)} |
| 135 | `story-detail-modal-button-01` | [frontend/src/components/StoryDetailModal.tsx:290](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} |
| 136 | `story-detail-modal-button-02` | [frontend/src/components/StoryDetailModal.tsx:302](../../frontend/src/components/StoryDetailModal.tsx) | 수정 | {() => { setIsMenuOpen(false); onEditStory(story.id); onClose(); }} |
| 137 | `story-detail-modal-button-03` | [frontend/src/components/StoryDetailModal.tsx:307](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {async () => { const next = isPrivate ? 'public' : 'private'; if (next === 'private' && !window.confirm( '사연을 비공개로 옮길까요? 다른 이 |
| 138 | `story-detail-modal-button-04` | [frontend/src/components/StoryDetailModal.tsx:322](../../frontend/src/components/StoryDetailModal.tsx) | 숨기기 | {async () => { setIsMenuOpen(false); if (await onHideStory(story.id)) onClose(); }} |
| 139 | `story-detail-modal-button-05` | [frontend/src/components/StoryDetailModal.tsx:326](../../frontend/src/components/StoryDetailModal.tsx) | 신고 | {() => { setIsMenuOpen(false); onReportStory(story.id); }} |
| 140 | `story-detail-modal-button-06` | [frontend/src/components/StoryDetailModal.tsx:330](../../frontend/src/components/StoryDetailModal.tsx) | 삭제 | {() => { setIsMenuOpen(false); onDeleteStory(story.id); }} |
| 141 | `story-detail-modal-button-07` | [frontend/src/components/StoryDetailModal.tsx:337](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {onClose} |
| 142 | `story-detail-modal-button-08` | [frontend/src/components/StoryDetailModal.tsx:392](../../frontend/src/components/StoryDetailModal.tsx) | 사연 보기 | {() => setShowSensitiveBody(true)} |
| 143 | `story-detail-modal-button-09` | [frontend/src/components/StoryDetailModal.tsx:427](../../frontend/src/components/StoryDetailModal.tsx) | 니 편 | {() => handleVote('B')} |
| 144 | `story-detail-modal-button-10` | [frontend/src/components/StoryDetailModal.tsx:441](../../frontend/src/components/StoryDetailModal.tsx) | 내 편 | {() => handleVote('A')} |
| 145 | `story-detail-modal-button-11` | [frontend/src/components/StoryDetailModal.tsx:500](../../frontend/src/components/StoryDetailModal.tsx) | 시작하기 | {() => onStartAIChat(story)} |
| 146 | `story-detail-modal-button-12` | [frontend/src/components/StoryDetailModal.tsx:560](../../frontend/src/components/StoryDetailModal.tsx) | {\`댓글 공감 ${c.userLiked ? '취소' : '하기'} · ${c.likeCount}개\`} | {() => onLikeComment(c.id)} |
| 147 | `story-detail-modal-button-13` | [frontend/src/components/StoryDetailModal.tsx:572](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {() => setCommentMenuOpenId(commentMenuOpenId === c.id ? null : c.id)} |
| 148 | `story-detail-modal-button-14` | [frontend/src/components/StoryDetailModal.tsx:577](../../frontend/src/components/StoryDetailModal.tsx) | 수정 | {() => { setEditingCommentId(c.id); setEditingCommentText(c.content); setCommentMenuOpenId(null); }} |
| 149 | `story-detail-modal-button-15` | [frontend/src/components/StoryDetailModal.tsx:578](../../frontend/src/components/StoryDetailModal.tsx) | 삭제 | {async () => { if (!onDeleteComment \|\| commentMutationId) return; setCommentMutationId(c.id); let deleted = false; try { de |
| 150 | `story-detail-modal-button-16` | [frontend/src/components/StoryDetailModal.tsx:595](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {() => onReportComment(c.id)} |
| 151 | `story-detail-modal-button-17` | [frontend/src/components/StoryDetailModal.tsx:610](../../frontend/src/components/StoryDetailModal.tsx) | 취소 | {() => setEditingCommentId(null)} |
| 152 | `story-detail-modal-button-18` | [frontend/src/components/StoryDetailModal.tsx:611](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | {async () => { if (!onEditComment \|\| commentMutationId \|\| !editingCommentText.trim()) return; setCommentMutationId(c.id); |
| 153 | `story-detail-modal-button-19` | [frontend/src/components/StoryDetailModal.tsx:654](../../frontend/src/components/StoryDetailModal.tsx) | 로그인하고 댓글 남기기 | {() => onRequireLogin?.('댓글을 남기려면 로그인이 필요해요.')} |
| 154 | `story-detail-modal-button-20` | [frontend/src/components/StoryDetailModal.tsx:679](../../frontend/src/components/StoryDetailModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 155 | `story-detail-modal-button-21` | [frontend/src/components/StoryDetailModal.tsx:718](../../frontend/src/components/StoryDetailModal.tsx) | 닫기 | {closePreview} |
| 156 | `weekly-top-banner-button-01` | [frontend/src/components/WeeklyTopBanner.tsx:211](../../frontend/src/components/WeeklyTopBanner.tsx) | "이전 배너 보기" | {toggleBanner} |
| 157 | `weekly-top-banner-button-02` | [frontend/src/components/WeeklyTopBanner.tsx:218](../../frontend/src/components/WeeklyTopBanner.tsx) | "다음 배너 보기" | {toggleBanner} |
| 158 | `weekly-top-banner-self-button-01` | [frontend/src/components/WeeklyTopBanner.tsx:263](../../frontend/src/components/WeeklyTopBanner.tsx) | {paneLabel(pane.key)} | {() => setActiveIndex(idx)} |
| 159 | `welcome-modal-button-01` | [frontend/src/components/WelcomeModal.tsx:331](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 160 | `welcome-modal-button-02` | [frontend/src/components/WelcomeModal.tsx:339](../../frontend/src/components/WelcomeModal.tsx) | 다른 이메일 사용하기 | {() => setRecoveryPhase('request')} |
| 161 | `welcome-modal-button-03` | [frontend/src/components/WelcomeModal.tsx:356](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 162 | `welcome-modal-button-04` | [frontend/src/components/WelcomeModal.tsx:364](../../frontend/src/components/WelcomeModal.tsx) | 새 재설정 메일 요청하기 | {() => setRecoveryPhase('request')} |
| 163 | `welcome-modal-button-05` | [frontend/src/components/WelcomeModal.tsx:369](../../frontend/src/components/WelcomeModal.tsx) | 니편내편 계속 이용하기 | {() => { setRecoveryPhase('idle'); onPasswordRecoveryComplete(); }} |
| 164 | `welcome-modal-button-06` | [frontend/src/components/WelcomeModal.tsx:393](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 165 | `welcome-modal-button-07` | [frontend/src/components/WelcomeModal.tsx:408](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | {() => void handleResend(confirmationEmail)} |
| 166 | `welcome-modal-button-08` | [frontend/src/components/WelcomeModal.tsx:416](../../frontend/src/components/WelcomeModal.tsx) | 다른 이메일로 가입하기 | {() => { setConfirmationEmail(null); setEmail(''); setErrorMsg(''); setResendMessage(''); setIsLoginMode(false); }} |
| 167 | `welcome-modal-button-09` | [frontend/src/components/WelcomeModal.tsx:434](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | {() => void handleResend(email)} |
| 168 | `welcome-modal-button-10` | [frontend/src/components/WelcomeModal.tsx:439](../../frontend/src/components/WelcomeModal.tsx) | 다른 이메일 사용하기 | {() => { setEmail(''); setEmailCheckPhase('entry'); }} |
| 169 | `welcome-modal-button-11` | [frontend/src/components/WelcomeModal.tsx:458](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 170 | `welcome-modal-button-12` | [frontend/src/components/WelcomeModal.tsx:520](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | (form submit 또는 상위 핸들러) |
| 171 | `welcome-modal-button-13` | [frontend/src/components/WelcomeModal.tsx:529](../../frontend/src/components/WelcomeModal.tsx) | 비밀번호를 잊으셨나요? | {() => { setRecoveryError(''); setRecoveryPhase('request'); }} |
| 172 | `welcome-modal-button-14` | [frontend/src/components/WelcomeModal.tsx:536](../../frontend/src/components/WelcomeModal.tsx) | 로그인 없이 둘러보기 | {() => { setShowExpiredLink(false); onGuestBrowse(); }} |
| 173 | `welcome-modal-button-15` | [frontend/src/components/WelcomeModal.tsx:549](../../frontend/src/components/WelcomeModal.tsx) | 로그인으로 돌아가기 | {() => { setRecoveryPhase('idle'); setRecoveryError(''); }} |
| 174 | `welcome-modal-button-16` | [frontend/src/components/WelcomeModal.tsx:553](../../frontend/src/components/WelcomeModal.tsx) | (동적 JSX/아이콘) | {() => { if (emailCheckEnabled && isLoginMode && emailCheckPhase === 'registered') { setEmail(''); setEmailCheckPhase('entry' |

이 목록은 버튼 기능·GA4·권한 검증의 완료 증거가 아니다. 다음 검토에서 화면/노출 조건, 요청 성공·실패·취소, 이벤트 또는 제외 이유, 실제 검증 케이스를 채운다. 특히 위기 지원·개인정보 행동은 첫 공개 GA4의 제외 대상이다.
