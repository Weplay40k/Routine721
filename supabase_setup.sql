
-- 40K WAR ROOM V2 — SUPABASE SETUP
-- Run this whole script in Supabase SQL Editor.
-- It creates profiles, shared groups, memberships, games, invite-code functions,
-- and Row Level Security policies.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Battle-brother',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  played_at date not null default current_date,
  player_id uuid not null references auth.users(id) on delete cascade,
  player_faction text not null,
  opponent_name text,
  opponent_faction text not null,
  result text not null check (result in ('Win','Loss','Draw')),
  player_vp integer,
  opponent_vp integer,
  mission text,
  event_name text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists games_group_id_idx on public.games(group_id);
create index if not exists games_player_id_idx on public.games(player_id);
create index if not exists games_played_at_idx on public.games(played_at);

create or replace function public.make_invite_code()
returns text language plpgsql as $$
declare code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(5),'hex'),1,6));
    exit when not exists(select 1 from public.groups where invite_code=code);
  end loop;
  return code;
end $$;

create or replace function public.create_group(p_name text)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  insert into public.profiles(id,display_name)
    values(auth.uid(), coalesce(nullif(auth.jwt()->'user_metadata'->>'display_name',''),'Battle-brother'))
    on conflict(id) do nothing;
  insert into public.groups(name,invite_code,created_by)
    values(trim(p_name),public.make_invite_code(),auth.uid())
    returning id into gid;
  insert into public.group_members(group_id,user_id,role)
    values(gid,auth.uid(),'owner');
  return gid;
end $$;

create or replace function public.join_group(p_invite_code text)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  select id into gid from public.groups where invite_code=upper(trim(p_invite_code));
  if gid is null then raise exception 'Invite code not found'; end if;
  insert into public.profiles(id,display_name)
    values(auth.uid(), coalesce(nullif(auth.jwt()->'user_metadata'->>'display_name',''),'Battle-brother'))
    on conflict(id) do nothing;
  insert into public.group_members(group_id,user_id,role)
    values(gid,auth.uid(),'member')
    on conflict(group_id,user_id) do nothing;
  return gid;
end $$;

-- Profile creation trigger for every new auth account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Battle-brother'))
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.games enable row level security;

create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.group_members where group_id=gid and user_id=auth.uid()) $$;

create policy "profiles readable by signed in users"
on public.profiles for select to authenticated using (true);

create policy "users update own profile"
on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

create policy "members read groups"
on public.groups for select to authenticated using (public.is_group_member(id));

create policy "members read memberships"
on public.group_members for select to authenticated using (public.is_group_member(group_id));

create policy "members read games"
on public.games for select to authenticated using (public.is_group_member(group_id));

create policy "members insert games"
on public.games for insert to authenticated
with check (public.is_group_member(group_id) and player_id = auth.uid());

create policy "owners delete games"
on public.games for delete to authenticated
using (public.is_group_member(group_id) and exists(
  select 1 from public.group_members gm
  where gm.group_id=games.group_id and gm.user_id=auth.uid() and gm.role='owner'
));

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
