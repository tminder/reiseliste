import { MAX, clip, clipOrNull } from './limits'
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { Lang } from '../data/dictionary'
import { FEATURES } from '../features'

// ---------- Typen ----------

export interface ShoppingList {
  id: string
  name: string
  country: string
  /** Erledigte automatisch entfernen (D-043). undefined = Standard (an) bzw. Spalte fehlt */
  autoClear?: boolean
  updatedAt: string
}

export interface Item {
  id: string
  listId: string
  text: string
  qty: string | null
  lang: Lang
  conceptId: string | null
  localOverride: string | null
  /** Wer holt den Artikel (Name, D-031). undefined = Spalte unbekannt bzw. nie gesetzt */
  claimedBy?: string | null
  checked: boolean
  deleted: boolean
  author: string
  createdAt: string
  updatedAt: string
}

export interface Profile {
  name: string
  lang: Lang
  /** Wohnland (Code aus COUNTRIES) oder null = anderes Land. Fehlt bei älteren Profilen (D-041) */
  home?: string | null
}

export type SyncState = 'local-only' | 'offline' | 'syncing' | 'synced' | 'error'

// ---------- Supabase (optional) ----------

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null

/** Letzte Fehlermeldung von Supabase – wird in der App angezeigt, um Probleme zu finden. */
export let lastSyncError: string | null = null
export const setError = (where: string, msg: string) => {
  lastSyncError = `${where}: ${msg}`
  console.warn('[reiseliste]', lastSyncError)
}

let authReady: Promise<boolean> | null = null
/** Anonyme Anmeldung – nötig, damit die Zugriffsregeln (RLS) greifen. */
export function ensureAuth(): Promise<boolean> {
  if (!supabase) return Promise.resolve(false)
  authReady ??= (async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) return true
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError('Anmeldung', error.message)
      authReady = null
      return false
    }
    return true
  })()
  return authReady
}

// ---------- Lokaler Speicher ----------

const LS = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* Speicher voll oder gesperrt – App läuft im Speicher weiter */
    }
  },
}

export const profileStore = {
  get: () => LS.get<Profile | null>('rl:profile', null),
  set: (p: Profile) => LS.set('rl:profile', p),
}

export function knownLists(): ShoppingList[] {
  const ids = LS.get<string[]>('rl:lists', [])
  return ids
    .map((id) => LS.get<{ list: ShoppingList | null }>(`rl:list:${id}`, { list: null }).list)
    .filter((l): l is ShoppingList => !!l)
}

function rememberList(id: string) {
  const ids = LS.get<string[]>('rl:lists', [])
  if (!ids.includes(id)) LS.set('rl:lists', [id, ...ids])
}

/** Zuletzt geöffnete Liste (D-028): wird beim Öffnen der App automatisch angezeigt */
export function setLastList(id: string) {
  LS.set('rl:last', id)
}

export function lastList(): string | null {
  const id = LS.get<string | null>('rl:last', null)
  return id && LS.get<string[]>('rl:lists', []).includes(id) ? id : null
}

/** Name und Sprache der Mitglieder einer Liste, auch ohne Mitgliedschaft (D-029) */
export async function memberProfiles(listId: string): Promise<Profile[]> {
  if (!supabase || !navigator.onLine) return []
  if (!(await ensureAuth())) return []
  const { data, error } = await supabase.rpc('list_member_profiles', { p_list_id: listId })
  if (error || !Array.isArray(data)) return []
  return (data as { name: string; lang: Lang | null }[])
    .filter((m) => m.name && m.lang)
    .map((m) => ({ name: m.name, lang: m.lang as Lang }))
}

/** Letzte Änderung pro Liste (D-036): aus dem Gerätespeicher, wenn möglich ergänzt durch Supabase */
export function localLastChange(id: string): string | null {
  const c = LS.get<{ list: ShoppingList | null; items?: Item[] }>(`rl:list:${id}`, { list: null })
  const times = [c.list?.updatedAt, ...(c.items ?? []).map((i) => i.updatedAt)].filter((x): x is string => !!x)
  return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null
}

