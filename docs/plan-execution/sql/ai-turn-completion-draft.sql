-- REVIEW DRAFT ONLY. Depends on ai-quota-reservations-draft.sql.
-- The server calls this only after Potens sends an explicit done with a nonempty
-- answer. Appending the turn and consuming the first-reply reservation happen
-- in one PostgreSQL transaction. Never grant this RPC to a browser role.
create or replace function public.complete_ai_turn(
  p_user_id uuid,
  p_persona_id text,
  p_request_id uuid,
  p_prompt text,
  p_answer text,
  p_finished_at timestamptz,
  p_activated_at timestamptz
)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_room public.ai_personas%rowtype;
  v_author text;
  v_old_room boolean;
  v_needs_charge boolean;
  v_reservation public.ai_quota_reservations%rowtype;
  v_finish text;
  v_history jsonb;
  v_time text;
begin
  if p_user_id is null or p_persona_id is null or p_request_id is null
      or p_finished_at is null or p_activated_at is null
      or p_prompt is null or length(btrim(p_prompt)) < 1 or length(p_prompt) > 4000
      or p_answer is null or length(btrim(p_answer)) < 1 or length(p_answer) > 20000
      or to_char(p_activated_at at time zone 'Asia/Seoul', 'HH24:MI:SS') <> '00:00:00' then
    raise exception 'AI_TURN_INVALID_REQUEST';
  end if;

  -- Same lock order as reserve_ai_first_reply: account lock, then room row.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into v_room from public.ai_personas
    where id = p_persona_id for update;
  if not found or v_room."userId" <> p_user_id then
    raise exception 'AI_TURN_ROOM_NOT_FOUND';
  end if;
  if jsonb_typeof(v_room."chatHistory") <> 'array' then
    raise exception 'AI_TURN_HISTORY_INVALID';
  end if;

  -- Lost HTTP responses can be retried with the same request ID. No second
  -- answer is appended and no second slot is consumed.
  if exists (
    select 1 from jsonb_array_elements(v_room."chatHistory") as m
    where m->>'sender' = 'ai' and m->>'requestId' = p_request_id::text
  ) then
    return jsonb_build_object('result', 'recovered', 'charged', false);
  end if;

  -- User decision: every room created before activation remains a free
  -- continuation, even if its old history is empty or ambiguous.
  v_old_room := v_room."createdAt" < p_activated_at;
  if not v_old_room then
    select s."authorId" into v_author from public.stories s
      where s.id = v_room."storyId";
    if not found then raise exception 'AI_TURN_STORY_NOT_FOUND'; end if;
  end if;
  v_needs_charge := not v_old_room and v_author <> p_user_id::text
    and not exists (select 1 from public.ai_quota_completed_rooms
      where persona_id = p_persona_id and user_id = p_user_id);

  if v_needs_charge then
    select * into v_reservation from public.ai_quota_reservations
      where user_id = p_user_id and persona_id = p_persona_id
        and request_id = p_request_id for update;
    if not found or v_reservation.status <> 'reserved'
        or v_reservation.expires_at <= p_finished_at then
      raise exception 'AI_TURN_RESERVATION_MISSING';
    end if;
  end if;

  v_time := to_char(p_finished_at at time zone 'Asia/Seoul', 'HH24:MI');
  v_history := v_room."chatHistory" || jsonb_build_array(
    jsonb_build_object('id', 'msg-' || p_request_id::text,
      'requestId', p_request_id::text, 'sender', 'user',
      'text', p_prompt, 'timestamp', v_time),
    jsonb_build_object('id', 'ai-' || p_request_id::text,
      'requestId', p_request_id::text, 'sender', 'ai',
      'text', p_answer, 'timestamp', v_time)
  );
  update public.ai_personas
    set "chatHistory" = v_history, "updatedAt" = p_finished_at
    where id = p_persona_id;

  if v_needs_charge then
    v_finish := public.finish_ai_first_reply(
      p_user_id, p_request_id, true, p_finished_at);
    if v_finish <> 'completed' then
      raise exception 'AI_TURN_RESERVATION_MISSING';
    end if;
  end if;
  return jsonb_build_object('result', 'saved', 'charged', v_needs_charge);
end;
$$;

revoke all on function public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)
  to service_role;
