-- =============================================================================
-- 댓글 수 실제 값 재동기화 (2026-08-17)
-- =============================================================================
-- 시드 데이터 시절 stories."commentCount" 에 실제 댓글 수와 무관한 데모용 숫자가
-- 들어가 있었다(예: 명절 사연 47개 표시 / 실제 2개). 앞선 마이그레이션에서
-- commentCount 를 트리거가 관리하도록 바꿨으므로, 출발점을 실제 값으로 맞춘다.
--
-- 주의: 카운터 보호 트리거(guard_story_counters)가 일반 UPDATE의 집계 컬럼 변경을
--       되돌리므로, 이 스크립트도 app.counter_update 플래그를 켜고 실행해야 한다.
-- =============================================================================

select set_config('app.counter_update', 'on', true);

update public.stories s
   set "commentCount" = (
         select count(*) from public.comments c where c."storyId" = s."id"
       )
 where s."commentCount" is distinct from (
         select count(*)::int from public.comments c where c."storyId" = s."id"
       );