export async function remoteLastChanges(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (!supabase || !ids.length || !navigator.onLine) return out
  if (!(await ensureAuth())) return out
  const [lists, items] = await Promise.all([
    supabase.from('lists').select('id, updated_at').in('id', ids),
    supabase.from('items').select('list_id, updated_at').in('list_id', ids).order('updated_at', { ascending: false }).limit(1000),
  ])
  const put = (id: string, at: string) => {
    if (!out[id] || at > out[id]) out[id] = at
  }
  for (const l of (lists.data ?? []) as { id: string; updated_at: string }[]) put(l.id, l.updated_at)
  for (const i of (items.data ?? []) as { list_id: string; updated_at: string }[]) put(i.list_id, i.updated_at)
  return out
}

/** Liste aus „Deine Listen“ entfernen und austreten (D-036). Für die anderen Mitglieder bleibt sie bestehen. */
export async function leaveList(id: string) {
  forgetList(id)
  if (!supabase || !navigator.onLine) return
  try {
    if (!(await ensureAuth())) return
    const { data } = await supabase.auth.getUser()
    if (data.user) await supabase.from('list_members').delete().eq('list_id', id).eq('user_id', data.user.id)
  } catch {
    /* Austritt ist optional – lokal ist die Liste schon weg */
  }
}

/**
 * Ist man (auch mit mehreren Geräten, gleicher Name und Sprache) das einzige Mitglied der Liste? (D-036)
 * Ohne Supabase gibt es die Liste nur auf diesem Gerät: true. Offline oder bei Fehlern: null (unbekannt).
 */
export async function isSoleMember(id: string): Promise<boolean | null> {
  if (!supabase) return true
  if (!navigator.onLine) return null
  try {
    if (!(await ensureAuth())) return null
    const [{ data, error }, { data: auth }] = await Promise.all([
      supabase.from('list_members').select('user_id, name, lang').eq('list_id', id),
      supabase.auth.getUser(),
    ])
    if (error || !data) return null
    const rows = data as { user_id: string; name: string | null; lang: string | null }[]
    const mine = rows.find((r) => r.user_id === auth.user?.id)
    if (!mine) return null
    return rows.every((r) => r.user_id === mine.user_id || (mine.name !== null && r.name === mine.name && r.lang === mine.lang))
  } catch {
    return null
  }
}

/** Liste für alle löschen, wenn man das einzige Mitglied ist; sonst (oder bei Fehlern) nur verlassen (D-036) */
async function deleteOnServer(id: string): Promise<boolean> {
  if (!supabase) return true
  if (!navigator.onLine) return false
  try {
    if (!(await ensureAuth())) return false
    const { data, error } = await supabase.rpc('delete_list', { p_list_id: id })
    if (!error && data === true) return true
    // Inzwischen nicht mehr allein, oder die Funktion fehlt noch (Schema nicht aktualisiert): wenigstens austreten
    await leaveList(id)
    return true
  } catch {
    /* später nochmals */
  }
  return false
}

// Löschen mit Gnadenfrist (D-036): Die Liste verschwindet sofort vom Gerät, gelöscht wird auf dem Server erst nach
// DELETE_GRACE_MS. Bis dahin ist „Rückgängig“ möglich. Wird die App vorher geschlossen, holt der nächste Start es nach.
export const DELETE_GRACE_MS = 8000
type PendingDelete = { id: string; name: string; at: number; cache: string | null; wasLast: boolean }

export function scheduleDelete(id: string, name: string) {
  const pending = LS.get<PendingDelete[]>('rl:pendingDelete', []).filter((p) => p.id !== id)
  pending.push({ id, name, at: Date.now(), cache: localStorage.getItem(`rl:list:${id}`), wasLast: LS.get<string | null>('rl:last', null) === id })
  LS.set('rl:pendingDelete', pending)
  forgetList(id)
}

/** Jüngste noch rückgängig machbare Löschung (für die Leiste auf der Startseite) */
export function recentDelete(): { id: string; name: string; leftMs: number } | null {
  const p = LS.get<PendingDelete[]>('rl:pendingDelete', []).at(-1)
  if (!p) return null
  const leftMs = p.at + DELETE_GRACE_MS - Date.now()
  return leftMs > 0 ? { id: p.id, name: p.name, leftMs } : null
}

export function undoDelete(id: string) {
  const pending = LS.get<PendingDelete[]>('rl:pendingDelete', [])
  const p = pending.find((x) => x.id === id)
  LS.set('rl:pendingDelete', pending.filter((x) => x.id !== id))
  if (!p) return
  if (p.cache) localStorage.setItem(`rl:list:${id}`, p.cache)
  rememberList(id)
  if (p.wasLast) LS.set('rl:last', id)
}

