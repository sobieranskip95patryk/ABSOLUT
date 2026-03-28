-- ============================================================
-- Migration 005: Room archival, entry content limit, view counts,
--                in-app notifications, owner applications,
--                room system prompt, owner pseudonym, room metadata RPC
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rooms: archival status, system_prompt, visual_style, public_summary
-- ------------------------------------------------------------

alter table rooms
  add column if not exists status        text not null default 'active'
    check (status in ('active', 'archived')),
  add column if not exists system_prompt text,
  add column if not exists visual_style  text not null default '',
  add column if not exists public_summary text not null default '';

-- ------------------------------------------------------------
-- 2. Profiles: pseudonym (public nickname separate from auth email)
-- ------------------------------------------------------------

alter table profiles
  add column if not exists pseudonym text;

-- ------------------------------------------------------------
-- 3. Entries: content length constraint (10 000 chars)
-- ------------------------------------------------------------

alter table entries
  add constraint if not exists entries_content_length
    check (char_length(content) <= 10000);

-- ------------------------------------------------------------
-- 4. Entry view counts
-- ------------------------------------------------------------

create table if not exists entry_views (
  entry_id uuid not null references entries(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  viewer_role text not null default 'guest'
    check (viewer_role in ('guest', 'owner', 'curator', 'admin'))
);

-- aggregate view for fast count queries
create index if not exists idx_entry_views_entry_id on entry_views(entry_id);

-- daily aggregated counts (materialized for performance)
create table if not exists entry_view_counts (
  entry_id    uuid not null references entries(id) on delete cascade,
  view_count  bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (entry_id)
);

-- ------------------------------------------------------------
-- 5. In-app notifications
-- ------------------------------------------------------------

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  kind        text not null
    check (kind in ('curation_approved', 'curation_rejected', 'curation_featured',
                    'curation_reviewed', 'curation_archived')),
  entry_id    uuid references entries(id) on delete set null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_owner_unread
  on notifications(owner_id) where is_read = false;

-- ------------------------------------------------------------
-- 6. Owner applications
-- ------------------------------------------------------------

create table if not exists owner_applications (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  display_name  text not null,
  motivation    text not null,
  status        text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by   uuid references profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. RLS policies
-- ------------------------------------------------------------

alter table entry_views         enable row level security;
alter table entry_view_counts   enable row level security;
alter table notifications       enable row level security;
alter table owner_applications  enable row level security;

-- entry_views: anyone can insert their own view; owner/admin/curator can read
create policy "insert own view" on entry_views
  for insert with check (true);

create policy "read views admin" on entry_views
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'curator'))
  );

-- entry_view_counts: public read, system write
create policy "public read view counts" on entry_view_counts
  for select using (true);

-- notifications: owner reads own
create policy "owner reads own notifications" on notifications
  for select using (owner_id = auth.uid());

create policy "system inserts notifications" on notifications
  for insert with check (true);

create policy "owner marks read" on notifications
  for update using (owner_id = auth.uid());

-- owner_applications: public insert, admin/curator read
create policy "public apply" on owner_applications
  for insert with check (true);

create policy "admin reads applications" on owner_applications
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'curator'))
  );

create policy "admin updates application" on owner_applications
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ------------------------------------------------------------
-- 8. RPC: record_entry_view — increments view count (upsert)
-- ------------------------------------------------------------

create or replace function record_entry_view(
  p_entry_id  uuid,
  p_role      text default 'guest'
) returns void
language plpgsql security definer as $$
begin
  insert into entry_views(entry_id, viewer_role) values (p_entry_id, p_role);

  insert into entry_view_counts(entry_id, view_count, updated_at)
    values (p_entry_id, 1, now())
  on conflict (entry_id) do update
    set view_count = entry_view_counts.view_count + 1,
        updated_at = now();
end;
$$;

-- ------------------------------------------------------------
-- 9. RPC: get_entry_view_count
-- ------------------------------------------------------------

create or replace function get_entry_view_count(p_entry_id uuid)
returns bigint
language sql security definer stable as $$
  select coalesce(view_count, 0)
  from entry_view_counts
  where entry_id = p_entry_id;
$$;

