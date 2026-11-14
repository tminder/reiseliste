// Ist der Standort verfügbar (in der App zugestimmt und im Browser nicht gesperrt)? (D-066)
import { useCallback, useEffect, useState } from 'react'
import { getPosition, locationConsent, NearbyError, setLocationConsent } from '../lib/nearby'

/** granted: Standort da · denied: abgelehnt bzw. im Browser gesperrt · failed: erlaubt, aber keine Ortung (Gebäude, Zeitüberschreitung) */
export type AllowResult = 'granted' | 'denied' | 'failed'
export type LocationState = { available: boolean; denied: boolean; allow: () => Promise<AllowResult>; refresh: () => void }

export function useLocation(): LocationState {
  const [consent, setConsent] = useState(locationConsent)
  const [denied, setDenied] = useState(false)
  useEffect(() => {
    let status: PermissionStatus | null = null
    const read = () => setDenied(status?.state === 'denied')
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((s) => {
        status = s
        read()
        s.addEventListener('change', read)
      })
      .catch(() => undefined)
    return () => status?.removeEventListener('change', read)
  }, [])
  /** Zustimmen und gleich die Rückfrage des Browsers auslösen */
  const allow = useCallback(async (): Promise<AllowResult> => {
    setLocationConsent('yes')
    setConsent('yes')
    try {
      await getPosition()
      setDenied(false)
      return 'granted'
    } catch (e) {
      if (e instanceof NearbyError && e.permission) {
        setDenied(true)
        return 'denied'
      }
      return 'failed'
    }
  }, [])
  const refresh = useCallback(() => setConsent(locationConsent()), [])
  return { available: consent === 'yes' && !denied, denied, allow, refresh }
}