/** Fällige Löschungen auf dem Server ausführen (beim Start und nach Ablauf der Frist) */
export async function flushDeletes() {
  const due = LS.get<PendingDelete[]>('rl:pendingDelete', []).filter((p) => Date.now() - p.at >= DELETE_GRACE_MS)
  for (const p of due) {
    if (await deleteOnServer(p.id)) LS.set('rl:pendingDelete', LS.get<PendingDelete[]>('rl:pendingDelete', []).filter((x) => x.id !== p.id))
  }
}

export function forgetList(id: string) {
  if (LS.get<string | null>('rl:last', null) === id) localStorage.removeItem('rl:last')
  LS.set('rl:lists', LS.get<string[]>('rl:lists', []).filter((x) => x !== id))
  localStorage.removeItem(`rl:list:${id}`)
}

// ---------- Warteschlange für Änderungen (offline-fähig) ----------

type Op = { table: 'lists'; row: ShoppingList } | { table: 'items'; row: Item }

const queue = {
  all: () => LS.get<Op[]>('rl:queue', []),
  push(op: Op) {
    // Pro Zeile nur die neueste Version behalten
    const ops = this.all().filter((o) => !(o.table === op.table && o.row.id === op.row.id))
    ops.push(op)
    LS.set('rl:queue', ops)
  },
  remove(op: Op) {
    LS.set(
      'rl:queue',
      this.all().filter((o) => !(o.table === op.table && o.row.id === op.row.id && o.row.updatedAt === op.row.updatedAt)),
    )
  },
}

