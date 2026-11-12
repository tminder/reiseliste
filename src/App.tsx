import { lazy, Suspense, useEffect, useState } from 'react'
import { setUiLang } from './i18n'
import { flushDeletes, lastList, profileStore, type Profile } from './lib/store'
import { Home } from './ui/Home'
import { ProfileSetup } from './ui/ProfileSetup'
import { guessLang } from './ui/format'
import { ListView } from './ui/list/ListView'

// ---------- Routing über den Hash (funktioniert auf GitHub Pages ohne Server) ----------

// Beim Öffnen der App ohne Ziel (Startseite) direkt zur zuletzt geöffneten Liste (D-028).
// Nur einmal beim Laden – „Alle Listen“ führt danach normal zur Übersicht.
if (location.hash === '' || location.hash === '#/' || location.hash === '#') {
  const last = lastList()
  if (last) history.replaceState(null, '', `#/l/${last}`)
}

function useRoute() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  if (hash.startsWith('#/datenschutz')) return { page: 'privacy' as const }
  const m = hash.match(/^#\/l\/([0-9a-f-]{36})/i)
  return m ? { page: 'list' as const, id: m[1] } : { page: 'home' as const }
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(profileStore.get())
  const [editingProfile, setEditingProfile] = useState(false)
  const route = useRoute()
  // Liegengebliebene Löschungen nachholen (App während der Gnadenfrist geschlossen, D-036)
  useEffect(() => void flushDeletes(), [])
  // Sprache der Oberfläche = Sprache aus dem Profil (vor der Einrichtung: Browsersprache)
  setUiLang(profile?.lang ?? guessLang())

  if (route.page === 'privacy')
    return (
      <Suspense fallback={null}>
        <Privacy />
      </Suspense>
    )
  if (!profile || editingProfile)
    return (
      <ProfileSetup
        listId={route.page === 'list' && 'id' in route ? route.id : undefined}
        onDone={(p) => {
          profileStore.set(p)
          setProfile(p)
          setEditingProfile(false)
        }}
        onCancel={profile ? () => setEditingProfile(false) : undefined}
      />
    )
  return route.page === 'list' && 'id' in route ? (
    <ListView key={route.id} id={route.id} profile={profile} onEditProfile={() => setEditingProfile(true)} />
  ) : (
    <Home profile={profile} onEditProfile={() => setEditingProfile(true)} />
  )
}

const Privacy = lazy(() => import('./Privacy'))
