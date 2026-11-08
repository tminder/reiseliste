-- Reiseliste – Datenbankschema für Supabase
-- Im Supabase-Dashboard unter "SQL Editor" einfügen und ausführen.
-- Zugriff: Jedes Gerät meldet sich anonym an. Eine Liste sieht nur, wer sie erstellt
-- oder über den Link beigetreten ist (Tabelle list_members).

create table if not exists public.lists (
  id uuid primary key,
  name text not null,
  country text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists public.items (
  id uuid primary key,
  list_id uuid not null references public.lists(id) on delete cascade,
  text text not null,
  qty text,
  lang text not null,
  concept_id text,
  local_override text,
  checked boolean not null default false,
  deleted boolean not null default false,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Für Datenbanken, die mit einer älteren Version dieses Skripts angelegt wurden
alter table public.lists add column if not exists created_by uuid default auth.uid();

create index if not exists items_list_id_idx on public.items(list_id);

-- Hilfsfunktion: Ist der aktuelle Nutzer Mitglied der Liste?
create or replace function public.is_member(p_list_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from list_members where list_id = p_list_id and user_id = auth.uid());
$$;

-- Wer eine Liste anlegt, wird automatisch Mitglied
create or replace function public.add_creator_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into list_members(list_id, user_id) values (new.id, auth.uid()) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists lists_add_creator on public.lists;
create trigger lists_add_creator after insert on public.lists
  for each row execute function public.add_creator_as_member();

-- Beitreten über den geteilten Link (wer die ID kennt, darf beitreten)
create or replace function public.join_list(p_list_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from lists where id = p_list_id) then
    return false;
  end if;
  insert into list_members(list_id, user_id) values (p_list_id, auth.uid()) on conflict do nothing;
  return true;
end $$;
grant execute on function public.join_list(uuid) to authenticated;

-- Zugriffsregeln (Row Level Security)
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.items enable row level security;

drop policy if exists "lists: read as member" on public.lists;
-- created_by: Beim Anlegen (auch per Upsert) muss die neue Zeile schon lesbar sein,
-- bevor der Trigger die Mitgliedschaft einträgt.
create policy "lists: read as member" on public.lists for select to authenticated
  using (created_by = auth.uid() or public.is_member(id));
drop policy if exists "lists: create" on public.lists;
create policy "lists: create" on public.lists for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "lists: update as member" on public.lists;
create policy "lists: update as member" on public.lists for update to authenticated using (public.is_member(id));

drop policy if exists "members: read own" on public.list_members;
create policy "members: read own" on public.list_members for select to authenticated using (user_id = auth.uid());

drop policy if exists "items: member access" on public.items;
create policy "items: member access" on public.items for all to authenticated
  using (public.is_member(list_id)) with check (public.is_member(list_id));

-- Echtzeit-Updates für Listen und Artikel
do $$ begin
  alter publication supabase_realtime add table public.lists, public.items;
exception when duplicate_object then null;
end $$;
