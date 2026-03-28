-- Global Vision v2 hardening: RBAC + RLS + RPC + audit log

create extension if not exists pgcrypto;

-- 1) Data model hardening
alter table if exists entries
	add column if not exists author_id uuid references profiles(id);

create index if not exists idx_rooms_owner_id on rooms(owner_id);
create index if not exists idx_entries_room_id on entries(room_id);
create index if not exists idx_entries_visibility on entries(visibility);
create index if not exists idx_entries_author_id on entries(author_id);
create index if not exists idx_dialog_messages_entry_id on dialog_messages(entry_id);
create index if not exists idx_curations_entry_id on curations(entry_id);
create unique index if not exists uq_curations_entry_id on curations(entry_id);
create index if not exists idx_consents_room_owner on consents(room_id, owner_id);

create table if not exists audit_log (
	id uuid primary key default gen_random_uuid(),
	actor_id uuid references profiles(id),
	action text not null,
	entity_type text not null,
	entity_id uuid,
	payload jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_actor on audit_log(actor_id);
create index if not exists idx_audit_log_entity on audit_log(entity_type, entity_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);

-- 2) Role helper
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
	select p.role
	from public.profiles p
	where p.id = auth.uid()
	limit 1
$$;

-- 3) Enable RLS everywhere (including audit)
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table entries enable row level security;
alter table dialog_messages enable row level security;
alter table curations enable row level security;
alter table consents enable row level security;
alter table media_assets enable row level security;
alter table audit_log enable row level security;

-- 4) Drop previous policies (idempotent)
drop policy if exists "guest can read public rooms" on rooms;
drop policy if exists "guest can read public entries" on entries;
drop policy if exists "owner can read own rooms" on rooms;
drop policy if exists "owner can read own consents" on consents;
drop policy if exists "owner can read own dialog messages" on dialog_messages;
drop policy if exists "curator admin can manage curations" on curations;

drop policy if exists profiles_select on profiles;
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;
drop policy if exists profiles_delete on profiles;

drop policy if exists rooms_select on rooms;
drop policy if exists rooms_insert on rooms;
drop policy if exists rooms_update on rooms;
drop policy if exists rooms_delete on rooms;

drop policy if exists entries_select on entries;
drop policy if exists entries_insert on entries;
drop policy if exists entries_update on entries;
drop policy if exists entries_delete on entries;

drop policy if exists dialog_select on dialog_messages;
drop policy if exists dialog_insert on dialog_messages;
drop policy if exists dialog_update on dialog_messages;
drop policy if exists dialog_delete on dialog_messages;

drop policy if exists consents_select on consents;
drop policy if exists consents_insert on consents;
drop policy if exists consents_update on consents;
drop policy if exists consents_delete on consents;

drop policy if exists curations_select on curations;
drop policy if exists curations_insert on curations;
drop policy if exists curations_update on curations;
drop policy if exists curations_delete on curations;

drop policy if exists media_assets_select on media_assets;
drop policy if exists media_assets_insert on media_assets;
drop policy if exists media_assets_update on media_assets;
drop policy if exists media_assets_delete on media_assets;

drop policy if exists audit_log_select on audit_log;
drop policy if exists audit_log_insert on audit_log;

-- 5) Profiles policies
create policy profiles_select on profiles
for select
using (
	id = auth.uid()
	or public.current_user_role() = 'admin'
);

create policy profiles_insert on profiles
for insert
with check (
	id = auth.uid()
	or public.current_user_role() = 'admin'
);

create policy profiles_update on profiles
for update
using (
	id = auth.uid()
	or public.current_user_role() = 'admin'
)
with check (
	id = auth.uid()
	or public.current_user_role() = 'admin'
);

create policy profiles_delete on profiles
for delete
using (public.current_user_role() = 'admin');

-- 6) Rooms policies
create policy rooms_select on rooms
for select
using (
	visibility = 'public_room'
	or owner_id = auth.uid()
	or public.current_user_role() in ('curator', 'admin')
);

create policy rooms_insert on rooms
for insert
with check (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
);

create policy rooms_update on rooms
for update
using (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
)
with check (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
);

create policy rooms_delete on rooms
for delete
using (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
);

-- 7) Entries policies
create policy entries_select on entries
for select
using (
	visibility in ('curated_public', 'public_room')
	or exists (
		select 1 from rooms r where r.id = entries.room_id and r.owner_id = auth.uid()
	)
	or public.current_user_role() in ('curator', 'admin')
);

create policy entries_insert on entries
for insert
with check (
	exists (
		select 1 from rooms r where r.id = entries.room_id and r.owner_id = auth.uid()
	)
	or public.current_user_role() = 'admin'
);

