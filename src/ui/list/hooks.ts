// Abläufe der Listenansicht als eigene Hooks (S-044): je ein Ablauf, damit ListView.tsx überschaubar bleibt.
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { t } from '../../i18n'
import { COUNTRY_BY_CODE } from '../../data/countries'
import { detectCountry } from '../../lib/country'
import { getPosition, meters, type Shop } from '../../lib/nearby'
import type { ListStore, ShoppingList } from '../../lib/store'
import { DAY_MS, VISIT_ACCURACY_M, VISIT_RADIUS_M, countryChangeDeclined, readVisit, saveVisit } from './helpers'

type ShowUndo = MutableRefObject<(ids: string[], text: string) => void>

/** Angefangene Eingabe übersteht ein Neuladen (neue Version, D-016): im Tab gespeichert, nur bis zum Schliessen */
export function useDraft(listId: string): [string, (v: string) => void] {
  const key = `rl:draft:${listId}`
  const [input, setInput] = useState(() => {
    try {
      return sessionStorage.getItem(key) ?? ''
    } catch {
      return ''
    }
  })
  useEffect(() => {
    try {
      if (input) sessionStorage.setItem(key, input)
      else sessionStorage.removeItem(key)
    } catch {
      /* egal */
    }
  }, [key, input])
  return [input, setInput]
}

/** Erledigte nach 1 Tag entfernen (D-043): beim Öffnen und alle 5 Minuten, solange die Liste offen ist */
export function useAutoClearDay(store: ListStore, autoClear: boolean, showUndo: ShowUndo) {
  useEffect(() => {
    if (!autoClear) return
    const run = () => void store.removeChecked(DAY_MS).then((ids) => ids.length && showUndo.current(ids, t('autoClearedDay', { n: ids.length })))
    run()
    const iv = window.setInterval(run, 5 * 60 * 1000)
    return () => window.clearInterval(iv)
  }, [autoClear, store, showUndo])
}

/**
 * Laden verlassen (D-043): Hat der Einkauf begonnen (D-055) und steht man wirklich beim Laden (höchstens 100 m, GPS genau
 * genug), merkt sich die App den Besuch. Ist man später (beim Zurückkehren in die App oder alle 2 Minuten) weiter als
 * 150 m weg, werden Erledigte entfernt. Ein bloss vorgeschlagener Laden in der Nähe zählt nicht als Besuch.
 */
export function useShopVisit(listId: string, store: ListStore, autoClear: boolean, visitShop: Shop | null, showUndo: ShowUndo) {
  const visitShopRef = useRef(visitShop)
  useEffect(() => {
    visitShopRef.current = visitShop
  })
  useEffect(() => {
    if (!autoClear) return
    let busy = false
    const check = async () => {
      const visit = readVisit(listId)
      const vs = visitShopRef.current
      const candidate = !visit && vs?.lat != null && vs.lon != null ? vs : null
      if ((!visit && !candidate) || busy || document.visibilityState !== 'visible') return
      busy = true
      try {
        const { latitude, longitude, accuracy } = (await getPosition(10_000)).coords
        if (candidate) {
          if (accuracy <= VISIT_ACCURACY_M && meters(latitude, longitude, candidate.lat!, candidate.lon!) <= VISIT_RADIUS_M)
            saveVisit(listId, { lat: candidate.lat!, lon: candidate.lon!, at: Date.now() })
        } else if (visit && meters(latitude, longitude, visit.lat, visit.lon) > Math.max(150, accuracy)) {
          saveVisit(listId, null)
          const ids = await store.removeChecked()
          if (ids.length) showUndo.current(ids, t('autoClearedShop', { n: ids.length }))
        }
      } catch {
        /* ohne Standort: später nochmals, spätestens greift die 1-Tages-Regel */
      } finally {
        busy = false
      }
    }
    const iv = window.setInterval(() => void check(), 2 * 60 * 1000)
    const onVisible = () => void check()
    document.addEventListener('visibilitychange', onVisible)
    void check()
    return () => {
      window.clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [autoClear, listId, store, showUndo, visitShop?.id, visitShop?.lat, visitShop?.lon])
}

/** Seitentitel = Listenname (D-076): Tabs, Lesezeichen, Verlauf und Vorschauen, die die Seite ausführen */
export function useDocumentTitle(name: string | undefined) {
  useEffect(() => {
    if (!name) return
    document.title = `${name} · ${t('appName')}`
    return () => {
      document.title = t('appName')
    }
  }, [name])
}

/**
 * Reiseland automatisch anpassen (D-040), nur bei „Automatisch“ (D-057): Ist man in einem anderen unterstützten Land,
 * wechselt die Liste dorthin, auch zurück nach Hause (D-041), ausser der Wechsel in dieses Land wurde abgelehnt.
 * Geprüft beim Öffnen, beim Wechsel auf „Automatisch“ und beim ersten Abhaken (dann mit höchstens 5 Minuten altem Ergebnis, D-069).
 */
export function useAutoCountry(listId: string, store: ListStore, list: ShoppingList | null | undefined, firstChecked: boolean) {
  const moved = useState<{ from: string; to: string } | null>(null)
  const setMoved = moved[1]
  const listCountry = list?.country
  const autoCountry = list ? list.autoCountry !== false : false
  useEffect(() => {
    if (!listCountry || !autoCountry) return
    let alive = true
    void detectCountry((firstChecked ? 5 : 30) * 60 * 1000).then((code) => {
      if (!alive || !code || code === listCountry || !COUNTRY_BY_CODE.has(code)) return
      if (countryChangeDeclined(listId, code)) return
      void store.updateList({ country: code })
      setMoved({ from: listCountry, to: code })
    })
    return () => {
      alive = false
    }
    // Nur beim Öffnen der Liste bzw. wenn sie geladen ist, auf „Automatisch“ gestellt wird oder beim ersten Abhaken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, !!listCountry, autoCountry, firstChecked])
  return moved
}
