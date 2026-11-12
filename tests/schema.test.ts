// Datenbank-Schema (supabase/schema.sql) mit einem echten Postgres im Speicher (PGlite) prüfen:
// mehrfach ausführbar, Zugriffsregeln, Grenzen (D-049), Löschen (D-036), Fehlermeldungen (D-051).
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

const A = '11111111-1111-1111-1111-111111111111'
const A2 = '33333333-3333-3333-3333-333333333333'
const B = '22222222-2222-2222-2222-222222222222'
const L = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const M = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

let db: PGlite
const as = (u: string) => db.exec(`reset role; select set_config('request.jwt.claim.sub','${u}',false); set role authenticated;`)
const val = async (sql: string) => Object.values((await db.query<Record<string, unknown>>(sql)).rows[0] ?? {})[0]
const fails = async (sql: string) => {
  try {
    await db.query(sql)
    return null
  } catch (e) {
    return (e as Error).message
  }
}

beforeAll(async () => {
  db = new PGlite()
  // Nachbildung der Supabase-Umgebung: Rollen, auth.uid(), Realtime-Publikation
  await db.exec(`create role authenticated nologin; create role anon nologin; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon; create publication supabase_realtime;`)
  const schema = readFileSync('supabase/schema.sql', 'utf8')
  await db.exec(schema)
  await db.exec(schema) // muss mehrfach ausführbar sein
  // Supabase vergibt diese Rechte automatisch, die Regeln (RLS) schränken sie ein
  await db.exec(`grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    revoke all on public.client_errors_summary from public, anon, authenticated;`)
}, 30_000)

describe('schema.sql', () => {
  it('Listen und Mitgliedschaft', async () => {
    await as(A)
    await db.exec(`insert into lists(id,name,country) values ('${L}','L','ES'),('${M}','M','ES')`)
    expect(await val(`select join_list('${L}','Tobias','de') and join_list('${M}','Tobias','de')`)).toBe(true)
    await db.exec(`insert into items(id,list_id,text,lang) values (gen_random_uuid(),'${L}','Milch','de')`)
    await as(B)
    expect(await val(`select count(*) from lists`)).toBe(0) // fremde Listen unsichtbar
    expect(await val(`select join_list('${M}', repeat('n', 60), 'de')`)).toBe(true)
    expect(await val(`select char_length(name) from list_members where list_id='${M}' and user_id='${B}'`)).toBe(40)
  })

  it('Längen-Grenzen (D-049)', async () => {
    await as(A)
    expect(await fails(`insert into lists(id,name,country) values (gen_random_uuid(), repeat('x',81),'ES')`)).toMatch(/lists_len/)
    expect(await fails(`insert into items(id,list_id,text,lang) values (gen_random_uuid(),'${L}',repeat('x',201),'de')`)).toMatch(/items_len/)
  })

  it('Mengen-Grenzen, Änderungen bestehender Zeilen zählen nicht (D-049)', async () => {
    await as(A)
    await db.exec(`insert into items(id,list_id,text,lang) select gen_random_uuid(),'${L}','A'||g,'de' from generate_series(1,298) g`)
    await db.exec(`insert into items(id,list_id,text,lang) values ('dddddddd-dddd-dddd-dddd-dddddddddddd','${L}','Brot','de')`) // Nr. 300
    expect(await fails(`insert into items(id,list_id,text,lang) values (gen_random_uuid(),'${L}','zu viel','de')`)).toMatch(/limit:/)
    expect(
      await val(`insert into items(id,list_id,text,lang,checked) values ('dddddddd-dddd-dddd-dddd-dddddddddddd','${L}','Brot','de',true)
        on conflict (id) do update set checked = excluded.checked returning checked`),
    ).toBe(true)
  })

  it('Liste löschen nur als einziges Mitglied (D-036)', async () => {
    await as(A2)
    expect(await val(`select join_list('${L}','Tobias','de')`)).toBe(true) // gleiche Person, zweites Gerät
    await as(B)
    expect(await val(`select delete_list('${L}')`)).toBe(false) // kein Mitglied
    await as(A)
    expect(await val(`select delete_list('${M}')`)).toBe(false) // B ist auch Mitglied
    expect(await val(`select delete_list('${L}')`)).toBe(true)
    await db.exec('reset role')
    expect(await val(`select count(*) from items where list_id='${L}'`)).toBe(0)
    expect(await val(`select count(*) from list_members where list_id='${L}'`)).toBe(0)
  })

  it('Fehlermeldungen: nur eintragen, begrenzt, nach 30 Tagen gelöscht (D-051)', async () => {
    await as(A)
    await db.exec(`insert into client_errors(kind,message) select 'js','m'||g from generate_series(1,50) g`)
    expect(await val(`select count(*) from client_errors`)).toBe(0) // nicht lesbar
    expect(await fails(`insert into client_errors(kind,message) values ('js','zu viel')`)).toMatch(/limit:/)
    expect(await fails(`select * from client_errors_summary`)).toMatch(/permission denied/)
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);
      insert into client_errors(message, created_at) values ('alt', now() - interval '31 days'); set role anon;`)
    expect(await val(`select ping() is not null`)).toBe(true)
    await db.exec('reset role')
    expect(await val(`select count(*) from client_errors where message = 'alt'`)).toBe(0)
  })
})
