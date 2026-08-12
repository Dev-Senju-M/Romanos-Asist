create extension if not exists "pgcrypto";

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  mark text not null check (mark in ('A', 'Ex', 'F')),
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);

alter table members enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;

create policy "Acceso publico - members" on members for all using (true) with check (true);
create policy "Acceso publico - events" on events for all using (true) with check (true);
create policy "Acceso publico - attendance" on attendance for all using (true) with check (true);
