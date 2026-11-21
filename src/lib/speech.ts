// Begriff vorlesen (D-092): Sprachausgabe des Browsers (Web Speech API), ohne externen Dienst und ohne Kosten.
// Nur anbieten, wenn das Gerät eine Stimme für die Landessprache hat; sonst würde z. B. eine deutsche Stimme Spanisch lesen.
import { useEffect, useState } from 'react'
import type { Lang } from '../data/dictionary'

/** Sprachkennung für das Reiseland: „es-ES“, „es-MX“, „de-CH“, „nl-BE“, „zh-TW“ */
export function speechTag(country: string, lang: Lang): string {
  return `${lang}-${country.split('-')[0].toUpperCase()}`
}

function pickVoice(tag: string): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  const norm = (l: string) => l.replace('_', '-').toLowerCase()
  const lang = tag.split('-')[0].toLowerCase()
  return (
    voices.find((v) => norm(v.lang) === tag.toLowerCase()) ??
    // Chinesisch: Taiwan vor Festland, beides Mandarin
    (lang === 'zh' ? voices.find((v) => /^zh[-_](tw|hant)/i.test(v.lang)) : undefined) ??
    voices.find((v) => norm(v.lang).split('-')[0] === lang) ??
    null
  )
}

/** Passende Stimme oder null. Die Stimmen laden manche Browser erst nach einem Moment („voiceschanged“). */
export function useVoice(tag: string): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => pickVoice(tag))
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const update = () => setVoice(pickVoice(tag))
    update()
    speechSynthesis.addEventListener('voiceschanged', update)
    return () => speechSynthesis.removeEventListener('voiceschanged', update)
  }, [tag])
  return voice
}

export function speak(text: string, voice: SpeechSynthesisVoice) {
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = 0.85 // etwas langsamer zum Nachsprechen
  speechSynthesis.speak(u)
}
