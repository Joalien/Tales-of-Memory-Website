import type { Show } from './shows';
import { site } from '../data/site';

const TZ = 'Europe/Paris';

/** Date du jour civil parisien correspondant à un instant, au format AAAAMMJJ. */
const jourParisien = (iso: string) =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso))
    .replaceAll('-', '');

/** 2026-11-14T19:30:00.000Z -> 20261114T193000Z */
const instantCompact = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const jourSuivant = (compact: string) => {
  const d = new Date(Date.UTC(+compact.slice(0, 4), +compact.slice(4, 6) - 1, +compact.slice(6, 8) + 1));
  return d.toISOString().slice(0, 10).replaceAll('-', '');
};

/**
 * Intervalle attendu par Google Agenda.
 *
 * Tant qu'un concert n'a pas d'horaire, il est enregistré sur la journée
 * entière — plutôt qu'avec une heure inventée. Le jour de fin y est exclusif.
 * Dès qu'un horaire est saisi dans l'agenda du groupe, le site le reprend et
 * produit un événement daté à la minute, sans rien changer ici.
 */
function intervalle(show: Show): string {
  if (!show.allDay) return `${instantCompact(show.startsAt)}/${instantCompact(show.overAt)}`;

  const debut = jourParisien(show.startsAt);
  const fin = jourParisien(show.overAt);
  return `${debut}/${fin > debut ? fin : jourSuivant(debut)}`;
}

/** Lien d'ajout à Google Agenda, pré-rempli avec ce que le site connaît. */
export function googleCalendarUrl(show: Show): string {
  const details = [
    show.lineup ? `Avec ${show.lineup}` : null,
    show.price ? `Tarif : ${show.price}` : null,
    show.ticketsUrl ? `Billetterie : ${show.ticketsUrl}` : null,
    !show.allDay ? null : 'Horaire non communiqué à ce jour.',
    `${site.domain}/concerts`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${site.name} — ${show.venue}`,
    dates: intervalle(show),
    details,
    location: show.address || show.city || show.venue,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
