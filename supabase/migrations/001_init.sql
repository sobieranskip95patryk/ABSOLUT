create table if not exists profiles (
  id uuid primary key,
  role text not null check (role in ('guest', 'owner', 'curator', 'admin')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key,
  owner_id uuid not null references profiles(id),
  title text not null,
  slug text not null unique,
  theme text not null,
  mission text not null,
  visibility text not null default 'private',
  qr_code_url text,
  hero_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  content text not null,
  visibility text not null check (visibility in ('private', 'curated_public', 'public_room')),
  is_curated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists dialog_messages (
  id uuid primary key,
  entry_id uuid not null references entries(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists curations (
  id uuid primary key,
  entry_id uuid not null references entries(id) on delete cascade,
  curator_status text not null check (curator_status in ('approved', 'pending', 'rejected')),
  featured_level int not null default 0,
  published_at timestamptz
);

create table if not exists consents (
  id uuid primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  allow_public_excerpt boolean not null default false,
  allow_anonymous_publication boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists media_assets (
  id uuid primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  kind text not null,
  url text not null,
  alt text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table rooms enable row level security;
alter table entries enable row level security;
alter table dialog_messages enable row level security;
alter table curations enable row level security;
alter table consents enable row level security;
alter table media_assets enable row level security;

create policy "guest can read public rooms" on rooms
for select using (visibility = 'public_room' or exists (
  select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('owner', 'curator', 'admin')
));

create policy "guest can read public entries" on entries
for select using (
  visibility in ('curated_public', 'public_room')
  or exists (
    select 1
    from rooms
    where rooms.id = entries.room_id
      and rooms.owner_id = auth.uid()
  )
  or exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('curator', 'admin')
  )
);

create policy "owner can read own rooms" on rooms
for select using (owner_id = auth.uid());

create policy "owner can read own consents" on consents
for select using (owner_id = auth.uid());

create policy "owner can read own dialog messages" on dialog_messages
for select using (
  exists (
    select 1
    from entries
    join rooms on rooms.id = entries.room_id
    where entries.id = dialog_messages.entry_id
      and rooms.owner_id = auth.uid()
  )
);

create policy "curator admin can manage curations" on curations
for all using (
  exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('curator', 'admin')
  )
)
with check (
  exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('curator', 'admin')
  )
);