create policy entries_update on entries
for update
using (
	exists (
		select 1 from rooms r where r.id = entries.room_id and r.owner_id = auth.uid()
	)
	or public.current_user_role() in ('curator', 'admin')
)
with check (
	exists (
		select 1 from rooms r where r.id = entries.room_id and r.owner_id = auth.uid()
	)
	or public.current_user_role() in ('curator', 'admin')
);

create policy entries_delete on entries
for delete
using (
	exists (
		select 1 from rooms r where r.id = entries.room_id and r.owner_id = auth.uid()
	)
	or public.current_user_role() = 'admin'
);

-- 8) Dialog policies
create policy dialog_select on dialog_messages
for select
using (
	exists (
		select 1
		from entries e
		join rooms r on r.id = e.room_id
		where e.id = dialog_messages.entry_id
			and (
				r.owner_id = auth.uid()
				or public.current_user_role() in ('curator', 'admin')
			)
	)
);

create policy dialog_insert on dialog_messages
for insert
with check (
	exists (
		select 1
		from entries e
		join rooms r on r.id = e.room_id
		where e.id = dialog_messages.entry_id
			and (
				r.owner_id = auth.uid()
				or public.current_user_role() = 'admin'
			)
	)
);

create policy dialog_update on dialog_messages
for update
using (
	exists (
		select 1
		from entries e
		join rooms r on r.id = e.room_id
		where e.id = dialog_messages.entry_id
			and (
				r.owner_id = auth.uid()
				or public.current_user_role() = 'admin'
			)
	)
)
with check (
	exists (
		select 1
		from entries e
		join rooms r on r.id = e.room_id
		where e.id = dialog_messages.entry_id
			and (
				r.owner_id = auth.uid()
				or public.current_user_role() = 'admin'
			)
	)
);

create policy dialog_delete on dialog_messages
for delete
using (
	exists (
		select 1
		from entries e
		join rooms r on r.id = e.room_id
		where e.id = dialog_messages.entry_id
			and (
				r.owner_id = auth.uid()
				or public.current_user_role() = 'admin'
			)
	)
);

-- 9) Consents policies
create policy consents_select on consents
for select
using (
	owner_id = auth.uid()
	or public.current_user_role() in ('curator', 'admin')
);

create policy consents_insert on consents
for insert
with check (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
);

create policy consents_update on consents
for update
using (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
)
with check (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
);

create policy consents_delete on consents
for delete
using (
	owner_id = auth.uid()
	or public.current_user_role() = 'admin'
);

-- 10) Curations policies
create policy curations_select on curations
for select
using (
	public.current_user_role() in ('curator', 'admin')
	or exists (
		select 1
		from entries e
		join rooms r on r.id = e.room_id
		where e.id = curations.entry_id
			and r.owner_id = auth.uid()
	)
);

create policy curations_insert on curations
for insert
with check (public.current_user_role() in ('curator', 'admin'));

create policy curations_update on curations
for update
using (public.current_user_role() in ('curator', 'admin'))
with check (public.current_user_role() in ('curator', 'admin'));

create policy curations_delete on curations
for delete
using (public.current_user_role() = 'admin');

-- 11) Media assets policies
create policy media_assets_select on media_assets
for select
using (
	exists (
		select 1
		from rooms r
		where r.id = media_assets.room_id
			and (
				r.visibility = 'public_room'
				or r.owner_id = auth.uid()
				or public.current_user_role() in ('curator', 'admin')
			)
	)
);

create policy media_assets_insert on media_assets
for insert
with check (
	exists (
		select 1
		from rooms r
		where r.id = media_assets.room_id
			and (r.owner_id = auth.uid() or public.current_user_role() = 'admin')
	)
);

create policy media_assets_update on media_assets
for update
using (
	exists (
		select 1
		from rooms r
		where r.id = media_assets.room_id
			and (r.owner_id = auth.uid() or public.current_user_role() = 'admin')
	)
)
with check (
	exists (
		select 1
		from rooms r
		where r.id = media_assets.room_id
			and (r.owner_id = auth.uid() or public.current_user_role() = 'admin')
	)
);

create policy media_assets_delete on media_assets
for delete
using (
	exists (
		select 1
		from rooms r
		where r.id = media_assets.room_id
			and (r.owner_id = auth.uid() or public.current_user_role() = 'admin')
	)
);

-- 12) Audit policies
create policy audit_log_select on audit_log
for select
using (
	public.current_user_role() = 'admin'
	or actor_id = auth.uid()
);

create policy audit_log_insert on audit_log
for insert
with check (
	actor_id = auth.uid()
	or public.current_user_role() = 'admin'
);

