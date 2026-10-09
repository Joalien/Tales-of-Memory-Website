import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { upcoming, past, type Show } from '../lib/shows';
import { jourParisien, instantCompact, jourSuivant } from '../lib/calendar';

/**
 * Flux iCalendar de toutes les dates, passées comme à venir.
 *
 * Permet à qui veut — public, presse, programmateurs — de s'abonner à l'agenda
 * du groupe depuis n'importe quelle application de calendrier.
 */

const echappe = (valeur: string) =>
  valeur.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * Repliage des lignes à 75 octets (RFC 5545 §3.1).
 *
 * La limite est en OCTETS et non en caractères : découper au caractère
 * couperait un accent en deux et rendrait le flux illisible.
 */
function replie(ligne: string): string {
  const octets = Buffer.from(ligne, 'utf8');
  if (octets.length <= 75) return ligne;

  const morceaux: string[] = [];
  let debut = 0;
  let limite = 75;
  while (debut < octets.length) {
    let fin = Math.min(debut + limite, octets.length);
    // On recule tant que l'on tomberait au milieu d'un caractère UTF-8.
    while (fin < octets.length && (octets[fin] & 0b1100_0000) === 0b1000_0000) fin -= 1;
    morceaux.push(octets.subarray(debut, fin).toString('utf8'));
    debut = fin;
    limite = 74; // les lignes suivantes commencent par une espace
  }
  return morceaux.join('\r\n ');
}

function evenement(show: Show, horodatage: string): string[] {
  const lignes: string[] = ['BEGIN:VEVENT'];

  lignes.push(`UID:${show.uid ?? `${show.slug}@talesofmemory.com`}`);
  lignes.push(`DTSTAMP:${horodatage}`);

  if (show.allDay) {
    const debut = jourParisien(show.startsAt);
    const fin = jourParisien(show.overAt);
    lignes.push(`DTSTART;VALUE=DATE:${debut}`);
    lignes.push(`DTEND;VALUE=DATE:${fin > debut ? fin : jourSuivant(debut)}`);
  } else {
    lignes.push(`DTSTART:${instantCompact(show.startsAt)}`);
    lignes.push(`DTEND:${instantCompact(show.overAt)}`);
  }

  lignes.push(`SUMMARY:${echappe(`${site.name} — ${show.venue}${show.city ? ` · ${show.city}` : ''}`)}`);
  if (show.address) lignes.push(`LOCATION:${echappe(show.address)}`);

  const details = [
    show.lineup ? `Avec ${show.lineup}` : null,
    show.price ? `Tarif : ${show.price}` : null,
    show.ticketsUrl ? `Billetterie : ${show.ticketsUrl}` : null,
    show.allDay ? 'Horaire non communiqué à ce jour.' : null,
  ].filter(Boolean);
  if (details.length) lignes.push(`DESCRIPTION:${echappe(details.join('\n'))}`);

  lignes.push(`URL:${show.ticketsUrl || `${site.domain}/concerts`}`);
  lignes.push('END:VEVENT');
  return lignes;
}

export const GET: APIRoute = () => {
  const horodatage = instantCompact(new Date().toISOString());
  const dates = [...past, ...upcoming].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tales of Memory//Agenda du site//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${echappe(`${site.name} — concerts`)}`,
    'X-WR-TIMEZONE:Europe/Paris',
    // Indication de fréquence de rafraîchissement. Les agendas en ligne la
    // suivent rarement à la lettre, mais la poser ne coûte rien.
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...dates.flatMap((show) => evenement(show, horodatage)),
    'END:VCALENDAR',
  ];

  return new Response(lignes.map(replie).join('\r\n') + '\r\n', {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="tales-of-memory.ics"',
    },
  });
};
