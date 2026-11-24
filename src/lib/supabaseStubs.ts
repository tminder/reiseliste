// Platzhalter für Teile von supabase-js, die die App nicht nutzt (Datei-Speicher, Edge Functions). Spart rund
// 40 kB im Start-Bundle (S-021). supabase-js legt den Speicher-Client im Konstruktor an, ruft ihn aber nie auf.
// Wer Speicher oder Functions braucht: Alias in vite.config.ts entfernen.
/* eslint-disable @typescript-eslint/no-unused-vars */
const unused = (what: string) => () => {
  throw new Error(`${what} ist in dieser App nicht eingebunden (vite.config.ts, Alias)`)
}
export class StorageClient {
  constructor(..._args: unknown[]) {}
  from = unused('Supabase Storage')
}
export class StorageApiError extends Error {}
export class FunctionsClient {
  constructor(..._args: unknown[]) {}
  invoke = unused('Supabase Functions')
  setAuth() {}
}
export const FunctionRegion = {}
export class FunctionsError extends Error {}
export class FunctionsFetchError extends FunctionsError {}
export class FunctionsHttpError extends FunctionsError {}
export class FunctionsRelayError extends FunctionsError {}
