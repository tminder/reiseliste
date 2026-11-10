/**
 * Optionale Module. Ein ausgeschaltetes Modul ist in der Oberfläche unsichtbar und sendet keine Daten.
 * Zum Einschalten: Flag auf true setzen, Datenschutz (src/Privacy.tsx) und Planung (D-027) prüfen.
 */
export const FEATURES = {
  /**
   * Community (D-024): Begriffe in der Landessprache korrigieren bzw. bei unbekannten Artikeln selbst eintragen,
   * Korrektur gilt für die ganze Liste und wird als Vorschlag fürs Wörterbuch gesammelt.
   * Code: src/features/community.ts · Datenbank: term_suggestions · Export: .github/workflows/export-suggestions.yml
   */
  community: false,
} as const
