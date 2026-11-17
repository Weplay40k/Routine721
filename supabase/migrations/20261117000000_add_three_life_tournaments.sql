create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lives integer not null default 3 check (lives between 0 and 3),
  joined_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);
create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player1_user_id uuid not null references auth.users(id) on delete restrict,
  player2_user_id uuid not null references auth.users(id) on delete restrict,
  winner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','completed')),
  notes text,
  played_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tournament_match_distinct_players check (player1_user_id <> player2_user_id)
);
create index if not exists tournament_players_tournament_lives_idx on public.tournament_players (tournament_id, lives desc);
create index if not exists tournament_matches_tournament_idx on public.tournament_matches (tournament_id, created_at desc);
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_matches enable row level security;
create policy tournaments_read_authenticated on public.tournaments for select to authenticated using (true);
create policy tournaments_insert_owner on public.tournaments for insert to authenticated with check (created_by = (select auth.uid()));
create policy tournaments_update_owner on public.tournaments for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy tournaments_delete_owner on public.tournaments for delete to authenticated using (created_by = (select auth.uid()));
create policy tournament_players_read_authenticated on public.tournament_players for select to authenticated using (true);
create policy tournament_players_insert_owner on public.tournament_players for insert to authenticated with check (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid())));
create policy tournament_players_update_owner on public.tournament_players for update to authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid()))) with check (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid())));
create policy tournament_players_delete_owner on public.tournament_players for delete to authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid())));
create policy tournament_matches_read_authenticated on public.tournament_matches for select to authenticated using (true);
create policy tournament_matches_insert_owner on public.tournament_matches for insert to authenticated with check (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid())));
create policy tournament_matches_update_owner on public.tournament_matches for update to authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid()))) with check (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid())));
create policy tournament_matches_delete_owner on public.tournament_matches for delete to authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = (select auth.uid())));
grant select, insert, update, delete on public.tournaments, public.tournament_players, public.tournament_matches to authenticated;
create or replace function public.apply_tournament_life_result()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_loser uuid; v_old_loser uuid; v_changed integer;
begin
  if tg_op = 'DELETE' then
    if old.status = 'completed' and old.winner_user_id is not null then
      v_old_loser := case when old.winner_user_id = old.player1_user_id then old.player2_user_id else old.player1_user_id end;
      update public.tournament_players set lives = least(3, lives + 1) where tournament_id = old.tournament_id and user_id = v_old_loser;
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' and (new.status <> 'completed' or new.winner_user_id is distinct from old.winner_user_id) then
    v_old_loser := case when old.winner_user_id = old.player1_user_id then old.player2_user_id else old.player1_user_id end;
    update public.tournament_players set lives = least(3, lives + 1) where tournament_id = old.tournament_id and user_id = v_old_loser;
  end if;
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status <> 'completed' or new.winner_user_id is distinct from old.winner_user_id) then
    if new.winner_user_id is null or new.winner_user_id not in (new.player1_user_id, new.player2_user_id) then raise exception 'Select one of the two players as the winner.'; end if;
    v_loser := case when new.winner_user_id = new.player1_user_id then new.player2_user_id else new.player1_user_id end;
    if not exists (select 1 from public.tournament_players where tournament_id = new.tournament_id and user_id = new.player1_user_id and lives > 0)
       or not exists (select 1 from public.tournament_players where tournament_id = new.tournament_id and user_id = new.player2_user_id and lives > 0) then
      raise exception 'Both players must be registered and still have lives.';
    end if;
    update public.tournament_players set lives = lives - 1 where tournament_id = new.tournament_id and user_id = v_loser and lives > 0;
    get diagnostics v_changed = row_count;
    if v_changed <> 1 then raise exception 'Could not deduct the losing player life.'; end if;
    new.played_at := coalesce(new.played_at, now());
  end if;
  return new;
end;
$$;
create trigger tournament_life_result_trigger before insert or update or delete on public.tournament_matches for each row execute function public.apply_tournament_life_result();
