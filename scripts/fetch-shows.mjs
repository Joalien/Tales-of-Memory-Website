/**
 * Agenda Google « Concerts » -> src/data/shows.json
 *
 * Sans CALENDAR_ICS_URL, on retombe sur fixtures/concerts.ics : le site se
 * construit donc hors ligne, sans aucun compte.
 *
 * Si le flux distant est injoignable alors qu'un shows.json existe déjà, on le
 * conserve : une panne côté Google ne doit pas publier un site sans dates.
 */
import fs from 'node:fs';
import path from 'node:path';
import { showsFromIcs } from './lib/ics.mjs';

// Node ne lit pas .env tout seul, contrairement à Astro : sans ceci,
// CALENDAR_ICS_URL resterait invisible et le site retomberait sur la fixture.
try { process.loadEnvFile(); } catch { /* pas de .env */ }

const OUT = path.join('src', 'data', 'shows.json');
const FIXTURE = path.join('fixtures', 'concerts.ics');
const url = (process.env.CALENDAR_ICS_URL || '').trim();

function write(shows, source) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source, shows }, null, 2));
  console.log(`[agenda] ${shows.length} concert(s) publiable(s) depuis ${source}`);
}

/** Cloudflare Pages pose CF_PAGES ; la plupart des autres CI posent CI. */
const onBuildMachine = Boolean(process.env.CF_PAGES || process.env.CI);

async function main() {
  if (!url) {
    // La fixture contient des salles et des dates inventées. Utile en local,
    // désastreux en ligne : un fan pourrait se déplacer pour un concert qui
    // n'existe pas. Mieux vaut publier un agenda vide.
    if (onBuildMachine) {
      console.error('[agenda] CALENDAR_ICS_URL absent sur la machine de build : publication sans aucune date');
      console.error('[agenda] la fixture de test ne doit jamais partir en ligne');
      write([], 'aucun agenda configuré');
      return;
    }
    write(showsFromIcs(fs.readFileSync(FIXTURE, 'utf8')), 'fixture locale');
    return;
  }
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'user-agent': 'talesofmemory-site/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    if (!body.includes('BEGIN:VCALENDAR')) throw new Error('réponse non iCalendar');
    write(showsFromIcs(body), 'agenda Google');
  } catch (err) {
    console.error(`[agenda] échec de lecture du flux : ${err.message}`);
    if (fs.existsSync(OUT)) {
      console.error('[agenda] conservation des dates de la construction précédente');
      return;
    }
    console.error('[agenda] aucune donnée antérieure, publication sans dates');
    write([], 'flux injoignable');
  }
}

await main();
