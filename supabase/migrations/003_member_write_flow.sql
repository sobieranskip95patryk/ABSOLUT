-- Global Vision v2 member write-flow: owner entry management, curation request, consents

create unique index if not exists uq_consents_room_owner on consents(room_id, owner_id);

create or replace function public.owner_upsert_entry(
  p_room_id uuid,
  p_entry_id uuid default null,
  p_title text default '',
  p_content text default '',
  p_visibility text default 'private'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_entry_id uuid;
begin
  if p_visibility not in ('private', 'public_room') then
    raise exception 'invalid visibility';
  end if;

  select r.owner_id into v_owner_id
  from public.rooms r
  where r.id = p_room_id;

  if v_owner_id is null then
    raise exception 'room not found';
  end if;

  if v_owner_id <> auth.uid() and public.current_user_role() <> 'admin' then
    raise exception 'forbidden';
  end if;

  if p_entry_id is null then
    insert into public.entries (id, room_id, author_id, title, content, visibility, is_curated)
    values (gen_random_uuid(), p_room_id, auth.uid(), p_title, p_content, p_visibility, false)
    returning id into v_entry_id;

    perform public.log_audit(
      'owner_create_entry',
      'entry',
      v_entry_id,
      jsonb_build_object('room_id', p_room_id, 'visibility', p_visibility)
    );

    return v_entry_id;
  end if;

  if not exists (
    select 1
    from public.entries e
    where e.id = p_entry_id
      and e.room_id = p_room_id
  ) then
    raise exception 'entry not found';
  end if;

  update public.entries
  set title = p_title,
      content = p_content,
      visibility = p_visibility,
      is_curated = false
  where id = p_entry_id;

  perform public.log_audit(
    'owner_update_entry',
    'entry',
    p_entry_id,
    jsonb_build_object('room_id', p_room_id, 'visibility', p_visibility)
  );

  return p_entry_id;
end;
$$;

create or replace function public.owner_request_curation(
  p_entry_id uuid,
  p_featured_level int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_owner_id uuid;
begin
  select e.room_id, r.owner_id into v_room_id, v_owner_id
  from public.entries e
  join public.rooms r on r.id = e.room_id
  where e.id = p_entry_id;

  if v_room_id is null then
    raise exception 'entry not found';
  end if;

  if v_owner_id <> auth.uid() and public.current_user_role() <> 'admin' then
    raise exception 'forbidden';
  end if;

  update public.entries
  set visibility = 'public_room',
      is_curated = false
  where id = p_entry_id;

  insert into public.curations (id, entry_id, curator_status, featured_level, published_at)
  values (gen_random_uuid(), p_entry_id, 'pending', greatest(p_featured_level, 0), null)
  on conflict (entry_id) do update
    set curator_status = 'pending',
        featured_level = excluded.featured_level,
        published_at = null;

  perform public.log_audit(
    'owner_request_curation',
    'entry',
    p_entry_id,
    jsonb_build_object('featured_level', greatest(p_featured_level, 0))
  );
end;
$$;

create or replace function public.owner_upsert_consent(
  p_room_id uuid,
  p_allow_public_excerpt boolean,
  p_allow_anonymous_publication boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select r.owner_id into v_owner_id
  from public.rooms r
  where r.id = p_room_id;

  if v_owner_id is null then
    raise exception 'room not found';
  end if;

  if v_owner_id <> auth.uid() and public.current_user_role() <> 'admin' then
    raise exception 'forbidden';
  end if;

  insert into public.consents (id, room_id, owner_id, allow_public_excerpt, allow_anonymous_publication)
  values (gen_random_uuid(), p_room_id, v_owner_id, p_allow_public_excerpt, p_allow_anonymous_publication)
  on conflict (room_id, owner_id) do update
    set allow_public_excerpt = excluded.allow_public_excerpt,
        allow_anonymous_publication = excluded.allow_anonymous_publication;

  perform public.log_audit(
    'owner_upsert_consent',
    'consent',
    null,
    jsonb_build_object(
      'room_id',
      p_room_id,
      'allow_public_excerpt',
      p_allow_public_excerpt,
      'allow_anonymous_publication',
      p_allow_anonymous_publication
    )
  );
end;
$$;

revoke execute on function public.owner_upsert_entry(uuid, uuid, text, text, text) from public;
revoke execute on function public.owner_request_curation(uuid, int) from public;
revoke execute on function public.owner_upsert_consent(uuid, boolean, boolean) from public;

grant execute on function public.owner_upsert_entry(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.owner_request_curation(uuid, int) to authenticated;
grant execute on function public.owner_upsert_consent(uuid, boolean, boolean) to authenticated;
