/**
 * Lecture d'un flux iCalendar (RFC 5545) réduite à ce dont le site a besoin.
 *
 * Choix volontaires :
 *  - seuls les champs explicitement listés dans DESCRIPTION_FIELDS sont lus dans
 *    la description. Tout le reste (cachet, numéros de téléphone, notes internes)
 *    est ignoré et ne peut donc jamais se retrouver sur le site public ;
 *  - les récurrences (RRULE) ne sont pas développées : le calendrier « Concerts »
 *    ne contient que des dates uniques, les répétitions vivent sur un autre
 *    calendrier que le site ne lit pas.
 */

export const SITE_TZ = 'Europe/Paris';

/** Champs autorisés dans la description, et rien d'autre. */
const DESCRIPTION_FIELDS = {
  billets: 'ticketsUrl',
  billetterie: 'ticketsUrl',
  tickets: 'ticketsUrl',
  prix: 'price',
  tarif: 'price',
  avec: 'lineup',
  plateau: 'lineup',
  publier: 'publish',
};

/** Index du premier `ch` hors d'une chaîne entre guillemets. */
function indexOfUnquoted(str, ch) {
  let quoted = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"') quoted = !quoted;
    else if (c === ch && !quoted) return i;
  }
  return -1;
}

/** Déplie les lignes repliées (RFC 5545 §3.1). */
function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

function unescapeText(value) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/** « NOM;PARAM=VAL:valeur » -> { name, params, value } */
function parseLine(line) {
  const sep = indexOfUnquoted(line, ':');
  if (sep === -1) return null;
  const left = line.slice(0, sep);
  const value = line.slice(sep + 1);
  const segments = left.split(';');
  const name = segments[0].toUpperCase();
  const params = {};
  for (const seg of segments.slice(1)) {
    const eq = seg.indexOf('=');
    if (eq === -1) continue;
    params[seg.slice(0, eq).toUpperCase()] = seg.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name, params, value };
}

/** Décalage, en millisecondes, du fuseau `timeZone` à l'instant `utcMs`. */
function tzOffsetMs(utcMs, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = {};
  for (const p of fmt.formatToParts(new Date(utcMs))) parts[p.type] = p.value;
  const asIfUtc = Date.UTC(
    +parts.year, +parts.month - 1, +parts.day,
    +parts.hour, +parts.minute, +parts.second,
  );
  return asIfUtc - utcMs;
}

/** Heure locale d'un fuseau -> instant UTC. Converge en deux passes sur les DST. */
function zonedToUtc({ y, m, d, h, mi, s }, timeZone) {
  if (timeZone === 'UTC') return Date.UTC(y, m - 1, d, h, mi, s);
  const naive = Date.UTC(y, m - 1, d, h, mi, s);
  let instant = naive - tzOffsetMs(naive, timeZone);
  instant = naive - tzOffsetMs(instant, timeZone);
  return instant;
}

function parseDateValue(value, params) {
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    return {
      allDay: true, tz: params.TZID || SITE_TZ,
      y: +value.slice(0, 4), m: +value.slice(4, 6), d: +value.slice(6, 8),
      h: 0, mi: 0, s: 0,
    };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value.trim());
  if (!m) return null;
  return {
    allDay: false,
    tz: m[7] ? 'UTC' : (params.TZID || SITE_TZ),
    y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6],
  };
}

/** Extrait les blocs VEVENT. */
export function parseIcs(text) {
  const events = [];
  let current = null;
  for (const raw of unfold(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line === 'BEGIN:VEVENT') { current = {}; continue; }
    if (line === 'END:VEVENT') { if (current) events.push(current); current = null; continue; }
    if (!current) continue;
    const parsed = parseLine(line);
    if (parsed) current[parsed.name] = parsed;
  }
  return events;
}

/** Lit uniquement les clés autorisées dans la description. */
function parseDescription(description) {
  const out = {};
  if (!description) return out;
  for (const line of unescapeText(description).split('\n')) {
    const eq = line.indexOf(':');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().toLowerCase();
    const field = DESCRIPTION_FIELDS[key];
    if (!field) continue;
    const value = line.slice(eq + 1).trim();
    if (value) out[field] = value;
  }
  return out;
}

function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function slugify(str) {
  return stripAccents(str)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** « Le Molotov — Marseille » -> { venue, city } */
function splitSummary(summary) {
  const parts = summary.split(/\s+[—–]\s+|\s+-\s+/);
  if (parts.length >= 2) {
    return { venue: parts[0].trim(), city: parts.slice(1).join(' - ').trim() };
  }
  return { venue: summary.trim(), city: '' };
}

const FALSEY = new Set(['non', 'no', 'false', '0', 'off', 'brouillon']);

/** VEVENT -> concert publiable, ou null si l'événement ne doit pas sortir. */
export function toShow(event) {
  const summaryProp = event.SUMMARY;
  const startProp = event.DTSTART;
  if (!summaryProp || !startProp) return null;

  // Statut annulé : l'événement disparaît du site.
  if ((event.STATUS?.value || '').toUpperCase() === 'CANCELLED') return null;

  const start = parseDateValue(startProp.value, startProp.params);
  if (!start) return null;

  const fields = parseDescription(event.DESCRIPTION?.value);
  // Date confirmée mais sous embargo : reste dans l'agenda, absente du site.
  if (fields.publish && FALSEY.has(fields.publish.toLowerCase())) return null;

  const summary = unescapeText(summaryProp.value).trim();
  const { venue, city } = splitSummary(summary);
  const startMs = zonedToUtc(start, start.tz);

  const end = event.DTEND ? parseDateValue(event.DTEND.value, event.DTEND.params) : null;
  const endMs = end ? zonedToUtc(end, end.tz) : null;

  // Un concert reste « à venir » jusqu'à sa fin réelle : fin déclarée, fin de
  // journée pour un événement sur la journée entière, sinon début + 5 h.
  const overMs = endMs
    ?? (start.allDay
      ? zonedToUtc({ ...start, h: 23, mi: 59, s: 59 }, start.tz)
      : startMs + 5 * 3600 * 1000);

  const isoDay = new Intl.DateTimeFormat('fr-CA', {
    timeZone: start.tz === 'UTC' ? SITE_TZ : start.tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(startMs));

  return {
    slug: `${isoDay}_${slugify(summary)}`.slice(0, 80),
    uid: event.UID?.value ?? null,
    venue,
    city,
    address: event.LOCATION ? unescapeText(event.LOCATION.value).trim() : '',
    ticketsUrl: /^https?:\/\//i.test(fields.ticketsUrl || '') ? fields.ticketsUrl : '',
    price: fields.price || '',
    lineup: fields.lineup || '',
    day: isoDay,
    startsAt: new Date(startMs).toISOString(),
    overAt: new Date(overMs).toISOString(),
    allDay: start.allDay,
  };
}

/** Flux ICS -> liste de concerts publiables, triée du plus proche au plus lointain. */
export function showsFromIcs(text) {
  const shows = [];
  const seen = new Set();
  for (const event of parseIcs(text)) {
    const show = toShow(event);
    if (!show) continue;
    if (seen.has(show.slug)) continue; // une récurrence ne produit qu'une entrée
    seen.add(show.slug);
    shows.push(show);
  }
  shows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return shows;
}