-- 13) Helper functions for controlled mutations
create or replace function public.log_audit(
	p_action text,
	p_entity_type text,
	p_entity_id uuid,
	p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.audit_log (actor_id, action, entity_type, entity_id, payload)
	values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.publish_entry_to_absolut(
	p_entry_id uuid,
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

	update public.entries
	set visibility = 'curated_public',
			is_curated = true
	where id = p_entry_id;

	insert into public.curations (id, entry_id, curator_status, featured_level, published_at)
	values (gen_random_uuid(), p_entry_id, 'approved', greatest(p_featured_level, 0), now())
	on conflict (entry_id) do update
		set curator_status = 'approved',
				featured_level = excluded.featured_level,
				published_at = excluded.published_at;

	perform public.log_audit(
		'publish_entry_to_absolut',
		'entry',
		p_entry_id,
		jsonb_build_object('featured_level', greatest(p_featured_level, 0))
	);
end;
$$;

create or replace function public.revoke_publication(p_entry_id uuid)
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

	update public.entries
	set visibility = 'private',
			is_curated = false
	where id = p_entry_id;

	update public.curations
	set curator_status = 'rejected',
			published_at = null
	where entry_id = p_entry_id;

	perform public.log_audit('revoke_publication', 'entry', p_entry_id, '{}'::jsonb);
end;
$$;

create or replace function public.set_entry_visibility(
	p_entry_id uuid,
	p_visibility text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_role text;
	v_owner_id uuid;
begin
	if p_visibility not in ('private', 'curated_public', 'public_room') then
		raise exception 'invalid visibility';
	end if;

	v_role := public.current_user_role();

	select r.owner_id into v_owner_id
	from public.entries e
	join public.rooms r on r.id = e.room_id
	where e.id = p_entry_id;

	if v_owner_id is null then
		raise exception 'entry not found';
	end if;

	if not (v_role = 'admin' or v_owner_id = auth.uid()) then
		raise exception 'forbidden';
	end if;

	update public.entries
	set visibility = p_visibility,
			is_curated = (p_visibility = 'curated_public')
	where id = p_entry_id;

	perform public.log_audit(
		'set_entry_visibility',
		'entry',
		p_entry_id,
		jsonb_build_object('visibility', p_visibility)
	);
end;
$$;

create or replace function public.approve_curation(
	p_entry_id uuid,
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
				published_at = excluded.published_at;

	update public.entries
	set visibility = 'curated_public',
			is_curated = true
	where id = p_entry_id;

	perform public.log_audit(
		'approve_curation',
		'entry',
		p_entry_id,
		jsonb_build_object('featured_level', greatest(p_featured_level, 0))
	);
end;
$$;

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
				published_at = null;

	update public.entries
	set is_curated = false
	where id = p_entry_id;

	perform public.log_audit('reject_curation', 'entry', p_entry_id, '{}'::jsonb);
end;
$$;

create or replace function public.get_absolut_feed(
	p_limit int default 50,
	p_offset int default 0
)
returns table (
	id uuid,
	room_id uuid,
	room_slug text,
	room_title text,
	title text,
	content text,
	visibility text,
	created_at timestamptz,
	featured_level int
)
language sql
stable
security definer
set search_path = public
as $$
	select
		e.id,
		e.room_id,
		r.slug as room_slug,
		r.title as room_title,
		e.title,
		e.content,
		e.visibility,
		e.created_at,
		coalesce(c.featured_level, 0) as featured_level
	from public.entries e
	join public.rooms r on r.id = e.room_id
	left join public.curations c on c.entry_id = e.id
	where e.visibility in ('curated_public', 'public_room')
		and (
			e.visibility = 'public_room'
			or (e.visibility = 'curated_public' and c.curator_status = 'approved')
		)
	order by coalesce(c.featured_level, 0) desc, e.created_at desc
	limit greatest(p_limit, 1)
	offset greatest(p_offset, 0)
$$;

-- 14) Grants for authenticated RPC usage
revoke execute on function public.publish_entry_to_absolut(uuid, int) from public;
revoke execute on function public.revoke_publication(uuid) from public;
revoke execute on function public.set_entry_visibility(uuid, text) from public;
revoke execute on function public.approve_curation(uuid, int) from public;
revoke execute on function public.reject_curation(uuid) from public;
revoke execute on function public.get_absolut_feed(int, int) from public;

grant execute on function public.publish_entry_to_absolut(uuid, int) to authenticated;
grant execute on function public.revoke_publication(uuid) to authenticated;
grant execute on function public.set_entry_visibility(uuid, text) to authenticated;
grant execute on function public.approve_curation(uuid, int) to authenticated;
grant execute on function public.reject_curation(uuid) to authenticated;
grant execute on function public.get_absolut_feed(int, int) to anon, authenticated;
