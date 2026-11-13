// Rückmeldungen zum Wörterbuch (D-059): Eingaben ohne Übersetzung und „Begriff stimmt nicht“.
// Gehen direkt an Supabase (nur eintragen, nicht lesbar), ohne Listen- oder Artikel-Kennungen.
// Ausgewertet wird von Hand: Export-Workflow → docs/woerterbuch-feedback.csv → Claude (docs/woerterbuch-feedback.md).
import type { Lang } from '../data/dictionary'
import { clip, clipOrNull } from './limits'
import { ensureAuth, supabase } from './store'
import { normalize } from './translate'

export interface Feedback {
  kind: 'miss' | 'wrong'
  itemText: string
  itemLang: Lang
  conceptId?: string | null
  country: string
  targetLang: Lang
  term?: string | null
  suggestion?: string | null
}

/** Gleiche Rückmeldung pro Gerät nur einmal (sonst zählt ein fleissiger Nutzer mehrfach) */
const SENT_KEY = 'rl:feedbackSent'
function sentKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}
function markSent(key: string) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...sentKeys(), key].slice(-500)))
  } catch {
    /* ohne Speicher: egal */
  }
}

/** Rückmeldung senden. true = gesendet oder schon früher gesendet, false = nicht möglich (offline, ohne Supabase) */
export async function sendFeedback(f: Feedback): Promise<boolean> {
  if (!supabase || !navigator.onLine) return false
  const text = clip(f.itemText.trim(), 200)
  if (!text) return false
  const key = [f.kind, f.itemLang, normalize(text), f.conceptId ?? '', f.targetLang, normalize(f.suggestion ?? '')].join('|')
  if (sentKeys().includes(key)) return true
  try {
    if (!(await ensureAuth())) return false
    const { error } = await supabase.from('dictionary_feedback').insert({
      kind: f.kind,
      item_text: text,
      item_lang: f.itemLang,
      concept_id: f.conceptId ?? null,
      country: f.country,
      target_lang: f.targetLang,
      term: clipOrNull(f.term ?? null, 80),
      suggestion: clipOrNull(f.suggestion?.trim() || null, 80),
    })
    if (error) return false
    markSent(key)
    return true
  } catch {
    return false
  }
}
