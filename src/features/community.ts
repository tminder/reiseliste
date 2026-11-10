/**
 * Community-Modul (D-024, im MVP ausgeschaltet: FEATURES.community, D-027).
 * Nutzer korrigieren Begriffe in der Landessprache oder tragen sie bei unbekannten Artikeln selbst ein.
 * Die Korrektur gilt sofort für alle Artikel mit demselben Wörterbuch-Eintrag in der Liste und wird
 * als Vorschlag in term_suggestions gesammelt (nur Insert, Prüfung durch den Inhaber).
 */
import { ensureAuth, setError, supabase, type Item, type ListStore } from '../lib/store'

export interface TermSuggestion {
  concept_id: string | null
  item_text: string
  item_lang: string
  target_lang: string
  country: string
  old_term: string | null
  new_term: string
  list_id: string
}

const KEY = 'rl:sugq'
const queue = {
  all: (): TermSuggestion[] => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]') as TermSuggestion[]
    } catch {
      return []
    }
  },
  set: (v: TermSuggestion[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      /* Speicher voll oder gesperrt */
    }
  },
}

/** Vorschlag merken und (wenn möglich) gleich an Supabase senden; sonst beim nächsten Abgleich */
export async function flushSuggestions(add?: TermSuggestion) {
  const pending = [...queue.all(), ...(add ? [add] : [])]
  queue.set(pending)
  if (!supabase || !pending.length || !navigator.onLine) return
  if (!(await ensureAuth())) return
  const { error } = await supabase.from('term_suggestions').insert(pending)
  if (error) setError('Korrekturvorschlag', error.message)
  else queue.set(queue.all().slice(pending.length))
}

/** Begriff in der Landessprache für die ganze Liste korrigieren und als Vorschlag sammeln */
export async function correctTerm(
  store: ListStore,
  item: Item,
  newTerm: string,
  ctx: { targetLang: string; country: string; oldTerm: string | null },
) {
  const term = newTerm.trim()
  if (!term || term === ctx.oldTerm) return
  const same = item.conceptId ? store.items.filter((i) => !i.deleted && i.conceptId === item.conceptId) : [item]
  for (const i of same) await store.updateItem(i.id, { localOverride: term })
  void flushSuggestions({
    concept_id: item.conceptId,
    item_text: item.text,
    item_lang: item.lang,
    target_lang: ctx.targetLang,
    country: ctx.country,
    old_term: ctx.oldTerm,
    new_term: term,
    list_id: store.id,
  })
}
