// Einmaliger Hinweis im Ablauf (D-068): wo die Übersetzung steht. Den Teilen-Hinweis gibt es nicht mehr (D-068).
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

export function ListHints({ items, translated }: { items: Item[]; translated: boolean }) {
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
  return null
}
