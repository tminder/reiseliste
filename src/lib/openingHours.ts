// Öffnungszeiten aus OpenStreetMap (D-099), Tag `opening_hours`, z. B. „Mo-Fr 08:00-12:30,14:00-18:30; Sa 08:00-17:00; Su off“.
// Bewusst nur der häufige Teil des Formats: Wochentage, Zeiten (auch über Mitternacht), „off“, „24/7“.
// Feiertage (PH) werden übergangen; Monate, Kalenderwochen, Daten u. Ä. → unbekannt (null), dann zeigt die App nichts.

/** Minuten-Bereiche pro Wochentag (0 = Montag … 6 = Sonntag); Ende kann über 1440 gehen (über Mitternacht) */
export type Week = [number, number][][]

const DAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']

function parseDays(spec: string): number[] | null {
  const out = new Set<number>()
  for (const part of spec.split(',')) {
    const p = part.trim().toLowerCase()
    if (p === 'ph') continue // Feiertage: nicht berücksichtigt
    const m = /^([a-z]{2})(?:-([a-z]{2}))?$/.exec(p)
    if (!m) return null
    const a = DAYS.indexOf(m[1])
    const b = m[2] ? DAYS.indexOf(m[2]) : a
    if (a < 0 || b < 0) return null
    for (let d = a; ; d = (d + 1) % 7) {
      out.add(d)
      if (d === b) break
    }
  }
  return [...out]
}

const minutes = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h <= 24 && min < 60 ? h * 60 + min : null
}

function parseTimes(spec: string): [number, number][] | null {
  const out: [number, number][] = []
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-')
    const from = minutes(a ?? '')
    let to = minutes(b ?? '')
    if (from == null || to == null) return null
    if (to <= from) to += 1440 // über Mitternacht
    out.push([from, to])
  }
  return out
}

/** Format lesen; null, wenn leer oder nicht sicher verstanden */
export function parseOpeningHours(raw: string | undefined | null): Week | null {
  if (!raw) return null
  const text = raw.trim()
  if (text === '24/7') return Array.from({ length: 7 }, () => [[0, 1440]])
  const week: Week = Array.from({ length: 7 }, () => [])
  let any = false
  for (const rule of text.split(';')) {
    const r = rule.trim()
    if (!r) continue
    const m = /^([A-Za-z,\- ]+?)\s+(.+)$/.exec(r)
    // Nur Zeiten ohne Tage („08:00-20:00“): gilt für alle Tage
    const daysSpec = m && !/^\d/.test(r) ? m[1].replace(/\s/g, '') : 'Mo-Su'
    const timeSpec = (m && !/^\d/.test(r) ? m[2] : r).trim().toLowerCase()
    if (/^ph$/i.test(daysSpec)) continue // nur Feiertagsregel
    const days = parseDays(daysSpec)
    if (!days) return null
    const times = timeSpec === 'off' || timeSpec === 'closed' ? [] : parseTimes(timeSpec)
    if (!times) return null
    for (const d of days) week[d] = times // spätere Regel ersetzt frühere für diese Tage
    any = true
  }
  return any ? week : null
}

export type OpenState = { open: true; until: Date | null } | { open: false; next: Date | null }

/** Offen jetzt? Mit Ende (null = durchgehend) bzw. nächster Öffnung (null = keine in den nächsten 7 Tagen) */
export function openState(week: Week, now = new Date()): OpenState {
  const dow = (now.getDay() + 6) % 7 // Montag = 0
  const mins = now.getHours() * 60 + now.getMinutes()
  const at = (dayOffset: number, m: number) => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + dayOffset)
    d.setMinutes(m)
    return d
  }
  // Heute oder von gestern über Mitternacht offen?
  const candidates: [number, number, number][] = [
    ...week[dow].map(([a, b]) => [0, a, b] as [number, number, number]),
    ...week[(dow + 6) % 7].map(([a, b]) => [-1, a - 1440, b - 1440] as [number, number, number]),
  ]
  for (const [, a, b] of candidates) {
    if (mins >= a && mins < b) {
      if (b - a >= 1440) return { open: true, until: null }
      return { open: true, until: at(0, b) }
    }
  }
  for (let off = 0; off < 8; off++) {
    const ranges = week[(dow + off) % 7].map(([a]) => a).sort((x, y) => x - y)
    const next = ranges.find((a) => off > 0 || a > mins)
    if (next != null) return { open: false, next: at(off, next) }
  }
  return { open: false, next: null }
}

/** Kurztext für die Anzeige: { short: „bis 21:00“ / „geschlossen“, long: „offen bis 21:00“ / „geschlossen · öffnet Mo 08:00“, open } */
export function describeHours(
  raw: string | undefined,
  t: (key: 'hoursUntil' | 'hoursOpenUntil' | 'hoursOpen24' | 'hoursClosed' | 'hoursOpensAt' | 'hoursOpensOn' | 'hoursClosesAt', v?: Record<string, string>) => string,
  locale: string,
  now = new Date(),
): { open: boolean; short: string; long: string; closesSoon?: string } | null {
  const week = parseOpeningHours(raw)
  if (!week) return null
  const s = openState(week, now)
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (s.open)
    return s.until
      ? {
          open: true,
          short: t('hoursUntil', { time: time(s.until) }),
          long: t('hoursOpenUntil', { time: time(s.until) }),
          // Schliesst in höchstens einer Stunde (D-099): „schliesst 18:30“
          ...(s.until.getTime() - now.getTime() <= 60 * 60 * 1000 ? { closesSoon: t('hoursClosesAt', { time: time(s.until) }) } : {}),
        }
      : { open: true, short: '', long: t('hoursOpen24') }
  if (!s.next) return { open: false, short: t('hoursClosed'), long: t('hoursClosed') }
  const sameDay = s.next.toDateString() === now.toDateString()
  const day = s.next.toLocaleDateString(locale, { weekday: 'short' })
  const opens = sameDay ? t('hoursOpensAt', { time: time(s.next) }) : t('hoursOpensOn', { day, time: time(s.next) })
  return { open: false, short: t('hoursClosed'), long: `${t('hoursClosed')} · ${opens}` }
}
