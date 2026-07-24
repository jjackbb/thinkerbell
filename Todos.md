# [Todos] 니편내편 개발 과제 목록

## 1. 프로젝트 기반 및 환경 설정
- [x] PRD.md 작성 및 등록 완료
- [x] Clay 디자인 시스템 CSS / 토큰 / 테마 스펙 구현 (`1caly.md` 스타일 반영: Cream Canvas #fffaf0, Soft Surface #faf5e8, Dark Navy Primary #0a0a0a, Vibrant Accent Cards)
- [x] Server / Backend API (`server.ts`) 구현: Potens AI API (`/api/chat`, `/api/chat-stream`) 연동 및 Gemini API fallback 지원

## 2. FEAT-01: 소셜 로그인 & 익명 닉네임
- [x] 소셜 로그인 시뮬레이션 (Kakao, Apple, Google) UI & 인증 세션 처리
- [x] 랜덤 익명 닉네임 추천 생성기 (예: "속뚫리는고구마", "억울한야옹이", "사이다마신곰") 및 중복 확인 UI
- [x] 회원가입 웰컴 모달 및 익명 프로필 세션 저장

## 3. FEAT-02 & FEAT-04: 익명 사연 작성기 & 카테고리 필터
- [x] 카테고리 (연애, 직장, 친구, 가족, 기타) 선택 필터 UI 및 탭 Navigation
- [x] 사연 작성 UI: 제목, 카테고리, 사연 본문 (글자수 제한 20~1000자 validation)
- [x] 사연 등록 시 AI 페르소나 자동 추출 및 금칙어 / 수위 체크 피드백
- [x] 사연 작성 제한 및 등록 완료 토스트 연출

## 4. FEAT-03: 실시간 사연 피드 & 특화 피드 (주간 랭킹 / 오늘의 핫이슈 / 밸런스 게임)
- [x] 실시간 최신순 / 투표순 정렬 기능
- [x] 주간 랭킹 TOP 3 롤링 혜택 / 오늘의 핫이슈 배너 / 밸런스 게임 카드
- [x] Clay 스타일 컬러 카드 피드 (Brand Pink, Brand Teal, Brand Lavender, Brand Peach, Brand Ochre)
- [x] 스케일링/스켈레톤 UI 및 샘플 데이터셋 구성 (풍부한 사연, 투표 데이터)

## 5. FEAT-05 & FEAT-06: 1초 투표 ('니편 vs 내편') & 실시간 비율 애니메이션
- [x] 사연 상세 화면 내 1초 투표 (A안 내편 vs B안 상대편) 버튼 UI
- [x] 투표 참여 후 게이지 바 및 실시간 지지율 (%) 애니메이션 피드백
- [x] 중복 투표 방지 및 내 투표 상태 바인딩

## 6. FEAT-07 & FEAT-09: 익명 공감 댓글 & 비방/욕설 신고 시스템
- [x] 사연 내 익명 댓글 작성 (최대 200자) 및 게시글 내 고유 익명 ID (익명1, 익명2 등) 고정
- [x] 공감/응원 하트 버튼
- [x] 게시글 및 댓글 더보기 메뉴 내 신고 모달 (신고 사유 선택)
- [x] 5회 누적 신고 시 자동 블라인드 처리 정책 적용

## 7. FEAT-08: AI 1:1 시뮬레이션 / 대화 챗봇 (Potens API integration)
- [x] AI 대화 상대 페르소나 선택 메인 (직장 상사, 애인, 친구, 시월드, 꼰대 선배, 사연에서 바로 연결)
- [x] Express 백엔드를 통한 Potens.ai API (`claude-4-6-sonnet`) / SSE 스트리밍 & JSON 응답 연동
- [x] 1:1 카톡/메신저 스타일 대화 말풍선 UI
- [x] 내편 지수 (공감도) 실시간 측정 게이지 및 대화 종료 시 감정 해소 완료 팝업 & 분석 리포트 모달

## 8. FEAT-10: 마이페이지 & 사연/댓글/투표 관리
- [x] 익명 프로필 정보 및 닉네임 변경 기능
- [x] 내가 작성한 사연 목록, 내가 참여한 투표 목록, 내가 남긴 댓글 리스트
- [x] 내 작성 사연 삭제 / 관리 기능

## 9. 빌드 및 검증
- [x] `compile_applet` 빌드 확인 및 에러 수정
- [x] 전반적인 반응형 UI / Clay design aesthetic / UX 인터랙션 검증
