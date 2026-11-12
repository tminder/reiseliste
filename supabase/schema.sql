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
  claimed_by text,
  checked boolean not null default false,
  deleted boolean not null default false,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Für Datenbanken, die mit einer älteren Version dieses Skripts angelegt wurden
-- Erledigte automatisch entfernen, pro Liste abschaltbar (D-043)
alter table public.lists add column if not exists auto_clear boolean not null default true;
-- Wer holt den Artikel (Name, D-031)
alter table public.items add column if not exists claimed_by text;
alter table public.lists add column if not exists created_by uuid default auth.uid();
-- Name und Sprache des Mitglieds (aus dem Profil in der App)
alter table public.list_members add column if not exists name text;
alter table public.list_members add column if not exists lang text;

create index if not exists items_list_id_idx on public.items(list_id);

-- Grenzen gegen Missbrauch (D-049). „not valid“: gilt für neue und geänderte Zeilen, bestehende bleiben unangetastet.
-- Die App kürzt Eingaben schon vorher auf diese Längen (src/lib/limits.ts).
alter table public.lists drop constraint if exists lists_len;
alter table public.lists add constraint lists_len
  check (char_length(name) between 1 and 80 and char_length(country) <= 8) not valid;
alter table public.items drop constraint if exists items_len;
alter table public.items add constraint items_len
  check (char_length(text) between 1 and 200 and char_length(coalesce(qty, '')) <= 40 and char_length(lang) <= 5
    and char_length(coalesce(concept_id, '')) <= 40 and char_length(coalesce(local_override, '')) <= 80
    and char_length(coalesce(claimed_by, '')) <= 40 and char_length(coalesce(author, '')) <= 40) not valid;
alter table public.list_members drop constraint if exists list_members_len;
alter table public.list_members add constraint list_members_len
  check (char_length(coalesce(name, '')) <= 40 and char_length(coalesce(lang, '')) <= 5) not valid;

-- Mengen begrenzen: höchstens 30 neue Listen pro Nutzer und Tag, 500 offene Artikel pro Liste,
-- 300 neue Artikel pro Liste und Stunde. Fehlermeldung beginnt mit „limit:“ (die App verwirft die Änderung dann).
create or replace function public.enforce_limits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Die App speichert per upsert: Auch Änderungen bestehender Zeilen lösen den Insert-Trigger aus. Die zählen nicht.
  if tg_table_name = 'lists' and exists (select 1 from lists where id = new.id) then return new; end if;
  if tg_table_name = 'items' and exists (select 1 from items where id = new.id) then return new; end if;
  if tg_table_name = 'lists' then
    if (select count(*) from lists where created_by = auth.uid() and created_at > now() - interval '1 day') >= 30 then
      raise exception 'limit: zu viele neue Listen';
    end if;
  elsif tg_table_name = 'items' then
    if (select count(*) from items where list_id = new.list_id and not deleted) >= 500 then
      raise exception 'limit: zu viele Artikel in der Liste';
    end if;
    if (select count(*) from items where list_id = new.list_id and created_at > now() - interval '1 hour') >= 300 then
      raise exception 'limit: zu viele neue Artikel';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists lists_limits on public.lists;
create trigger lists_limits before insert on public.lists for each row execute function public.enforce_limits();
drop trigger if exists items_limits on public.items;
create trigger items_limits before insert on public.items for each row execute function public.enforce_limits();

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
-- Beitreten über den geteilten Link (wer die ID kennt, darf beitreten).
-- Speichert/aktualisiert dabei Name und Sprache des Mitglieds.
drop function if exists public.join_list(uuid);
create or replace function public.join_list(p_list_id uuid, p_name text default null, p_lang text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from lists where id = p_list_id) then
    return false;
  end if;
  -- Höchstens 50 Mitgliedschaften pro Liste (D-049)
  if not exists (select 1 from list_members where list_id = p_list_id and user_id = auth.uid())
     and (select count(*) from list_members where list_id = p_list_id) >= 50 then
    return false;
  end if;
  insert into list_members(list_id, user_id, name, lang) values (p_list_id, auth.uid(), left(p_name, 40), left(p_lang, 5))
  on conflict (list_id, user_id) do update
    set name = coalesce(excluded.name, list_members.name),
        lang = coalesce(excluded.lang, list_members.lang);
  return true;
end $$;
grant execute on function public.join_list(uuid, text, text) to authenticated;

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