-- ------------------------------------------------------------
-- 10. RPC: get_owner_unread_count — for notification badge
-- ------------------------------------------------------------

create or replace function get_owner_unread_count()
returns bigint
language sql security definer stable as $$
  select count(*)
  from notifications
  where owner_id = auth.uid() and is_read = false;
$$;

-- ------------------------------------------------------------
-- 11. RPC: mark_notifications_read
-- ------------------------------------------------------------

create or replace function mark_notifications_read()
returns void
language plpgsql security definer as $$
begin
  update notifications
  set is_read = true
  where owner_id = auth.uid() and is_read = false;
end;
$$;

-- ------------------------------------------------------------
-- 12. RPC: submit_owner_application
-- ------------------------------------------------------------

create or replace function submit_owner_application(
  p_email        text,
  p_display_name text,
  p_motivation   text
) returns uuid
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if p_email is null or trim(p_email) = '' then
    raise exception 'email_required';
  end if;
  if p_display_name is null or trim(p_display_name) = '' then
    raise exception 'display_name_required';
  end if;
  if p_motivation is null or char_length(trim(p_motivation)) < 20 then
    raise exception 'motivation_too_short';
  end if;

  insert into owner_applications(email, display_name, motivation)
  values (trim(p_email), trim(p_display_name), trim(p_motivation))
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- 13. RPC: review_owner_application — admin only
-- ------------------------------------------------------------

create or replace function review_owner_application(
  p_application_id uuid,
  p_decision       text   -- 'approved' | 'rejected'
) returns void
language plpgsql security definer as $$
declare
  v_role text;
  v_app  owner_applications%rowtype;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'forbidden';
  end if;

  select * into v_app from owner_applications where id = p_application_id;
  if not found then
    raise exception 'application_not_found';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision';
  end if;

  update owner_applications
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_application_id;
end;
$$;

-- ------------------------------------------------------------
-- 14. RPC: owner_update_room_meta — owner edits own room metadata
-- ------------------------------------------------------------

create or replace function owner_update_room_meta(
  p_room_id       uuid,
  p_title         text,
  p_public_summary text,
  p_hero_image_url text default null,
  p_qr_code_url   text default null
) returns void
language plpgsql security definer as $$
declare
  v_owner uuid;
  v_status text;
begin
  select owner_id, status into v_owner, v_status
  from rooms where id = p_room_id;

  if not found then
    raise exception 'room_not_found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if v_status = 'archived' then
    raise exception 'room_archived';
  end if;

  if p_title is null or trim(p_title) = '' then
    raise exception 'title_required';
  end if;

  update rooms
  set title          = trim(p_title),
      public_summary = coalesce(trim(p_public_summary), ''),
      hero_image_url = nullif(trim(coalesce(p_hero_image_url, '')), ''),
      qr_code_url    = nullif(trim(coalesce(p_qr_code_url, '')), '')
  where id = p_room_id;
end;
$$;

-- ------------------------------------------------------------
-- 15. RPC: admin_archive_room / admin_restore_room
-- ------------------------------------------------------------

create or replace function admin_set_room_status(
  p_room_id uuid,
  p_status  text  -- 'active' | 'archived'
) returns void
language plpgsql security definer as $$
declare
  v_role text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'forbidden';
  end if;

  if p_status not in ('active', 'archived') then
    raise exception 'invalid_status';
  end if;

  update rooms set status = p_status where id = p_room_id;
  if not found then
    raise exception 'room_not_found';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 16. RPC: admin_set_room_system_prompt
-- ------------------------------------------------------------

create or replace function admin_set_room_system_prompt(
  p_room_id uuid,
  p_prompt  text
) returns void
language plpgsql security definer as $$
declare
  v_role text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('admin', 'curator') then
    raise exception 'forbidden';
  end if;

  update rooms set system_prompt = trim(p_prompt) where id = p_room_id;
  if not found then
    raise exception 'room_not_found';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 17. Update approve/reject/feature/archive RPCs to emit notifications
-- ------------------------------------------------------------

