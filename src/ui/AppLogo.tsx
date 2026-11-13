/** App-Symbol (wie auf dem Home-Bildschirm) neben dem Namen „Proviant“ */
export function AppLogo() {
  return <img className="app-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} width={30} height={30} alt="" />
}
