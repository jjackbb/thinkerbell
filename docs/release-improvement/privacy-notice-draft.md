# 가입 정보 처리표 — 검토 초안 / 운영 미적용

2026-10-10. 사용자 A에 따라 현재 코드·운영 메타데이터·확보된 문서를 대조했습니다. 공개 처리방침이 아니며 PrivacyNoticeDraft는 앱에서 import/마운트하지 않습니다. 가입을 막거나 임의의 필수 법적 동의를 저장하지 않습니다. [현재 정책·예약 근거](../../정책.md), [실행 기록](../plan-execution/README.md)를 함께 봅니다.

| 항목·목적 | 처리/저장 사실 | 접근·외부 전송 | 보관·삭제 근거와 한계 |
|---|---|---|---|
| 계정 인증 | 이메일·비밀번호·닉네임을 Supabase Auth에 전달, 앱 UUID로 연결 | Auth/서버 인증, 브라우저 세션 보관. 원문 비밀번호/사용자 목록 미조회 | 탈퇴 Auth 삭제 함수 존재. 비밀번호 저장 방식·Auth 로그/백업·실제 전체 파기 미검증 |
| 가입 이메일 소유 확인 | signup_email_checks의 이메일/토큰 digest·봉인값·단회 소비 상태. backend/emailOwnership.ts | Resend에 수신 주소·확인 메일/인증 링크 전송. 발신 주소는 문의처 증거 아님 | 토큰10분 유효, created_at24시간 이후 정리·15분 예약 확인. 발송자 로그·Resend 계약/지역/보유 미확인 |
| 사연·댓글 | stories의 계정ID·표시명·본문·시각·역할 지시문·신고/항소·공개상태, comments의 계정ID·익명번호·본문·시각·참여 상태 | 현재 운영 RLS와 전체 열 grant 확인. 로컬 읽기/투표/공감/공개상태 RPC 투영·블라인드 차단은 미배포 | 본인 삭제 및 사연 종속 삭제. 별도 일반 사연/댓글 만료기간 미확정. 실제 사용자 행 미조회 |
| 참여·개인 설정 | votes, balance_votes, comment_likes, story_hides의 대상/계정·선택·시각 | 본인 정책/RPC, 공개 집계와 원형 개인 행 구분 | 일부 Auth/대상 FK CASCADE 소스. 모든 탈퇴/집계 영향 실제 실증 미완료 |
| AI 대화 | ai_personas에 userId·storyId·지시문·모드/시작점·원문/시각/requestId·createdAt/updatedAt | 일반 사용자 본인 SELECT 실환경 확인. 서버가 저장 문맥 최신8개와 새 입력/역할 지시문을 Potens에 전송. 사연 내용 검증도 외부 AI 경로 | **updatedAt부터6개월**, 매일00:01KST 기존 운영 job 시각 변경/readback 완료. 대상 실제 삭제/백업 파기는 미검증. Potens 학습·지역·재수탁·보유 계약 없음 |
| AI 횟수 | ai_chat_usage, ai_quota_completed_rooms, ai_quota_reservations의 계정/방/요청·날짜·상태·시각 | 본인 조회 또는 서버 전용 RPC, 대화 원문과 별개 | 종료 횟수 기록30일 소스/일일03:00 예약. reservations의 Auth FK/탈퇴 직접 제거 공백; 식별자 잔류 가능성, 실제 이용자 잔류 미조회 |
| AI 도움 평가 | ai_feedback의 episode_id,user_id,persona_id,mode,score,outcome,schema_version,created_at,expires_at | 서버 전용, 평가에 답변 원문 없음, 점수GA4 제외. 로컬3단계 v2는1/3/5; 옛 v1 유지 |29일 만료+일일 정리/최대30일 정책. 방 삭제CASCADE. 실제 평가 파기·탈퇴전체 실증 미완료 |
| 월 평가 집계 | ai_feedback_month_pending: month_start,rated_count,positive_count. monthly_totals: 같은 집계+finalized_at | 개인/방ID·모드·원점수 셀 없는 서버 전용 합계 | 서로 다른 점수 응답자5명 증명되는 지난달만 확정; 미증명 임시값 폐기. 실제 월말 실행 미검증 |
| 문의·신고·운영 권한 | inquiries의 계정/내용/답변/상태·시각, reports의 신고자/대상/이유·시각, admins의 운영역할 | 문의 본인/운영자 정책과 DB 콘솔·서비스 권한은 별개 | 신고자 탈퇴 직접 삭제 확인, 대상 삭제·문의/관리역할·전체 기간은 미확정 |
| 내부 분석 | events의 session_id,user_id,event_name,props,created_at, 기존9종 | 동의 후 쓰기, 일반 읽기 없음. GA4 정제와 별개이며 UUID nullable | 일반 보유/탈퇴 제거·로그 정책 미확정 |
| GA4 분석 | 동의한 일반 화면·클릭·기능 결과의 고정 필드. GA4 정제에서 원문·이메일·계정ID 제외 | Google GA4 운영555751929/QA555775628. 거부해도 이용 가능 | 실제 속성 보관·Google 로그/지역/계약·확장 이벤트 수신/맞춤 차원 최신 미검증. 전체 계측 결정 유지 |
| 접근 변경 신호 | story_access_invalidations의 id,story_id,changed_at, 내용/작성자 없음 | 운영ID만 Realtime. 로컬 access_changed 추가해 일반 갱신/접근차단 구분 |30일 소스·일일03:05 예약. 실제 행 파기 미검증 |
| 파일·운영 환경 | Vercel 앱/서버, Supabase Storage 버킷 없음 실환경 화면·소스storage업로드 없음 | 공유 이미지는 클라이언트 생성·다운로드 | Storage 없음이 로그/백업/플랫폼 저장 없음 의미는 아님. 계정별 지역·DPA·보유 설정 확정자료 없음 |

