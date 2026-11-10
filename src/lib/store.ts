import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { Lang } from '../data/dictionary'
import { FEATURES } from '../features'

// ---------- Typen ----------

export interface ShoppingList {
  id: string
  name: string
  country: string
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
  checked: boolean
  deleted: boolean
  author: string
  createdAt: string
  updatedAt: string
}

export interface Profile {
  name: string
  lang: Lang
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

export function forgetList(id: string) {
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

const toRemoteList = (l: ShoppingList) => ({ id: l.id, name: l.name, country: l.country, updated_at: l.updatedAt })
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
})
/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRemoteList = (r: any): ShoppingList => ({ id: r.id, name: r.name, country: r.country, updatedAt: r.updated_at })
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
          return false
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
    return (data ?? []).map((m: { user_id: string; name: string | null; lang: Lang | null }) => ({
      name: m.name,
      lang: m.lang,
      me: m.user_id === auth.user?.id,
    }))
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
    this.list = { id: this.id, name, country, updatedAt: now() }
    rememberList(this.id)
    return this.write({ table: 'lists', row: this.list })
  }

  updateList(patch: Partial<Pick<ShoppingList, 'name' | 'country'>>) {
    if (!this.list) return
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
    }
    this.items = [...this.items, item]
    return this.write({ table: 'items', row: item })
  }

  updateItem(id: string, patch: Partial<Pick<Item, 'checked' | 'deleted' | 'localOverride' | 'qty'>>) {
    const current = this.items.find((i) => i.id === id)
    if (!current) return
    const updated = { ...current, ...patch, updatedAt: now() }
    this.items = this.items.map((i) => (i.id === id ? updated : i))
    return this.write({ table: 'items', row: updated })
  }
}