create or replace function approve_curation(p_entry_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_role     text;
  v_owner_id uuid;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('admin', 'curator') then
    raise exception 'forbidden';
  end if;

  select r.owner_id into v_owner_id
  from entries e
  join rooms r on r.id = e.room_id
  where e.id = p_entry_id;

  update curations
  set curator_status = 'approved'
  where entry_id = p_entry_id;

  update entries
  set locked = false,
      visibility = 'curated_public'
  where id = p_entry_id;

  if v_owner_id is not null then
    insert into notifications(owner_id, kind, entry_id)
    values (v_owner_id, 'curation_approved', p_entry_id);
  end if;
end;
$$;

create or replace function reject_curation(p_entry_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_role     text;
  v_owner_id uuid;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('admin', 'curator') then
    raise exception 'forbidden';
  end if;

  select r.owner_id into v_owner_id
  from entries e
  join rooms r on r.id = e.room_id
  where e.id = p_entry_id;

  update curations
  set curator_status = 'rejected'
  where entry_id = p_entry_id;

  update entries
  set locked = false,
      visibility = 'private'
  where id = p_entry_id;

  if v_owner_id is not null then
    insert into notifications(owner_id, kind, entry_id)
    values (v_owner_id, 'curation_rejected', p_entry_id);
  end if;
end;
$$;

create or replace function feature_entry(p_entry_id uuid, p_featured_level int default null)
returns void
language plpgsql security definer as $$
declare
  v_role     text;
  v_owner_id uuid;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'forbidden';
  end if;

  select r.owner_id into v_owner_id
  from entries e
  join rooms r on r.id = e.room_id
  where e.id = p_entry_id;

  update curations
  set curator_status = 'featured',
      featured_level = coalesce(p_featured_level, featured_level)
  where entry_id = p_entry_id;

  if v_owner_id is not null then
    insert into notifications(owner_id, kind, entry_id)
    values (v_owner_id, 'curation_featured', p_entry_id);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 18. Full-text search index on entries
-- ------------------------------------------------------------

alter table entries
  add column if not exists fts_vector tsvector
    generated always as (
      to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) stored;

create index if not exists idx_entries_fts on entries using gin(fts_vector);

-- RPC: search_absolut_entries
create or replace function search_absolut_entries(
  p_query  text,
  p_limit  int default 20,
  p_offset int default 0
)
returns table (
  id           uuid,
  title        text,
  content      text,
  visibility   text,
  created_at   timestamptz,
  room_id      uuid,
  room_title   text,
  room_slug    text,
  featured_level int,
  curator_status text,
  pinned       boolean,
  rank         float4
)
language sql security definer stable as $$
  select
    e.id, e.title, e.content, e.visibility, e.created_at,
    r.id as room_id, r.title as room_title, r.slug as room_slug,
    c.featured_level,
    c.curator_status,
    c.pinned,
    ts_rank(e.fts_vector, plainto_tsquery('simple', p_query)) as rank
  from entries e
  join rooms r on r.id = e.room_id
  left join curations c on c.entry_id = e.id
  where
    e.visibility = 'curated_public'
    and e.fts_vector @@ plainto_tsquery('simple', p_query)
  order by rank desc, e.created_at desc
  limit p_limit offset p_offset;
$$;

-- ------------------------------------------------------------
-- 19. Grants
-- ------------------------------------------------------------

grant execute on function record_entry_view(uuid, text)         to anon, authenticated;
grant execute on function get_entry_view_count(uuid)            to anon, authenticated;
grant execute on function get_owner_unread_count()              to authenticated;
grant execute on function mark_notifications_read()             to authenticated;
grant execute on function submit_owner_application(text, text, text) to anon, authenticated;
grant execute on function review_owner_application(uuid, text)  to authenticated;
grant execute on function owner_update_room_meta(uuid, text, text, text, text) to authenticated;
grant execute on function admin_set_room_status(uuid, text)     to authenticated;
grant execute on function admin_set_room_system_prompt(uuid, text) to authenticated;
grant execute on function approve_curation(uuid)                to authenticated;
grant execute on function reject_curation(uuid)                 to authenticated;
grant execute on function feature_entry(uuid, int)              to authenticated;
grant execute on function search_absolut_entries(text, int, int) to anon, authenticated;
