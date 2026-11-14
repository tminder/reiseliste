// Ist der Standort verfügbar (in der App zugestimmt und im Browser nicht gesperrt)? (D-066, D-067)
import { useCallback, useEffect, useState } from 'react'
import { getPosition, locationConsent, NearbyError, setLocationConsent } from '../lib/nearby'

export type LocationState = { available: boolean; denied: boolean; /** noch nicht gefragt (weder zugestimmt noch „Nicht jetzt“) */ unasked: boolean; allow: () => Promise<boolean>; refresh: () => void }

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
  /** Zustimmen und gleich die Rückfrage des Browsers auslösen. true, wenn der Standort danach verfügbar ist. */
  const allow = useCallback(async () => {
    setLocationConsent('yes')
    setConsent('yes')
    try {
      await getPosition()
      setDenied(false)
      return true
    } catch (e) {
      if (e instanceof NearbyError && e.permission) setDenied(true)
      return false
    }
  }, [])
  const refresh = useCallback(() => setConsent(locationConsent()), [])
  return { available: consent === 'yes' && !denied, denied, unasked: consent === null, allow, refresh }
}

