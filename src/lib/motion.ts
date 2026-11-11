// Weiche Übergänge bei Statuswechseln (D-044): Zeilen gleiten an ihren neuen Platz (FLIP),
// neue oder von anderen geänderte Zeilen leuchten kurz auf, gelöschte gleiten hinaus.
// Bei „Bewegung reduzieren“ im System gibt es nur Farbwechsel.
import { useLayoutEffect, useRef } from 'react'

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Kurzes Aufleuchten einer Zeile. Bei „Bewegung reduzieren“ ohne Animation: Die Zeile wird
 * kurz eingefärbt und blendet dann über einen einfachen Farbübergang zurück.
 */
export function flash(el: Element) {
  const cls = reducedMotion() ? 'flash-static' : 'flash'
  el.classList.remove('flash', 'flash-static')
  void (el as HTMLElement).offsetWidth // Animation neu starten
  el.classList.add(cls)
  window.setTimeout(() => el.classList.remove(cls), cls === 'flash' ? 1700 : 1400)
}

/** Zeile sichtbar machen, falls sie ausserhalb des Bildschirms liegt */
export function reveal(el: Element) {
  const r = el.getBoundingClientRect()
  if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
}

/** Zeile(n) hinausgleiten lassen, danach erst entfernen */
export async function slideOut(els: Element[]) {
  if (reducedMotion() || !els.length || !('animate' in Element.prototype)) return
  await Promise.all(
    els.map(
      (el) =>
        (el as HTMLElement).animate(
          [
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0, transform: 'translateX(-48px)' },
          ],
          { duration: 200, easing: 'ease-in', fill: 'forwards' },
        ).finished,
    ),
  ).catch(() => {})
}

type Snapshot = { top: number; stamp: string }

/**
 * Beobachtet alle Elemente mit data-item-id im Container. Nach jedem Rendern:
 * – verschobene Zeilen gleiten von der alten an die neue Position,
 * – neue Zeilen gleiten ein und leuchten auf (onNew bekommt die IDs, z. B. zum Hinscrollen),
 * – Zeilen mit geändertem data-stamp, die nicht lokal geändert wurden (isLocal), leuchten auf.
 */
export function useFlip(
  container: React.RefObject<HTMLElement | null>,
  isLocal: (id: string) => boolean,
  onNew?: (els: HTMLElement[]) => void,
) {
  const prev = useRef<Map<string, Snapshot> | null>(null)
  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    // Zeilen und Abteilungs-Überschriften (data-flip) gleiten mit, nur Zeilen leuchten auf
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-item-id], [data-flip]'))
    const keyOf = (el: HTMLElement) => el.dataset.itemId ?? `flip:${el.dataset.flip}`
    const next = new Map<string, Snapshot>()
    for (const el of els) next.set(keyOf(el), { top: el.getBoundingClientRect().top + window.scrollY, stamp: el.dataset.stamp ?? '' })
    const before = prev.current
    prev.current = next
    if (!before) return // erstes Rendern: nichts animieren
    const motion = !reducedMotion() && 'animate' in Element.prototype
    const added: HTMLElement[] = []
    for (const el of els) {
      const id = keyOf(el)
      const isItem = !!el.dataset.itemId
      const now = next.get(id)!
      const old = before.get(id)
      if (!old && !isItem) continue
      if (!old) {
        added.push(el)
        flash(el)
        if (motion)
          el.animate(
            [
              { opacity: 0, transform: 'translateY(-14px) scale(0.97)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' },
          )
        continue
      }
      const dy = old.top - now.top
      if (motion && Math.abs(dy) > 2)
        el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' })
      if (isItem && old.stamp !== now.stamp && !isLocal(id)) flash(el)
    }
    if (added.length && onNew) onNew(added)
  })
}