-- Mitglieder einer Liste sehen sich gegenseitig (Name, Sprache)
drop policy if exists "members: read own" on public.list_members;
drop policy if exists "members: read same list" on public.list_members;
create policy "members: read same list" on public.list_members for select to authenticated using (public.is_member(list_id));
-- Eigene Mitgliedschaft beenden (Liste aus „Deine Listen“ entfernen, D-036)
drop policy if exists "members: leave" on public.list_members;
create policy "members: leave" on public.list_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "items: member access" on public.items;
create policy "items: member access" on public.items for all to authenticated
  using (public.is_member(list_id)) with check (public.is_member(list_id));

-- Echtzeit-Updates für Listen und Artikel
do $$ begin
  alter publication supabase_realtime add table public.lists, public.items;
exception when duplicate_object then null;
end $$;

-- Korrekturvorschläge für das Wörterbuch (F-008 → D-024)
-- Nutzer können nur eintragen, nicht lesen. Ausgewertet wird im Supabase-Dashboard (SQL Editor):
--   select * from public.term_suggestions_summary;
create table if not exists public.term_suggestions (
  id uuid primary key default gen_random_uuid(),
  concept_id text,            -- Wörterbuch-ID, leer bei Artikeln ohne Eintrag
  item_text text not null,    -- wie eingegeben
  item_lang text,             -- Sprache der Eingabe
  target_lang text not null,  -- Landessprache
  country text not null,
  old_term text,              -- bisheriger Begriff (leer = keine Übersetzung)
  new_term text not null,
  list_id uuid,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.term_suggestions enable row level security;
drop policy if exists "suggestions: insert own" on public.term_suggestions;
create policy "suggestions: insert own" on public.term_suggestions for insert to authenticated
  with check (user_id = auth.uid() and length(new_term) between 1 and 80);

create or replace view public.term_suggestions_summary as
  select concept_id, target_lang, lower(trim(new_term)) as new_term, min(old_term) as old_term,
         count(distinct user_id) as users, count(*) as total, max(created_at) as last_at,
         array_agg(distinct item_text) as examples
  from public.term_suggestions
  group by concept_id, target_lang, lower(trim(new_term))
  order by users desc, last_at desc;
revoke all on public.term_suggestions_summary from anon, authenticated;

-- API-Schema-Cache neu laden, damit neue Tabellen sofort erreichbar sind
-- Profil auf neuem Gerät übernehmen (D-029): Wer den Link hat, sieht Name und Sprache der Mitglieder
-- (ohne Kennungen), um sich als bestehendes Mitglied auszuwählen.
create or replace function public.list_member_profiles(p_list_id uuid)
returns table(name text, lang text) language sql stable security definer set search_path = public as $$
  select distinct m.name, m.lang from list_members m
  where m.list_id = p_list_id and m.name is not null and auth.uid() is not null
  order by m.name;
$$;
revoke all on function public.list_member_profiles(uuid) from public, anon;
grant execute on function public.list_member_profiles(uuid) to authenticated;

-- Liste löschen, wenn man das einzige Mitglied ist (D-036). „Einziges Mitglied“ heisst: alle Mitgliedschaften
-- gehören zur selben Person (gleicher Name und gleiche Sprache, z. B. Handy und Laptop). Artikel und
-- Mitgliedschaften verschwinden über „on delete cascade“ mit. Sonst passiert nichts (Rückgabe false).
create or replace function public.delete_list(p_list_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare
  my_name text;
  my_lang text;
begin
  select name, lang into my_name, my_lang from list_members where list_id = p_list_id and user_id = auth.uid();
  if not found then return false; end if;
  if exists (
    select 1 from list_members
    where list_id = p_list_id and user_id <> auth.uid()
      and (my_name is null or name is distinct from my_name or lang is distinct from my_lang)
  ) then return false; end if;
  delete from lists where id = p_list_id;
  return true;
end;
$$;
revoke all on function public.delete_list(uuid) from public, anon;
grant execute on function public.delete_list(uuid) to authenticated;

-- Supabase wach halten (D-039): Der GitHub-Job „Supabase wach halten“ ruft täglich ping() auf.
-- Eine kleine Schreibaktion zählt sicher als Datenbank-Aktivität (Gratis-Projekte pausieren nach 7 Tagen ohne).
create table if not exists public.keepalive (id int primary key default 1 check (id = 1), at timestamptz not null default now());
alter table public.keepalive enable row level security; -- kein direkter Zugriff, nur über ping()
create or replace function public.ping()
returns timestamptz language sql volatile security definer set search_path = public as $$
  insert into keepalive (id, at) values (1, now()) on conflict (id) do update set at = excluded.at returning at;
$$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

notify pgrst, 'reload schema';
