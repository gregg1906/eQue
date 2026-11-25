/** Adresy URL ekranów panelu (History API): `/`, `/lokalizacje`, `/kolejka/12`… */
const HOME = 'strona_glowna';

export function pathForTab(tab: string): string {
  if (tab === HOME) return '/';
  const queue = /^kolejka:(\d+)$/.exec(tab);
  return queue ? `/kolejka/${queue[1]}` : `/${tab}`;
}

/** Ekran z adresu; nieznany albo niedostępny dla roli → Pulpit. Kolejki sprawdza dalej App (czy lokalizacja jest aktywna). */
export function tabFromPath(pathname: string, allowedTabs: string[]): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return HOME;
  const queue = /^\/kolejka\/(\d+)$/.exec(path);
  if (queue) return `kolejka:${queue[1]}`;
  const tab = path.slice(1);
  return allowedTabs.includes(tab) ? tab : HOME;
}
