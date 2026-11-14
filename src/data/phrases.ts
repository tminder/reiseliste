// Sätze für die Zeigen-Karte (D-032). Bewusst ohne eingesetzten Begriff,
// damit Fall und Artikel in keiner Sprache falsch werden. Entwurf, nicht von Muttersprachlern geprüft (S-001).
import type { Lang } from './dictionary'

export const WHERE_IS: Record<Lang, string> = {
  de: 'Entschuldigung, wo finde ich das?',
  en: 'Excuse me, where can I find this?',
  es: 'Perdone, ¿dónde puedo encontrar esto?',
  pt: 'Desculpe, onde posso encontrar isto?',
  fr: 'Excusez-moi, où puis-je trouver ceci ?',
  it: 'Scusi, dove posso trovare questo?',
  nl: 'Pardon, waar kan ik dit vinden?',
  hr: 'Oprostite, gdje mogu ovo naći?',
  el: 'Συγγνώμη, πού μπορώ να το βρω αυτό;',
  vi: 'Xin lỗi, tôi có thể tìm cái này ở đâu?',
  zh: '不好意思，請問這個在哪裡？',
}

export const THANKS: Record<Lang, string> = {
  de: 'Danke!',
  en: 'Thank you!',
  es: '¡Gracias!',
  pt: 'Obrigado!',
  fr: 'Merci !',
  it: 'Grazie!',
  nl: 'Dank u!',
  hr: 'Hvala!',
  el: 'Ευχαριστώ!',
  vi: 'Cảm ơn!',
  zh: '謝謝！',
}
