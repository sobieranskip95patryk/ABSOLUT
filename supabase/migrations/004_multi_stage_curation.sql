-- Global Vision 004: multi-stage curation, entry locking, versioning, tags, ranking

-- =============================================================================
-- 1. Locked column on entries
-- =============================================================================
alter table public.entries
  add column if not exists locked boolean not null default false;

-- =============================================================================
-- 2. Extend curations.curator_status check to include new states
-- =============================================================================
alter table public.curations
  drop constraint if exists curations_curator_status_check;

alter table public.curations
  add constraint curations_curator_status_check
  check (curator_status in ('pending', 'review', 'approved', 'featured', 'rejected', 'archived'));

-- Pinned flag for manual ranking override
alter table public.curations
  add column if not exists pinned boolean not null default false;

-- =============================================================================
-- 3. Entry versions table
-- =============================================================================
create table if not exists public.entry_versions (
  id             uuid primary key default gen_random_uuid(),
  entry_id       uuid not null references public.entries(id) on delete cascade,
  title          text not null,
  content        text not null,
  visibility     text not null,
  version_number int  not null default 1,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_entry_versions_entry_id on public.entry_versions(entry_id);
create index if not exists idx_entry_versions_number   on public.entry_versions(entry_id, version_number desc);

alter table public.entry_versions enable row level security;

create policy entry_versions_select on public.entry_versions
for select
using (
  exists (
    select 1 from public.entries e
    join public.rooms r on r.id = e.room_id
    where e.id = entry_versions.entry_id
      and (r.owner_id = auth.uid() or public.current_user_role() in ('curator', 'admin'))
  )
);

create policy entry_versions_insert on public.entry_versions
for insert
with check (
  created_by = auth.uid()
  or public.current_user_role() = 'admin'
);

-- =============================================================================
-- 4. Tags tables
-- =============================================================================
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.entry_tags (
  entry_id uuid not null references public.entries(id) on delete cascade,
  tag_id   uuid not null references public.tags(id)   on delete cascade,
  primary key (entry_id, tag_id)
);

create index if not exists idx_entry_tags_entry_id on public.entry_tags(entry_id);
create index if not exists idx_entry_tags_tag_id   on public.entry_tags(tag_id);

alter table public.tags       enable row level security;
alter table public.entry_tags enable row level security;

create policy tags_select on public.tags for select using (true);

create policy tags_manage on public.tags
for all
using  (public.current_user_role() in ('curator', 'admin'))
with check (public.current_user_role() in ('curator', 'admin'));

create policy entry_tags_select on public.entry_tags for select using (true);

create policy entry_tags_manage on public.entry_tags
for all
using  (public.current_user_role() in ('curator', 'admin'))
with check (public.current_user_role() in ('curator', 'admin'));

-- =============================================================================
-- 5. Update owner_upsert_entry: lock check + versioning + auto-revoke on edit
-- =============================================================================
create or replace function public.owner_upsert_entry(
  p_room_id    uuid,
  p_entry_id   uuid    default null,
  p_title      text    default '',
  p_content    text    default '',
  p_visibility text    default 'private'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id      uuid;
  v_entry_id      uuid;
  v_locked        boolean;
  v_cur_status    text;
  v_version_number int;
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

  -- CREATE
  if p_entry_id is null then
    insert into public.entries (id, room_id, author_id, title, content, visibility, is_curated, locked)
    values (gen_random_uuid(), p_room_id, auth.uid(), p_title, p_content, p_visibility, false, false)
    returning id into v_entry_id;

    insert into public.entry_versions (entry_id, title, content, visibility, version_number, created_by)
    values (v_entry_id, p_title, p_content, p_visibility, 1, auth.uid());

    perform public.log_audit(
      'owner_create_entry', 'entry', v_entry_id,
      jsonb_build_object('room_id', p_room_id, 'visibility', p_visibility)
    );
    return v_entry_id;
  end if;

  -- UPDATE
  select e.locked, c.curator_status
    into v_locked, v_cur_status
  from public.entries e
  left join public.curations c on c.entry_id = e.id
  where e.id = p_entry_id and e.room_id = p_room_id;

  if not found then
    raise exception 'entry not found';
  end if;

  if v_locked then
    raise exception 'entry_locked';
  end if;

  -- Snapshot current version before overwriting
  select coalesce(max(version_number), 0) + 1
    into v_version_number
  from public.entry_versions
  where entry_id = p_entry_id;

  insert into public.entry_versions (entry_id, title, content, visibility, version_number, created_by)
  select p_entry_id, title, content, visibility, v_version_number, auth.uid()
  from public.entries where id = p_entry_id;

  update public.entries
  set title      = p_title,
      content    = p_content,
      visibility = p_visibility,
      is_curated = false
  where id = p_entry_id;

  -- Auto-revoke if entry had been approved/featured
  if v_cur_status in ('approved', 'featured') then
    update public.curations
    set curator_status = 'pending',
        published_at   = null,
        pinned         = false
    where entry_id = p_entry_id;

    update public.entries
    set visibility = p_visibility,
        is_curated = false
    where id = p_entry_id;

    perform public.log_audit(
      'auto_revoke_on_edit', 'entry', p_entry_id,
      jsonb_build_object('previous_status', v_cur_status)
    );
  end if;

  perform public.log_audit(
    'owner_update_entry', 'entry', p_entry_id,
    jsonb_build_object('room_id', p_room_id, 'visibility', p_visibility)
  );
  return p_entry_id;
end;
$$;

-- =============================================================================
-- 6. Update owner_request_curation: set locked = true
-- =============================================================================
create or replace function public.owner_request_curation(
  p_entry_id     uuid,
  p_featured_level int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id  uuid;
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
      is_curated = false,
      locked     = true
  where id = p_entry_id;

  insert into public.curations (id, entry_id, curator_status, featured_level, published_at)
  values (gen_random_uuid(), p_entry_id, 'pending', greatest(p_featured_level, 0), null)
  on conflict (entry_id) do update
    set curator_status = 'pending',
        featured_level = excluded.featured_level,
        published_at   = null;

  perform public.log_audit(
    'owner_request_curation', 'entry', p_entry_id,
    jsonb_build_object('featured_level', greatest(p_featured_level, 0))
  );
end;
$$;

-- =============================================================================
-- 7. Update approve_curation: unlock entry
-- =============================================================================
create or replace function public.approve_curation(
  p_entry_id     uuid,
  p_featured_level int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_user_role();
  if v_role not in ('curator', 'admin') then
    raise exception 'forbidden';
  end if;

  insert into public.curations (id, entry_id, curator_status, featured_level, published_at)
  values (gen_random_uuid(), p_entry_id, 'approved', greatest(p_featured_level, 0), now())
  on conflict (entry_id) do update
    set curator_status = 'approved',
        featured_level = excluded.featured_level,
        published_at   = excluded.published_at;

  update public.entries
  set visibility = 'curated_public',
      is_curated = true,
      locked     = false
  where id = p_entry_id;

  perform public.log_audit(
    'approve_curation', 'entry', p_entry_id,
    jsonb_build_object('featured_level', greatest(p_featured_level, 0))
  );
end;
$$;

-- =============================================================================
-- 8. Update reject_curation: unlock entry
-- =============================================================================
create or replace function public.reject_curation(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_user_role();
  if v_role not in ('curator', 'admin') then
    raise exception 'forbidden';
  end if;

  insert into public.curations (id, entry_id, curator_status, featured_level, published_at)
  values (gen_random_uuid(), p_entry_id, 'rejected', 0, null)
  on conflict (entry_id) do update
    set curator_status = 'rejected',
        featured_level = 0,
        published_at   = null;

  update public.entries
  set visibility = 'private',
      is_curated = false,
      locked     = false
  where id = p_entry_id;

  perform public.log_audit('reject_curation', 'entry', p_entry_id, '{}'::jsonb);
end;
$$;

-- =============================================================================
-- 9. Review entry (curator marks as review)
-- =============================================================================
create or replace function public.review_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_user_role();
  if v_role not in ('curator', 'admin') then
    raise exception 'forbidden';
  end if;

  update public.curations
  set curator_status = 'review'
  where entry_id = p_entry_id;

  if not found then
    raise exception 'curation not found';
  end if;

  perform public.log_audit('review_entry', 'entry', p_entry_id, '{}'::jsonb);
end;
$$;

-- =============================================================================
-- 10. Feature entry (admin sets featured status)
-- =============================================================================
create or replace function public.feature_entry(
  p_entry_id      uuid,
  p_featured_level int default 5
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_user_role();
  if v_role not in ('curator', 'admin') then
    raise exception 'forbidden';
  end if;

  update public.curations
  set curator_status = 'featured',
      featured_level = greatest(p_featured_level, 1),
      published_at   = coalesce(published_at, now())
  where entry_id = p_entry_id;

  if not found then
    raise exception 'curation not found';
  end if;

  update public.entries
  set visibility = 'curated_public',
      is_curated = true
  where id = p_entry_id;

  perform public.log_audit(
    'feature_entry', 'entry', p_entry_id,
    jsonb_build_object('featured_level', greatest(p_featured_level, 1))
  );
end;
$$;

-- =============================================================================
-- 11. Archive entry
-- =============================================================================
create or replace function public.archive_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_user_role();
  if v_role not in ('curator', 'admin') then
    raise exception 'forbidden';
  end if;

  update public.curations
  set curator_status = 'archived',
      published_at   = null
  where entry_id = p_entry_id;

  update public.entries
  set visibility = 'private',
      is_curated = false,
      locked     = false
  where id = p_entry_id;

  perform public.log_audit('archive_entry', 'entry', p_entry_id, '{}'::jsonb);
end;
$$;

-- =============================================================================
-- 12. Toggle pin
-- =============================================================================
create or replace function public.toggle_pin_entry(
  p_entry_id uuid,
  p_pinned   boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_user_role();
  if v_role not in ('curator', 'admin') then
    raise exception 'forbidden';
  end if;

  update public.curations
  set pinned = p_pinned
  where entry_id = p_entry_id;

  perform public.log_audit(
    'toggle_pin_entry', 'entry', p_entry_id,
    jsonb_build_object('pinned', p_pinned)
  );
end;
$$;

-- =============================================================================
-- 13. get_absolut_feed with ranking, view modes, tag filter
-- =============================================================================
create or replace function public.get_absolut_feed(
  p_view   text    default 'newest',
  p_tag    text    default null,
  p_limit  int     default 200,
  p_offset int     default 0
)
returns table (
  id             uuid,
  room_id        uuid,
  room_slug      text,
  room_title     text,
  title          text,
  content        text,
  visibility     text,
  created_at     timestamptz,
  featured_level int,
  curator_status text,
  pinned         boolean,
  tags           text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.room_id,
    r.slug        as room_slug,
    r.title       as room_title,
    e.title,
    e.content,
    e.visibility::text,
    e.created_at,
    coalesce(c.featured_level, 0)      as featured_level,
    coalesce(c.curator_status, 'none') as curator_status,
    coalesce(c.pinned, false)          as pinned,
    coalesce(
      array_agg(t.name order by t.name) filter (where t.name is not null),
      '{}'::text[]
    ) as tags
  from public.entries e
  join public.rooms r on r.id = e.room_id
  left join public.curations c on c.entry_id = e.id
  left join public.entry_tags et on et.entry_id = e.id
  left join public.tags t on t.id = et.tag_id
  where
    e.visibility in ('curated_public', 'public_room')
    and (c.curator_status is null or c.curator_status in ('approved', 'featured'))
    and (
      p_tag is null
      or exists (
        select 1 from public.entry_tags et2
        join public.tags t2 on t2.id = et2.tag_id
        where et2.entry_id = e.id and lower(t2.name) = lower(p_tag)
      )
    )
  group by
    e.id, e.title, e.content, e.visibility, e.created_at,
    r.slug, r.title,
    c.featured_level, c.curator_status, c.pinned
  order by
    -- pinned always floats to top regardless of view
    coalesce(c.pinned, false) desc,
    case p_view
      when 'top' then
        coalesce(c.featured_level, 0) * 10
        + greatest(0, 7 - extract(epoch from (now() - e.created_at)) / 86400.0)
      when 'thematic' then
        coalesce(c.featured_level, 0)
      else 0
    end desc,
    case when p_view = 'newest' then e.created_at else null end desc nulls last,
    e.created_at desc
  limit p_limit offset p_offset;
$$;

-- =============================================================================
-- 14. get_entry_versions (owner / curator / admin)
-- =============================================================================
create or replace function public.get_entry_versions(p_entry_id uuid)
returns table (
  id             uuid,
  version_number int,
  title          text,
  content        text,
  visibility     text,
  created_by     uuid,
  created_at     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ev.id,
    ev.version_number,
    ev.title,
    ev.content,
    ev.visibility,
    ev.created_by,
    ev.created_at
  from public.entry_versions ev
  where ev.entry_id = p_entry_id
    and exists (
      select 1 from public.entries e
      join public.rooms r on r.id = e.room_id
      where e.id = p_entry_id
        and (r.owner_id = auth.uid() or public.current_user_role() in ('curator', 'admin'))
    )
  order by ev.version_number desc;
$$;

-- =============================================================================
-- 15. get_absolut_tags
-- =============================================================================
create or replace function public.get_absolut_tags()
returns table (name text, entry_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.name, count(et.entry_id) as entry_count
  from public.tags t
  join public.entry_tags et on et.tag_id = t.id
  join public.entries e    on e.id = et.entry_id
  where e.visibility in ('curated_public', 'public_room')
  group by t.name
  order by entry_count desc, t.name;
$$;

-- =============================================================================
-- 16. Grants
-- =============================================================================
grant execute on function public.get_absolut_feed    to authenticated, anon;
grant execute on function public.get_absolut_tags    to authenticated, anon;
grant execute on function public.get_entry_versions  to authenticated;
grant execute on function public.review_entry        to authenticated;
grant execute on function public.feature_entry       to authenticated;
grant execute on function public.archive_entry       to authenticated;
grant execute on function public.toggle_pin_entry    to authenticated;
