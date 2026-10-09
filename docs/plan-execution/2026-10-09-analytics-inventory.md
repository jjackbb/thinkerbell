# 전체 화면·행동 계측 목록 — 2026-10-09

정책은 PLAN §3. 현재 코드의 정적 목록이며 조건부 노출·기능 작동·GA4 수신 판정과 구분한다. 민감 화면/영역의 모든 하위 행동은 아래 개별 허용 여부와 관계없이 제외된다. 전파 제어만 하는 컨테이너는 행동으로 세지 않는다. 반복 카드는 동일한 행동 ID를 사용하며 원문·대상 ID·링크 주소를 보내지 않는다.

생성: `node tools/generate-analytics-inventory.mjs`. 총 190개, 개별 제외 54개.

| ID | 종류 | 개별 정책 | 코드 |
| --- | --- | --- | --- |
| `app-button-01` | button | 제외 | [frontend/src/App.tsx:1782](../../frontend/src/App.tsx) |
| `app-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/App.tsx:1815](../../frontend/src/App.tsx) |
| `app-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/App.tsx:1831](../../frontend/src/App.tsx) |
| `app-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/App.tsx:1841](../../frontend/src/App.tsx) |
| `app-button-05` | button | 허용 (민감 영역 제외) | [frontend/src/App.tsx:1863](../../frontend/src/App.tsx) |
| `app-button-06` | button | 허용 (민감 영역 제외) | [frontend/src/App.tsx:2017](../../frontend/src/App.tsx) |
| `app-button-07` | button | 허용 (민감 영역 제외) | [frontend/src/App.tsx:2028](../../frontend/src/App.tsx) |
| `app-button-08` | button | 제외 | [frontend/src/App.tsx:2097](../../frontend/src/App.tsx) |
| `app-button-09` | button | 제외 | [frontend/src/App.tsx:2104](../../frontend/src/App.tsx) |
| `app-button-10` | button | 제외 | [frontend/src/App.tsx:2239](../../frontend/src/App.tsx) |
| `ai-chat-mode-selection-modal-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatModeSelectionModal.tsx:50](../../frontend/src/components/AIChatModeSelectionModal.tsx) |
| `ai-chat-mode-selection-modal-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatModeSelectionModal.tsx:58](../../frontend/src/components/AIChatModeSelectionModal.tsx) |
| `ai-chat-mode-selection-modal-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatModeSelectionModal.tsx:67](../../frontend/src/components/AIChatModeSelectionModal.tsx) |
| `ai-chat-mode-selection-modal-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatModeSelectionModal.tsx:82](../../frontend/src/components/AIChatModeSelectionModal.tsx) |
| `ai-chat-mode-selection-modal-button-05` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatModeSelectionModal.tsx:107](../../frontend/src/components/AIChatModeSelectionModal.tsx) |
| `ai-chat-view-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:545](../../frontend/src/components/AIChatView.tsx) |
| `a-i-chat-view-action-01` | card | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:557](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:578](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:597](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-04` | button | 제외 | [frontend/src/components/AIChatView.tsx:602](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-05` | button | 제외 | [frontend/src/components/AIChatView.tsx:607](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-06` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:631](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-07` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:661](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-08` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:677](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-09` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:681](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-10` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:737](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-11` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:788](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-12` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:795](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-13` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:832](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-14` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:845](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-15` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:854](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-16` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:865](../../frontend/src/components/AIChatView.tsx) |
| `a-i-chat-view-action-02` | card | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:878](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-17` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:884](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-18` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:903](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-19` | button | 제외 | [frontend/src/components/AIChatView.tsx:909](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-20` | button | 제외 | [frontend/src/components/AIChatView.tsx:929](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-21` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:938](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-22` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:940](../../frontend/src/components/AIChatView.tsx) |
| `ai-chat-view-button-23` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIChatView.tsx:942](../../frontend/src/components/AIChatView.tsx) |
| `a-i-error-report-modal-action-01` | card | 허용 (민감 영역 제외) | [frontend/src/components/AIErrorReportModal.tsx:31](../../frontend/src/components/AIErrorReportModal.tsx) |
| `ai-error-report-modal-button-01` | button | 제외 | [frontend/src/components/AIErrorReportModal.tsx:40](../../frontend/src/components/AIErrorReportModal.tsx) |
| `ai-error-report-modal-button-02` | button | 제외 | [frontend/src/components/AIErrorReportModal.tsx:68](../../frontend/src/components/AIErrorReportModal.tsx) |
| `ai-error-report-modal-button-03` | button | 제외 | [frontend/src/components/AIErrorReportModal.tsx:75](../../frontend/src/components/AIErrorReportModal.tsx) |
| `ai-explain-settings-modal-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIExplainSettingsModal.tsx:29](../../frontend/src/components/AIExplainSettingsModal.tsx) |
| `ai-explain-settings-modal-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/AIExplainSettingsModal.tsx:89](../../frontend/src/components/AIExplainSettingsModal.tsx) |
| `adult-verification-modal-button-01` | button | 제외 | [frontend/src/components/AdultVerificationModal.tsx:20](../../frontend/src/components/AdultVerificationModal.tsx) |
| `adult-verification-modal-button-02` | button | 제외 | [frontend/src/components/AdultVerificationModal.tsx:43](../../frontend/src/components/AdultVerificationModal.tsx) |
| `analytics-consent-button-01` | button | 제외 | [frontend/src/components/AnalyticsConsent.tsx:20](../../frontend/src/components/AnalyticsConsent.tsx) |
| `analytics-consent-button-02` | button | 제외 | [frontend/src/components/AnalyticsConsent.tsx:21](../../frontend/src/components/AnalyticsConsent.tsx) |
| `analytics-consent-button-03` | button | 제외 | [frontend/src/components/AnalyticsConsent.tsx:40](../../frontend/src/components/AnalyticsConsent.tsx) |
| `analytics-consent-button-04` | button | 제외 | [frontend/src/components/AnalyticsConsent.tsx:41](../../frontend/src/components/AnalyticsConsent.tsx) |
| `balance-game-section-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/BalanceGameSection.tsx:270](../../frontend/src/components/BalanceGameSection.tsx) |
| `balance-game-section-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/BalanceGameSection.tsx:277](../../frontend/src/components/BalanceGameSection.tsx) |
| `balance-game-section-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/BalanceGameSection.tsx:308](../../frontend/src/components/BalanceGameSection.tsx) |
| `balance-game-section-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/components/BalanceGameSection.tsx:330](../../frontend/src/components/BalanceGameSection.tsx) |
| `balance-game-section-button-05` | button | 허용 (민감 영역 제외) | [frontend/src/components/BalanceGameSection.tsx:341](../../frontend/src/components/BalanceGameSection.tsx) |
| `balance-game-section-self-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/BalanceGameSection.tsx:372](../../frontend/src/components/BalanceGameSection.tsx) |
| `create-story-modal-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/CreateStoryModal.tsx:123](../../frontend/src/components/CreateStoryModal.tsx) |
| `create-story-modal-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/CreateStoryModal.tsx:145](../../frontend/src/components/CreateStoryModal.tsx) |
| `create-story-modal-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/CreateStoryModal.tsx:240](../../frontend/src/components/CreateStoryModal.tsx) |
| `create-story-modal-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/components/CreateStoryModal.tsx:247](../../frontend/src/components/CreateStoryModal.tsx) |
| `crisis-support-modal-action-01` | link | 허용 (민감 영역 제외) | [frontend/src/components/CrisisSupportModal.tsx:44](../../frontend/src/components/CrisisSupportModal.tsx) |
| `crisis-support-modal-action-02` | link | 허용 (민감 영역 제외) | [frontend/src/components/CrisisSupportModal.tsx:55](../../frontend/src/components/CrisisSupportModal.tsx) |
| `crisis-support-modal-action-03` | link | 허용 (민감 영역 제외) | [frontend/src/components/CrisisSupportModal.tsx:64](../../frontend/src/components/CrisisSupportModal.tsx) |
| `crisis-support-modal-action-04` | link | 허용 (민감 영역 제외) | [frontend/src/components/CrisisSupportModal.tsx:71](../../frontend/src/components/CrisisSupportModal.tsx) |
| `crisis-support-modal-button-01` | button | 제외 | [frontend/src/components/CrisisSupportModal.tsx:87](../../frontend/src/components/CrisisSupportModal.tsx) |
| `crisis-support-modal-button-02` | button | 제외 | [frontend/src/components/CrisisSupportModal.tsx:94](../../frontend/src/components/CrisisSupportModal.tsx) |
| `delete-confirm-modal-button-01` | button | 제외 | [frontend/src/components/DeleteConfirmModal.tsx:26](../../frontend/src/components/DeleteConfirmModal.tsx) |
| `delete-confirm-modal-button-02` | button | 제외 | [frontend/src/components/DeleteConfirmModal.tsx:33](../../frontend/src/components/DeleteConfirmModal.tsx) |
| `header-action-01` | card | 허용 (민감 영역 제외) | [frontend/src/components/Header.tsx:38](../../frontend/src/components/Header.tsx) |
| `header-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/Header.tsx:59](../../frontend/src/components/Header.tsx) |
| `header-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/Header.tsx:73](../../frontend/src/components/Header.tsx) |
| `login-prompt-modal-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/LoginPromptModal.tsx:30](../../frontend/src/components/LoginPromptModal.tsx) |
| `login-prompt-modal-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/LoginPromptModal.tsx:36](../../frontend/src/components/LoginPromptModal.tsx) |
| `my-page-view-action-01` | card | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:229](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:325](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:341](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-action-02` | link | 제외 | [frontend/src/components/MyPageView.tsx:359](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:381](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:389](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-05` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:397](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-06` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:405](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-07` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:422](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-08` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:444](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-09` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:468](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-10` | button | 제외 | [frontend/src/components/MyPageView.tsx:478](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-11` | button | 제외 | [frontend/src/components/MyPageView.tsx:513](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-12` | button | 제외 | [frontend/src/components/MyPageView.tsx:516](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-13` | button | 제외 | [frontend/src/components/MyPageView.tsx:546](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-14` | button | 제외 | [frontend/src/components/MyPageView.tsx:593](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-15` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:623](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-19` | button | 제외 | [frontend/src/components/MyPageView.tsx:640](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-20` | button | 제외 | [frontend/src/components/MyPageView.tsx:653](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-21` | button | 제외 | [frontend/src/components/MyPageView.tsx:679](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-22` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:767](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-23` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:774](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-24` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:795](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-25` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:840](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-26` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:848](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-27` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:856](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-28` | button | 제외 | [frontend/src/components/MyPageView.tsx:869](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-29` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:884](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-30` | button | 제외 | [frontend/src/components/MyPageView.tsx:903](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-31` | button | 제외 | [frontend/src/components/MyPageView.tsx:911](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-32` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:919](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-33` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:923](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-34` | button | 제외 | [frontend/src/components/MyPageView.tsx:927](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-35` | button | 제외 | [frontend/src/components/MyPageView.tsx:934](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-action-03` | link | 제외 | [frontend/src/components/MyPageView.tsx:942](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-36` | button | 제외 | [frontend/src/components/MyPageView.tsx:974](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-37` | button | 제외 | [frontend/src/components/MyPageView.tsx:981](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-38` | button | 제외 | [frontend/src/components/MyPageView.tsx:1001](../../frontend/src/components/MyPageView.tsx) |
| `my-page-view-button-39` | button | 허용 (민감 영역 제외) | [frontend/src/components/MyPageView.tsx:1014](../../frontend/src/components/MyPageView.tsx) |
| `navbar-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/Navbar.tsx:15](../../frontend/src/components/Navbar.tsx) |
| `navbar-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/Navbar.tsx:27](../../frontend/src/components/Navbar.tsx) |
| `navbar-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/Navbar.tsx:39](../../frontend/src/components/Navbar.tsx) |
| `premium-modal-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/PremiumModal.tsx:29](../../frontend/src/components/PremiumModal.tsx) |
| `premium-modal-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/PremiumModal.tsx:60](../../frontend/src/components/PremiumModal.tsx) |
| `premium-modal-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/PremiumModal.tsx:67](../../frontend/src/components/PremiumModal.tsx) |
| `premium-modal-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/components/PremiumModal.tsx:74](../../frontend/src/components/PremiumModal.tsx) |
| `report-modal-button-01` | button | 제외 | [frontend/src/components/ReportModal.tsx:96](../../frontend/src/components/ReportModal.tsx) |
| `report-modal-button-02` | button | 제외 | [frontend/src/components/ReportModal.tsx:156](../../frontend/src/components/ReportModal.tsx) |
| `report-modal-button-03` | button | 제외 | [frontend/src/components/ReportModal.tsx:164](../../frontend/src/components/ReportModal.tsx) |
| `session-summary-card-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/SessionSummaryCard.tsx:49](../../frontend/src/components/SessionSummaryCard.tsx) |
| `session-summary-card-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/SessionSummaryCard.tsx:85](../../frontend/src/components/SessionSummaryCard.tsx) |
| `session-summary-card-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/SessionSummaryCard.tsx:115](../../frontend/src/components/SessionSummaryCard.tsx) |
| `session-summary-card-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/components/SessionSummaryCard.tsx:122](../../frontend/src/components/SessionSummaryCard.tsx) |
| `share-result-bar-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/ShareResultBar.tsx:67](../../frontend/src/components/ShareResultBar.tsx) |
| `share-result-bar-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/ShareResultBar.tsx:78](../../frontend/src/components/ShareResultBar.tsx) |
| `share-result-bar-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/ShareResultBar.tsx:88](../../frontend/src/components/ShareResultBar.tsx) |
| `story-card-button-01` | button | 제외 | [frontend/src/components/StoryCard.tsx:129](../../frontend/src/components/StoryCard.tsx) |
| `story-card-action-01` | card | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:142](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:181](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:194](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-04` | button | 제외 | [frontend/src/components/StoryCard.tsx:199](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-05` | button | 제외 | [frontend/src/components/StoryCard.tsx:203](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-06` | button | 제외 | [frontend/src/components/StoryCard.tsx:207](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-07` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:227](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-08` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:260](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-09` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:283](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-10` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:329](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-11` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:369](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-12` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:375](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-13` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:381](../../frontend/src/components/StoryCard.tsx) |
| `story-card-button-14` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryCard.tsx:388](../../frontend/src/components/StoryCard.tsx) |
| `story-detail-modal-action-01` | card | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:283](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:299](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:311](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-03` | button | 제외 | [frontend/src/components/StoryDetailModal.tsx:316](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-04` | button | 제외 | [frontend/src/components/StoryDetailModal.tsx:331](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-05` | button | 제외 | [frontend/src/components/StoryDetailModal.tsx:335](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-06` | button | 제외 | [frontend/src/components/StoryDetailModal.tsx:339](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-07` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:346](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-08` | button | 제외 | [frontend/src/components/StoryDetailModal.tsx:401](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-action-02` | link | 제외 | [frontend/src/components/StoryDetailModal.tsx:407](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-09` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:436](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-10` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:450](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-11` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:509](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-12` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:569](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-13` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:581](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-14` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:586](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-15` | button | 제외 | [frontend/src/components/StoryDetailModal.tsx:587](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-16` | button | 제외 | [frontend/src/components/StoryDetailModal.tsx:604](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-17` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:619](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-18` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:620](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-19` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:663](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-20` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:688](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-action-03` | card | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:716](../../frontend/src/components/StoryDetailModal.tsx) |
| `story-detail-modal-button-21` | button | 허용 (민감 영역 제외) | [frontend/src/components/StoryDetailModal.tsx:727](../../frontend/src/components/StoryDetailModal.tsx) |
| `weekly-top-banner-action-01` | card | 허용 (민감 영역 제외) | [frontend/src/components/WeeklyTopBanner.tsx:92](../../frontend/src/components/WeeklyTopBanner.tsx) |
| `weekly-top-banner-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/WeeklyTopBanner.tsx:211](../../frontend/src/components/WeeklyTopBanner.tsx) |
| `weekly-top-banner-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/WeeklyTopBanner.tsx:218](../../frontend/src/components/WeeklyTopBanner.tsx) |
| `weekly-top-banner-self-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/WeeklyTopBanner.tsx:263](../../frontend/src/components/WeeklyTopBanner.tsx) |
| `welcome-modal-button-01` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:359](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-02` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:367](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-03` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:384](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-04` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:392](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-05` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:397](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-06` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:421](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-07` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:436](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-08` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:444](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-09` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:462](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-10` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:467](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-11` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:486](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-12` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:548](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-13` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:557](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-14` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:564](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-15` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:577](../../frontend/src/components/WelcomeModal.tsx) |
| `welcome-modal-button-16` | button | 허용 (민감 영역 제외) | [frontend/src/components/WelcomeModal.tsx:581](../../frontend/src/components/WelcomeModal.tsx) |
