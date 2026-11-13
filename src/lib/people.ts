// Teilnehmer einer Liste für die Übersicht: andere Mitglieder, nach jüngster Aktivität geordnet
import type { Lang } from '../data/dictionary'

export interface MemberRow {
  user_id?: string
  name: string | null
  lang: Lang | null
  joined_at?: string | null
}
export interface ActivityRow {
  author?: string | null
  claimed_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/**
 * Namen der anderen Mitglieder, jüngste Aktivität zuerst. Aktivität = Beitritt, selbst hinzugefügte Artikel
 * (Zeitpunkt des Hinzufügens) und Artikel, die jemand holt (letzte Änderung). Dieselbe Person auf mehreren Geräten
 * (gleicher Name und Sprache) erscheint nur einmal (D-029). Ohne Mitgliederliste (offline, ohne Supabase):
 * die Autoren der Artikel.
 */
export function rankPeople(
  members: MemberRow[] | null,
  items: ActivityRow[],
  me: { name: string; lang: Lang; userId?: string | null },
): string[] {
  const last = new Map<string, string>() // Name → jüngste Aktivität
  const bump = (name: string | null | undefined, at: string | null | undefined) => {
    if (!name) return
    const prev = last.get(name) ?? ''
    last.set(name, (at ?? '') > prev ? (at as string) : prev)
  }
  for (const i of items) {
    bump(i.author, i.created_at)
    bump(i.claimed_by, i.updated_at)
  }
  const isMe = (m: MemberRow) => (!!me.userId && m.user_id === me.userId) || (m.name === me.name && m.lang === me.lang)
  let names: string[]
  if (members) {
    // Eigene Geräte und Namensgleiche mit eigener Sprache ausblenden, Doppelte zusammenfassen
    const mine = new Set(members.filter(isMe).map((m) => `${m.name}|${m.lang}`))
    const seen = new Set<string>()
    names = []
    for (const m of members) {
      if (!m.name || isMe(m) || mine.has(`${m.name}|${m.lang}`)) continue
      bump(m.name, m.joined_at)
      if (seen.has(m.name)) continue
      seen.add(m.name)
      names.push(m.name)
    }
  } else {
    names = [...last.keys()].filter((n) => n !== me.name)
  }
  return names.sort((a, b) => (last.get(b) ?? '').localeCompare(last.get(a) ?? '') || a.localeCompare(b))
}
