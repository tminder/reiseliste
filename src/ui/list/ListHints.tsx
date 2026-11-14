// Einmalige Hinweise im Ablauf (D-068): erklären den nächsten Schritt erst, wenn er ansteht. Immer nur einer auf einmal.
import { useState } from 'react'
import { t } from '../../i18n'
import type { Item } from '../../lib/store'

const seen = (key: string) => {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return true
  }
}
const markSeen = (key: string) => {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* egal */
  }
}

export function ListHints({ items, translated, alone, onShare }: { items: Item[]; translated: boolean; alone: boolean; onShare: () => void }) {
  const [, setTick] = useState(0)
  const done = (key: string) => {
    markSeen(key)
    setTick((n) => n + 1)
  }
  const open = items.filter((i) => !i.deleted)
  // 1. Erster übersetzter Artikel: wo die Übersetzung steht und wozu
  if (translated && open.some((i) => i.conceptId) && !seen('rl:hintTranslation'))
    return (
      <div className="note info ios-hint">
        <p>{t('hintTranslation')}</p>
        <div className="row-gap">
          <button className="primary small" onClick={() => done('rl:hintTranslation')}>
            {t('gotIt')}
          </button>
        </div>
      </div>
    )
  // 2. Ab drei Artikeln in einer Liste, die man allein hat: Teilen anbieten
  if (alone && open.length >= 3 && !seen('rl:hintShare'))
    return (
      <div className="note info ios-hint">
        <p>{t('hintShare')}</p>
        <div className="row-gap">
          <button
            className="primary small"
            onClick={() => {
              done('rl:hintShare')
              onShare()
            }}
          >
            {t('share')}
          </button>
          <button className="ghost small" onClick={() => done('rl:hintShare')}>
            {t('notNow')}
          </button>
        </div>
      </div>
    )
  return null
}
