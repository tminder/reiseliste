// Countdown bis zu einem neuen Versuch (D-094): rechnet mit der Uhrzeit statt Sekunde für Sekunde herunterzuzählen.
// So stimmt er auch, wenn das Handy Zeitgeber im Hintergrund bremst oder die App kurz verlassen wird,
// und der neue Versuch startet zuverlässig, sobald die Zeit um ist (auch nach der Rückkehr in die App).
import { useEffect, useRef, useState } from 'react'

/** Verbleibende Sekunden bis `at` (null = kein Countdown). Ist die Zeit um, wird `onDue` genau einmal aufgerufen. */
export function useCountdown(at: number | null | undefined, onDue: () => void): number | null {
  const [now, setNow] = useState(() => Date.now())
  const due = useRef(onDue)
  useEffect(() => {
    due.current = onDue
  })
  const fired = useRef<number | null>(null)
  useEffect(() => {
    if (at == null) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      if (t >= at && fired.current !== at) {
        fired.current = at
        due.current()
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [at])
  return at == null ? null : Math.max(0, Math.ceil((at - now) / 1000))
}
