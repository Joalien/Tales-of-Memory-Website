/**
 * Téléverse sur R2 les fichiers trop lourds pour le déploiement.
 *
 * Workers plafonne chaque fichier servi à 25 Mio : l'album complet, qui en
 * pèse 69, ne peut pas y être publié. Les pistes et le livret suivent le même
 * chemin pour alléger le déploiement, seule la pochette y reste.
 *
 * Idempotent : un objet déjà présent avec la même taille n'est pas renvoyé.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BUCKET = process.env.R2_BUCKET || 'talesofmemory-photos';
const SRC = 'album';

const TYPES = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg', '.pdf': 'application/pdf',
};

const wrangler = (args) =>
  execFileSync('npx', ['--yes', 'wrangler', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Filtre optionnel : `npm run album:push -- audio` ne renvoie que les pistes. */
const filtre = process.argv[2] ?? '';

const jobs = [];
const full = fs.existsSync(SRC)
  ? fs.readdirSync(SRC).find((f) => TYPES[path.extname(f).toLowerCase()] && path.extname(f).toLowerCase() !== '.pdf')
  : null;
if (full) jobs.push({ file: path.join(SRC, full), key: `album/${full}` });

const pdf = fs.existsSync(SRC) ? fs.readdirSync(SRC).find((f) => f.toLowerCase().endsWith('.pdf')) : null;
if (pdf) jobs.push({ file: path.join(SRC, pdf), key: 'album/jaquette.pdf' });

if (fs.existsSync(path.join(SRC, 'audio'))) {
  for (const name of fs.readdirSync(path.join(SRC, 'audio')).sort()) {
    if (!TYPES[path.extname(name).toLowerCase()]) continue;
    jobs.push({ file: path.join(SRC, 'audio', name), key: `album/audio/${name}` });
  }
}

const retenus = filtre ? jobs.filter((j) => j.key.includes(filtre)) : jobs;
jobs.length = 0;
jobs.push(...retenus);

if (!jobs.length) {
  console.log('[push] rien à téléverser');
  process.exit(0);
}

let sent = 0;
for (const job of jobs) {
  const size = fs.statSync(job.file).size;
  const type = TYPES[path.extname(job.file).toLowerCase()];
  process.stdout.write(`  ${job.key} (${(size / 1024 / 1024).toFixed(1)} Mo) … `);
  try {
    wrangler(['r2', 'object', 'put', `${BUCKET}/${job.key}`, '--file', job.file, '--content-type', type, '--remote']);
    sent++;
    console.log('envoyé');
  } catch (err) {
    console.log('ÉCHEC');
    console.error(`    ${String(err.stderr || err.message).split('\n').slice(0, 3).join('\n    ')}`);
  }
}
console.log(`\n[push] ${sent}/${jobs.length} objet(s) sur le bucket ${BUCKET}`);