const toRemoteList = (l: ShoppingList) => ({
  id: l.id,
  name: l.name,
  country: l.country,
  updated_at: l.updatedAt,
  // Nur mitschicken, wenn gesetzt – so klappt der Sync auch, solange die Spalte in Supabase noch fehlt
  ...(l.autoClear !== undefined ? { auto_clear: l.autoClear } : {}),
})
const toRemoteItem = (i: Item) => ({
  id: i.id,
  list_id: i.listId,
  text: i.text,
  qty: i.qty,
  lang: i.lang,
  concept_id: i.conceptId,
  local_override: i.localOverride,
  checked: i.checked,
  deleted: i.deleted,
  author: i.author,
  created_at: i.createdAt,
  updated_at: i.updatedAt,
  // Nur mitschicken, wenn gesetzt – so funktioniert der Sync auch, solange die Spalte in Supabase noch fehlt
  ...(i.claimedBy !== undefined ? { claimed_by: i.claimedBy } : {}),
})
/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRemoteList = (r: any): ShoppingList => ({ id: r.id, name: r.name, country: r.country, autoClear: r.auto_clear ?? undefined, updatedAt: r.updated_at })
const fromRemoteItem = (r: any): Item => ({
  id: r.id,
  listId: r.list_id,
  text: r.text,
  qty: r.qty,
  lang: r.lang,
  conceptId: r.concept_id,
  localOverride: r.local_override,
  checked: r.checked,
  deleted: r.deleted,
  author: r.author ?? '',
  claimedBy: r.claimed_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

let flushing: Promise<boolean> | null = null
/** Schickt alle offenen Änderungen an Supabase. Liefert true, wenn die Warteschlange leer ist. */
export function flushQueue(): Promise<boolean> {
  if (!supabase) return Promise.resolve(true)
  flushing ??= (async () => {
    try {
      if (!(await ensureAuth())) return false
      for (const op of queue.all()) {
        const { error } =
          op.table === 'lists'
            ? await supabase.from('lists').upsert(toRemoteList(op.row))
            : await supabase.from('items').upsert(toRemoteItem(op.row))
        if (error) {
          setError(`Speichern (${op.table})`, error.message)
          // Dauerhafte Ablehnung (Grenze überschritten, S-038): verwerfen statt endlos wiederholen
          const permanent = error.code === '23514' || error.code === '22001' || (error.code === 'P0001' && error.message.startsWith('limit:'))
          if (!permanent) return false
        }
        queue.remove(op)
      }
      return true
    } catch (e) {
      setError('Speichern', String(e))
      return false
    } finally {
      flushing = null
    }
  })()
  return flushing
}

// ---------- Store für eine Liste ----------

const newer = (a: { updatedAt: string }, b: { updatedAt: string }) => a.updatedAt >= b.updatedAt
const now = () => new Date().toISOString()

export class ListStore {
  list: ShoppingList | null
  items: Item[]
  sync: SyncState
  notFound = false
  private listeners = new Set<() => void>()
  private channel: RealtimeChannel | null = null
  private onOnline = () => void this.pushAndPull()
  // Handys trennen die Echtzeit-Verbindung im Hintergrund: beim Zurückkehren sofort abgleichen,
  // und solange die Liste sichtbar ist, alle 20 Sekunden als Absicherung.
  private onVisible = () => {
    if (document.visibilityState === 'visible') void this.pushAndPull(true)
  }
  private poll: number | undefined

  readonly id: string

  constructor(id: string) {
    this.id = id
    const cached = LS.get<{ list: ShoppingList | null; items: Item[] }>(`rl:list:${id}`, { list: null, items: [] })
    this.list = cached.list
    this.items = cached.items
    this.sync = supabase ? (navigator.onLine ? 'syncing' : 'offline') : 'local-only'
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    LS.set(`rl:list:${this.id}`, { list: this.list, items: this.items })
    this.listeners.forEach((fn) => fn())
  }

  private setSync(s: SyncState) {
    this.sync = s
    this.listeners.forEach((fn) => fn())
  }

  private joined = false
  private profile: Profile | null = null

  /** Mitgliedschaft anlegen bzw. Name/Sprache aktualisieren. false, wenn die Liste online (noch) nicht existiert. */
  private async join(): Promise<boolean> {
    if (!supabase) return false
    const { data, error } = await supabase.rpc('join_list', {
      p_list_id: this.id,
      p_name: this.profile?.name ?? null,
      p_lang: this.profile?.lang ?? null,
    })
    if (error) {
      setError('Beitreten', error.message)
      return false
    }
    this.joined = data === true
    return this.joined
  }

  async start(profile?: Profile) {
    this.profile = profile ?? null
    if (this.list) rememberList(this.id)
    window.addEventListener('online', this.onOnline)
    document.addEventListener('visibilitychange', this.onVisible)
    if (supabase)
      this.poll = window.setInterval(() => {
        if (document.visibilityState === 'visible' && this.sync !== 'syncing') void this.pushAndPull(true)
      }, 20_000)
    if (!supabase) return
    if (!(await ensureAuth())) return this.setSync('error')
    // Beitreten (Mitgliedschaft mit Name) – nötig, wenn die Liste per Link geöffnet wurde
    await this.join()
    this.channel = supabase
      .channel(`list-${this.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${this.id}` }, (p) => {
        if (p.new && 'id' in p.new) this.applyItem(fromRemoteItem(p.new))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `id=eq.${this.id}` }, (p) => {
        if (p.new && 'id' in p.new) this.applyList(fromRemoteList(p.new))
      })
      .subscribe()
    await this.pushAndPull()
    // Neu erstellte Liste: erst nach dem Hochladen existiert sie online – dann Namen eintragen
    if (!this.joined && this.list) await this.join()
  }

  /** Mitglieder der Liste (Name, Sprache). Ohne Supabase: leer. */
  async members(): Promise<{ name: string | null; lang: Lang | null; me: boolean }[]> {
    if (!supabase) return []
    const [{ data }, { data: auth }] = await Promise.all([
      supabase.from('list_members').select('user_id, name, lang, joined_at').eq('list_id', this.id).order('joined_at'),
      supabase.auth.getUser(),
    ])
    // Dieselbe Person auf mehreren Geräten (gleicher Name und Sprache) nur einmal zeigen (D-029)
    const out: { name: string | null; lang: Lang | null; me: boolean }[] = []
    for (const m of (data ?? []) as { user_id: string; name: string | null; lang: Lang | null }[]) {
      const me = m.user_id === auth.user?.id
      const same = m.name ? out.find((o) => o.name === m.name && o.lang === m.lang) : undefined
      if (same) same.me ||= me
      else out.push({ name: m.name, lang: m.lang, me })
    }
    return out
  }

  stop() {
    window.removeEventListener('online', this.onOnline)
    document.removeEventListener('visibilitychange', this.onVisible)
    window.clearInterval(this.poll)
    if (this.channel && supabase) void supabase.removeChannel(this.channel)
  }

  /** silent: Anzeige nicht auf „Synchronisiere …“ setzen (Hintergrund-Abgleich) */
  async pushAndPull(silent = false) {
    if (!supabase) return
    if (!navigator.onLine) return this.setSync('offline')
    if (!silent) this.setSync('syncing')
    const pushed = await flushQueue()
    if (FEATURES.community) void import('../features/community').then((m) => m.flushSuggestions())
    const [listRes, itemsRes] = await Promise.all([
      supabase.from('lists').select('*').eq('id', this.id).maybeSingle(),
      supabase.from('items').select('*').eq('list_id', this.id),
    ])
    if (listRes.error || itemsRes.error) {
      setError('Laden', (listRes.error ?? itemsRes.error)!.message)
      return this.setSync(navigator.onLine ? 'error' : 'offline')
    }
    if (listRes.data) this.applyList(fromRemoteList(listRes.data), false)
    else if (!this.list) this.notFound = true
    for (const row of itemsRes.data ?? []) this.applyItem(fromRemoteItem(row), false)
    this.emit()
    if (pushed) lastSyncError = null
    this.setSync(pushed ? 'synced' : 'error')
  }

  private applyList(remote: ShoppingList, emit = true) {
    if (!this.list || newer(remote, this.list)) {
      this.list = remote
      this.notFound = false
      rememberList(this.id)
    }
    if (emit) this.emit()
  }

  private applyItem(remote: Item, emit = true) {
    const idx = this.items.findIndex((i) => i.id === remote.id)
    if (idx === -1) this.items = [...this.items, remote]
    else if (newer(remote, this.items[idx])) this.items = this.items.map((i, k) => (k === idx ? remote : i))
    if (emit) this.emit()
  }

  private async write(op: Op) {
    queue.push(op)
    this.emit()
    if (!supabase) return
    if (!navigator.onLine) return this.setSync('offline')
    this.setSync('syncing')
    const ok = await flushQueue()
    this.setSync(ok ? 'synced' : navigator.onLine ? 'error' : 'offline')
  }

  create(name: string, country: string) {
    this.list = { id: this.id, name: clip(name, MAX.listName), country, updatedAt: now() }
    rememberList(this.id)
    return this.write({ table: 'lists', row: this.list })
  }

  updateList(patch: Partial<Pick<ShoppingList, 'name' | 'country' | 'autoClear'>>) {
    if (!this.list) return
    if (patch.name !== undefined) patch = { ...patch, name: clip(patch.name, MAX.listName) }
    this.list = { ...this.list, ...patch, updatedAt: now() }
    return this.write({ table: 'lists', row: this.list })
  }

  addItem(data: Pick<Item, 'text' | 'qty' | 'lang' | 'conceptId' | 'author'>) {
    const t = now()
    // Community-Modul: Wurde der Begriff in dieser Liste schon korrigiert, gilt die Korrektur auch für den neuen Artikel
    const corrected =
      FEATURES.community && data.conceptId
        ? this.items.find((i) => !i.deleted && i.conceptId === data.conceptId && i.localOverride)?.localOverride
        : null
    const item: Item = {
      id: crypto.randomUUID(),
      listId: this.id,
      localOverride: corrected ?? null,
      checked: false,
      deleted: false,
      createdAt: t,
      updatedAt: t,
      ...data,
      text: clip(data.text, MAX.itemText),
      qty: clipOrNull(data.qty, MAX.qty),
      author: clip(data.author, MAX.personName),
    }
    this.items = [...this.items, item]
    return this.write({ table: 'items', row: item })
  }

  /** Alle abgehakten Artikel entfernen (D-030) */
  /** Abgehakte Artikel entfernen; olderThanMs: nur solche, die vor mindestens so langer Zeit abgehakt wurden (D-043) */
  async removeChecked(olderThanMs = 0): Promise<string[]> {
    const limit = new Date(Date.now() - olderThanMs).toISOString()
    const ids = this.items.filter((x) => x.checked && !x.deleted && (!olderThanMs || x.updatedAt <= limit)).map((x) => x.id)
    for (const id of ids) await this.updateItem(id, { deleted: true })
    return ids
  }

  /** Gelöschte Artikel wiederherstellen („Rückgängig“, D-042) */
  async restore(ids: string[]) {
    for (const id of ids) await this.updateItem(id, { deleted: false })
  }

  updateItem(id: string, patch: Partial<Pick<Item, 'checked' | 'deleted' | 'localOverride' | 'qty' | 'claimedBy'>>) {
    const current = this.items.find((i) => i.id === id)
    if (!current) return
    const updated = { ...current, ...patch, updatedAt: now() }
    this.items = this.items.map((i) => (i.id === id ? updated : i))
    return this.write({ table: 'items', row: updated })
  }
}
