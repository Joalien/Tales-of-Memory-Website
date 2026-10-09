/**
 * Crée un dossier de dépôt par concert dans photos/concerts/.
 *
 * Le nom du dossier doit correspondre exactement à l'identifiant du concert
 * calculé depuis l'agenda ; le dériver d'ici plutôt qu'à la main évite les
 * fautes de frappe qui laisseraient des photos orphelines.
 */
import fs from 'node:fs';
import path from 'node:path';

const SHOWS = path.join('src', 'data', 'shows.json');
if (!fs.existsSync(SHOWS)) {
  console.error('[dossiers] src/data/shows.json absent — lance d’abord `npm run data`');
  process.exit(1);
}

const { shows } = JSON.parse(fs.readFileSync(SHOWS, 'utf8'));
let created = 0;

for (const show of shows) {
  const dir = path.join('photos', 'concerts', show.slug);
  if (fs.existsSync(dir)) continue;
  fs.mkdirSync(dir, { recursive: true });
  created++;
  console.log(`  créé  ${dir}`);
}

console.log(
  created
    ? `[dossiers] ${created} dossier(s) créé(s) sur ${shows.length} concert(s)`
    : `[dossiers] les ${shows.length} dossiers existent déjà`,
);