## 근거와 확정되지 않은 부분

현재 코드·적용 기록: backend/app.ts, backend/emailOwnership.ts, backend/supabase/migrations/20260928063512_story_author_private_access_boundary.sql, 20260928063643_ai_quota_reservations_and_completion_state.sql 및 후속 방FK 제거, 20260928063823_ai_feedback_private_monthly_totals.sql, 정리 예약 SQL, frontend/src/lib/ga4.ts·analyticsConsent.ts. 운영 public19테이블/RLS·열grant·AI FK·탈퇴 함수·cron 메타데이터는 이용자 행 없이 읽었습니다. 외부 공급사 계약/보유/학습/지역 설정은 확보된 현재 자료에 없습니다. 데이터 흐름으로 수탁·제3자 제공·국외이전의 법적 분류나 처리 근거를 임의 결정하지 않습니다.

부모가 전달한 10/9 Notion 회의에서는 처리방침/약관/동의 작성이 남은 일입니다. 팀 이름/역할은 법적 운영 주체의 증명이 아니고 과거 성인 표시도 서비스 전체 최소 연령을 확정하지 않습니다. 현재 공개 개인정보 문서의 확정본/적용 버전은 확인하지 못했습니다.

2026-10-10 사용자 승인으로 운영 주체·문의 책임자는 **변종현 개인(비사업자)**, 공식 문의처는 **ds5305naver@gmail.com**, 최소 이용 연령은 **만 14세**, 성인 전용 콘텐츠는 **미지원**으로 확정됐습니다. 외부 배포 후 데이터 기반 개선을 목표로 하며 사업자 등록 여부와 개인정보 관련 의무는 별개입니다. 외부 계약과 미검증 파기 설정은 계속 보류 근거이며 모르는 기간을 채우지 않습니다. 처리방침 게시와 동의는 별개로, 필요한 처리 근거가 확정된 뒤에만 안내/동의 버전·시각 저장과 양 가입 경로 검증을 설계합니다.

공식 검토 자료: [개인정보위 필수동의 관행 개선](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=10566), [2026 처리방침 작성지침 안내](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&nttId=12021). 이 초안은 법적 준수 완료 판정이 아닙니다. QA G3는 미완료입니다.

2026-10-10 운영 적용 readback: 승인된 공개 데이터 경계 SQL이 실제 적용됐으며 read_visible_stories(text) 존재=true, anon의 stories.body SELECT=false를 독립 조회로 확인했다. 전체 권한·Realtime·블라인드 검사 및 새 앱 배포 완료는 이어지는 실행 근거를 따른다. 개인정보 안내는 계속 미활성이다.

## 2026-10-10 운영 보안 적용 완료

사용자 구체 범위 승인과 ‘지금 해’ 재개 지시 후 기존 함수4개의 hash/owner/ACL 불변을 재확인했다. 검증된 적용 파일 본문 MD5 `06aafca48926ffd9cf307edc78475bfb` 보호를 포함한 한 트랜잭션으로 실제 운영 적용했다. 긴 직접 타이핑의 자동완성 오류는 실행하지 않았고 검증 파일 원문을 복사해 적용했다. 원문 사용자 행 조회/삭제는 없었다.

독립 SQL readback에서 조회 RPC 존재=true와 anon stories.body SELECT=false를 확인했다. 추가8항목 모두 true: raw_content_blocked, delete_ids_allowed, raw_rpc_blocked, raw_realtime_removed, id_realtime_preserved, blind_policy, comment_signal_trigger, access_flag. 운영 보안 SQL은 더 이상 미적용 초안이 아니며 1회 적용 기록이다. 클라이언트 자동 배포를 위해 main 정상 커밋·푸시를 이어간다. GA4 누락13개 등록·실제 수신은 별도 완료 증거를 기다린다. 개인정보 안내는 계속 미활성이다.
