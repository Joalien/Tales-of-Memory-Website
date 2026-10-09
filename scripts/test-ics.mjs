/**
 * Vérifie la lecture de l'agenda sur le jeu de cas limites.
 *
 * Le test le plus important est celui des fuites : la description d'un
 * événement d'agenda contient souvent des informations internes (cachet,
 * téléphone de la régie), et rien de tout cela ne doit pouvoir atteindre le
 * site public.
 */
import fs from 'node:fs';
import { showsFromIcs } from './lib/ics.mjs';

const shows = showsFromIcs(fs.readFileSync('fixtures/cas-limites.ics', 'utf8'));
const dump = JSON.stringify(shows);
const bySlugPart = (part) => shows.find((s) => s.slug.includes(part));

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ok      ${label}`);
  } else {
    failures++;
    console.log(`  ÉCHEC   ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('Lecture du flux iCalendar\n');

check('6 concerts publiables sur 8 événements', shows.length === 6, `obtenu ${shows.length}`);
check('événement annulé écarté', !dump.includes('Ferrailleur'));
check('date sous embargo écartée', !dump.includes('Bikini'));

console.log('\nÉtanchéité des informations internes\n');
for (const secret of ['cachet', '650', '06 11 22 33 44', 'Camille', 'ne rien publier']) {
  check(`« ${secret} » absent du résultat`, !dump.includes(secret));
}

console.log('\nFuseaux horaires\n');
check(
  'heure d’hiver : 20h30 Paris le 14/11 = 19h30 UTC',
  bySlugPart('2026-11-14')?.startsAt === '2026-11-14T19:30:00.000Z',
  bySlugPart('2026-11-14')?.startsAt,
);
check(
  'heure d’été : 20h30 Paris le 16/05 = 18h30 UTC',
  bySlugPart('2026-05-16')?.startsAt === '2026-05-16T18:30:00.000Z',
  bySlugPart('2026-05-16')?.startsAt,
);

console.log('\nAnalyse des champs\n');
const paris = bySlugPart('2026-11-14');
check('titre découpé en salle et ville', paris?.venue === 'La Maroquinerie' && paris?.city === 'Paris');
check('ligne repliée recollée', paris?.price === '18€ en prévente / 22€ sur place', paris?.price);
check('billetterie lue', paris?.ticketsUrl.startsWith('https://'));
check('première partie lue', paris?.lineup === 'Hollow Chant en première partie');
check('événement sur la journée entière détecté', bySlugPart('2027-02-20')?.allDay === true);

console.log(failures === 0 ? '\nTout est vert.' : `\n${failures} vérification(s) en échec.`);
process.exit(failures === 0 ? 0 : 1);
