// Merkmale wie „gefroren“, „bio“, „laktosefrei“ (D-098).
// Das Wörterbuch kennt „Himbeeren“, aber nicht jede Kombination. Steht ein Merkmal im eingegebenen Text,
// zeigt die App es zusätzlich in der Landessprache – in der Grundform, ohne Anspruch auf korrekte Beugung
// („frambuesas“ + „congelado“). Für häufige Kombinationen gibt es eigene Begriffe (TK-Beeren, TK-Spinat …).
import type { Lang } from '../data/dictionary'
import { CONCEPT_BY_ID } from '../data/dictionary'
import { normalize } from './translate'

type Attribute = {
  id: string
  icon?: string
  /** Wortanfänge, an denen das Merkmal im eingegebenen Text erkannt wird (wie von normalize() geschrieben) */
  words: Partial<Record<Lang, string[]>>
  /** Anzeige in der Landessprache */
  label: Record<Lang, string>
  /** Artikel, die das Merkmal schon enthalten (dann kein Zusatz) */
  skip: (conceptId: string) => boolean
}

const ATTRIBUTES: Attribute[] = [
  {
    id: 'frozen',
    icon: '❄️',
    words: {
      // mit häufigen Tippfehlern (gefrohren, teifgekühlt)
      de: ['gefroren', 'gefrohren', 'tiefgekuhlt', 'teifgekuhlt', 'tiefgefroren', 'tiefgefrohren', 'tiefkuhl', 'tk'],
      en: ['frozen'],
      es: ['congelad'],
      pt: ['congelad'],
      fr: ['surgel', 'congel'],
      it: ['surgelat', 'congelat'],
      nl: ['diepvries', 'bevroren'],
      hr: ['smrznut', 'zamrznut'],
      el: ['κατεψυγμεν'],
      vi: ['đông lạnh'],
      zh: ['冷凍'],
    },
    label: { de: 'tiefgekühlt', en: 'frozen', es: 'congelado', pt: 'congelado', fr: 'surgelé', it: 'surgelato', nl: 'diepvries', hr: 'smrznuto', el: 'κατεψυγμένο', vi: 'đông lạnh', zh: '冷凍' },
    skip: (id) => CONCEPT_BY_ID.get(id)?.category === 'tk',
  },
  {
    id: 'organic',
    words: { de: ['bio'], en: ['organic'], es: ['ecologic', 'bio'], pt: ['biologic', 'bio'], fr: ['bio'], it: ['biologic', 'bio'], nl: ['biologisch', 'bio'], hr: ['organsk', 'bio'], el: ['βιολογικ'], vi: ['hữu cơ'], zh: ['有機'] },
    label: { de: 'Bio', en: 'organic', es: 'ecológico', pt: 'biológico', fr: 'bio', it: 'biologico', nl: 'biologisch', hr: 'organski', el: 'βιολογικό', vi: 'hữu cơ', zh: '有機' },
    skip: () => false,
  },
  {
    id: 'lactosefree',
    words: { de: ['laktosefrei'], en: ['lactose free', 'lactose-free'], es: ['sin lactosa'], pt: ['sem lactose'], fr: ['sans lactose'], it: ['senza lattosio'], nl: ['lactosevrij'], hr: ['bez laktoze'], el: ['χωρις λακτοζη'], vi: ['không lactose'], zh: ['無乳糖'] },
    label: { de: 'laktosefrei', en: 'lactose-free', es: 'sin lactosa', pt: 'sem lactose', fr: 'sans lactose', it: 'senza lattosio', nl: 'lactosevrij', hr: 'bez laktoze', el: 'χωρίς λακτόζη', vi: 'không lactose', zh: '無乳糖' },
    skip: (id) => id === 'laktosefrei',
  },
  {
    id: 'glutenfree',
    words: { de: ['glutenfrei'], en: ['gluten free', 'gluten-free'], es: ['sin gluten'], pt: ['sem gluten'], fr: ['sans gluten'], it: ['senza glutine'], nl: ['glutenvrij'], hr: ['bez glutena'], el: ['χωρις γλουτενη'], vi: ['không gluten'], zh: ['無麩質'] },
    label: { de: 'glutenfrei', en: 'gluten-free', es: 'sin gluten', pt: 'sem glúten', fr: 'sans gluten', it: 'senza glutine', nl: 'glutenvrij', hr: 'bez glutena', el: 'χωρίς γλουτένη', vi: 'không gluten', zh: '無麩質' },
    skip: () => false,
  },
  {
    id: 'vegan',
    words: { de: ['vegan'], en: ['vegan'], es: ['vegan'], pt: ['vegan'], fr: ['vegan', 'vegetalien'], it: ['vegan'], nl: ['vegan', 'veganistisch'], hr: ['vegan'], el: ['vegan'], vi: ['thuần chay'], zh: ['純素', '全素'] },
    label: { de: 'vegan', en: 'vegan', es: 'vegano', pt: 'vegano', fr: 'végétalien', it: 'vegano', nl: 'veganistisch', hr: 'veganski', el: 'vegan', vi: 'thuần chay', zh: '純素' },
    skip: () => false,
  },
]

export type ShownAttribute = { id: string; text: string }

/** Merkmale im eingegebenen Text, als Zusatz in der Landessprache. Leer, wenn der Artikel sie schon enthält. */
export function attributesFor(text: string, lang: Lang, conceptId: string | null, target: Lang): ShownAttribute[] {
  if (!conceptId) return []
  const n = normalize(text, lang)
  const padded = ` ${n.replace(/-/g, ' ')} `
  const out: ShownAttribute[] = []
  for (const a of ATTRIBUTES) {
    if (a.skip(conceptId)) continue
    const words = (a.words[lang] ?? []).map((w) => normalize(w, lang).replace(/-/g, ' '))
    // Chinesisch ohne Leerzeichen: enthalten genügt; sonst am Wortanfang („tiefgekühlte“, „TK-Spinat“)
    const hit = words.some((w) => (lang === 'zh' ? n.includes(w) : padded.includes(` ${w}`)))
    if (hit) out.push({ id: a.id, text: `${a.icon ? a.icon + ' ' : ''}${a.label[target]}` })
  }
  return out
}
