-- REVIEW DRAFT ONLY. The old rule charges at room creation until the next
-- configured Seoul midnight. This RPC makes room creation and legacy usage one
-- transaction; otherwise a failed usage INSERT leaves a free reusable room.
-- Requires ai-room-choice-unique-draft.sql and the existing story_hides table.
-- This is a NEW RPC. It does not replace an existing function or change the
-- current ai_personas INSERT grant/policy used by the deployed browser. The
-- REVOKE below removes default PUBLIC execution only from this new RPC.
create or replace function public.open_legacy_ai_room(
  p_user_id uuid, p_request_id uuid, p_room jsonb, p_received_at timestamptz
)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_room public.ai_personas%rowtype;
  v_story public.stories%rowtype;
  v_id text;
  v_story_id text;
  v_opening text;
  v_ratio text;
  v_count integer;
  v_day date;
begin
  if p_user_id is null or p_request_id is null or p_room is null
      or p_received_at is null then
    raise exception 'AI_ROOM_INVALID_REQUEST';
  end if;
  v_id := p_room->>'id';
  v_story_id := p_room->>'storyId';
  v_opening := p_room->>'opening';
  v_ratio := p_room->>'ratio';
  if v_id <> 'persona-' || p_request_id::text or v_story_id is null
      or ((v_opening is null) = (v_ratio is null))
      or length(coalesce(p_room->>'systemInstruction', '')) < 1 then
    raise exception 'AI_ROOM_INVALID_REQUEST';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into v_room from public.ai_personas where id = v_id;
  if found then
    if v_room."userId" <> p_user_id or v_room."storyId" <> v_story_id
        or v_room.opening is distinct from v_opening
        or v_room.ratio is distinct from v_ratio then
      raise exception 'AI_ROOM_REQUEST_CONFLICT';
    end if;
    return jsonb_build_object('room', to_jsonb(v_room), 'recovered', true);
  end if;

  select * into v_room from public.ai_personas
    where "userId" = p_user_id and "storyId" = v_story_id
      and ((v_opening is not null and opening = v_opening)
        or (v_ratio is not null and ratio = v_ratio))
    limit 1;
  if found then
    return jsonb_build_object('room', to_jsonb(v_room), 'recovered', true);
  end if;

  select * into v_story from public.stories where id = v_story_id for update;
  if not found or coalesce(v_story."isBlind", false)
      or coalesce(v_story."isAdult", false)
      or coalesce(v_story."isHidden", false)
      or (coalesce(to_jsonb(v_story)->>'visibility', 'public') <> 'public'
        and v_story."authorId" <> p_user_id::text)
      or exists (select 1 from public.story_hides
        where user_id = p_user_id and story_id = v_story_id) then
    raise exception 'AI_ROOM_STORY_NOT_FOUND';
  end if;

  v_day := (p_received_at at time zone 'Asia/Seoul')::date;
  select count(*)::integer into v_count from public.ai_chat_usage
    where "userId" = p_user_id and "usedOn" = v_day;
  if v_story."authorId" <> p_user_id::text and v_count >= 3 then
    raise exception 'AI_QUOTA_REACHED';
  end if;

  insert into public.ai_personas
    (id, "userId", name, role, category, "avatarIcon", description,
     "systemInstruction", "cardColor", "sampleFirstMessage", "isPinned",
     "chatHistory", "storyId", opening, ratio, "createdAt", "updatedAt")
  values
    (v_id, p_user_id, p_room->>'name', p_room->>'role', p_room->>'category',
     p_room->>'avatarIcon', p_room->>'description', p_room->>'systemInstruction',
     p_room->>'cardColor', p_room->>'sampleFirstMessage', false, '[]'::jsonb,
     v_story_id, v_opening, v_ratio, p_received_at, p_received_at)
  returning * into v_room;

  if v_story."authorId" <> p_user_id::text then
    insert into public.ai_chat_usage
      (id, "userId", "storyId", "usedAt", "usedOn")
    values (p_request_id, p_user_id, v_story_id, p_received_at, v_day);
    v_count := v_count + 1;
  end if;
  return jsonb_build_object('room', to_jsonb(v_room), 'recovered', false,
    'quotaUsed', v_count);
end;
$$;

revoke all on function public.open_legacy_ai_room(uuid,uuid,jsonb,timestamptz)
  from public, anon, authenticated;
grant execute on function public.open_legacy_ai_room(uuid,uuid,jsonb,timestamptz)
  to service_role;
