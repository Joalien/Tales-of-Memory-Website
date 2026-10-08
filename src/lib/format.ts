/** Mise en forme des dates, toujours dans le fuseau du groupe. */
const TZ = 'Europe/Paris';

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...opts });

export const longDate = (iso: string) =>
  fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const shortDate = (iso: string) =>
  fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const time = (iso: string) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const dayNumber = (iso: string) => fmt({ day: '2-digit' }).format(new Date(iso));

export const monthShort = (iso: string) =>
  fmt({ month: 'short' }).format(new Date(iso)).replace('.', '');

export const year = (iso: string) => fmt({ year: 'numeric' }).format(new Date(iso));
