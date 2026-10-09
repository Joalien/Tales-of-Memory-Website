/**
 * Image DDP (master de pressage)  ->  album/audio/NN-Titre.mp3
 *
 * Une image DDP contient tout l'audio d'un disque dans un seul bloc brut
 * (IMAGE.DAT) et la position des pistes dans une table PQ (PQDESCR). Ce script
 * lit la table, découpe, et encode.
 *
 * Deux décisions importantes :
 *
 * 1. Le découpage va d'index 01 à index 01, et non jusqu'à l'index 00 suivant.
 *    Les pré-gaps ne sont pas toujours silencieux : sur ce disque, quatre
 *    d'entre eux contiennent des fins de réverbération. Couper plus tôt les
 *    amputerait.
 *
 * 2. Les silences de tête et de queue sont retirés. Sur ce master, l'index 01
 *    est posé ~2,4 s avant la musique : sans rognage, chaque morceau démarre
 *    par un vide, ce qui est pénible à l'écoute sur un site.
 *
 * Le master n'est jamais modifié : on ne fait que le relire.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SECTOR = 2352;        // octets par trame CD
const FPS = 75;             // trames par seconde
const BYTES_PER_FRAME = SECTOR;

/** Seuil franc : au-dessus, c'est de la musique sans ambiguïté. */
const SEUIL_MUSIQUE = 300;  // ~ -40 dBFS
/** Seuil bas : sert à remonter une attaque progressive sous le seuil franc. */
const SEUIL_FAIBLE = 40;    // ~ -58 dBFS
const MARGE_TETE = Math.round(0.15 * FPS);
const MARGE_QUEUE = Math.round(0.6 * FPS);

/**
 * Titres et ordre. Le CD-Text est limité à l'ASCII — il rend « Burgundy s
 * Fight » et « Orleans » — donc on reprend l'orthographe du verso de jaquette.
 * `intro: true` sort le morceau de la numérotation affichée (préfixe 00).
 */
const TITRES = [
  { title: 'Arx Memoriae', intro: true },
  { title: 'Arrow of Justice' },
  { title: 'Legend of the Seven Seas' },
  { title: 'My Demons' },
  { title: 'One Thousand and One Nights' },
  { title: 'Candlelight' },
  { title: 'Letter' },
  { title: "Burgundy's Fight" },
  { title: 'Orléans' },
  { title: 'Last Hope' },
];

const ALBUM = 'Forgotten Chapters';
const ARTISTE = 'Tales of Memory';
const ANNEE = '2026';

const racine = process.argv[2] ?? fs
  .readdirSync('album', { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join('album', e.name, 'IMAGE.DAT')))
  .map((e) => path.join('album', e.name))[0];

if (!racine) {
  console.error('[ddp] aucune image DDP trouvée dans album/ (il faut un dossier contenant IMAGE.DAT)');
  process.exit(1);
}

const IMAGE = path.join(racine, 'IMAGE.DAT');
const totalFrames = fs.statSync(IMAGE).size / SECTOR;

/** Décalage de l'image : l'audio commence au temps absolu 00:02:00. */
const OFFSET = 150;

/** Lit la table PQ : points d'index en minutes/secondes/trames. */
function lirePQ() {
  const texte = fs.readFileSync(path.join(racine, 'PQDESCR'), 'latin1');
  const points = new Map();
  for (const m of texte.matchAll(/VVVS(\d{2})(\d{2})\s\s(\d{2})(\d{2})(\d{2})\d{2}/g)) {
    const [, piste, index, mm, ss, ff] = m;
    points.set(`${Number(piste)}-${Number(index)}`, Number(mm) * 60 * FPS + Number(ss) * FPS + Number(ff));
  }
  return points;
}

const fh = fs.openSync(IMAGE, 'r');

/** Crête absolue sur un intervalle de trames. */
function crete(f0, f1) {
  if (f1 <= f0) return 0;
  const taille = (f1 - f0) * BYTES_PER_FRAME;
  const buf = Buffer.alloc(taille);
  fs.readSync(fh, buf, 0, taille, (f0 - OFFSET) * BYTES_PER_FRAME);
  let max = 0;
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const v = Math.abs(buf.readInt16LE(i));
    if (v > max) max = v;
  }
  return max;
}

/**
 * Bornes de la musique dans [f0, f1).
 *
 * On cherche d'abord le seuil franc, puis on remonte tant que le signal reste
 * au-dessus du seuil bas : une attaque en fondu commence sous -40 dBFS et
 * serait sinon tronquée.
 */
function bornes(f0, f1) {
  const pas = 4; // ~53 ms

  let debut = f0;
  while (debut < f1 && crete(debut, Math.min(debut + pas, f1)) < SEUIL_MUSIQUE) debut += pas;
  while (debut - pas > f0 && crete(debut - pas, debut) >= SEUIL_FAIBLE) debut -= pas;

  let fin = f1;
  while (fin > debut && crete(Math.max(debut, fin - pas), fin) < SEUIL_MUSIQUE) fin -= pas;
  while (fin + pas < f1 && crete(fin, fin + pas) >= SEUIL_FAIBLE) fin += pas;

  return [Math.max(f0, debut - MARGE_TETE), Math.min(f1, fin + MARGE_QUEUE)];
}

/** Encode une tranche de l'image en MP3. */
function encoder(f0, f1, sortie, meta) {
  return new Promise((resolve, reject) => {
    const args = [
      '-loglevel', 'error', '-y', '-f', 's16le', '-ar', '44100', '-ac', '2', '-i', 'pipe:0',
      '-b:a', '192k',
      '-metadata', `title=${meta.title}`, '-metadata', `artist=${ARTISTE}`,
      '-metadata', `album=${ALBUM}`, '-metadata', `track=${meta.track}`,
      '-metadata', `date=${ANNEE}`,
      sortie,
    ];
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg a renvoyé ${code}`))));
    fs.createReadStream(IMAGE, {
      start: (f0 - OFFSET) * BYTES_PER_FRAME,
      end: (f1 - OFFSET) * BYTES_PER_FRAME - 1,
    }).pipe(ff.stdin);
  });
}

const pq = lirePQ();
const departs = TITRES.map((_, i) => pq.get(`${i + 1}-1`));
departs.push(OFFSET + totalFrames); // fin de l'image

fs.mkdirSync(path.join('album', 'audio'), { recursive: true });
for (const f of fs.readdirSync(path.join('album', 'audio'))) {
  fs.unlinkSync(path.join('album', 'audio', f));
}

const duree = (f) => `${Math.floor(f / FPS / 60)}:${String(Math.floor((f / FPS) % 60)).padStart(2, '0')}`;
let numero = 0;

console.log('  piste                          rogné tête  rogné queue   brut -> publié');
for (const [i, meta] of TITRES.entries()) {
  const brut0 = departs[i];
  const brut1 = departs[i + 1];
  const [f0, f1] = bornes(brut0, brut1);

  const prefixe = meta.intro ? 0 : ++numero;
  const sortie = path.join('album', 'audio', `${String(prefixe).padStart(2, '0')}-${meta.title}.mp3`);
  await encoder(f0, f1, sortie, { title: meta.title, track: `${i + 1}/${TITRES.length}` });

  console.log(
    `  ${meta.title.slice(0, 28).padEnd(28)} ${((f0 - brut0) / FPS).toFixed(2).padStart(8)} s ` +
    `${((brut1 - f1) / FPS).toFixed(2).padStart(10)} s   ${duree(brut1 - brut0)} -> ${duree(f1 - f0)}`,
  );
}

fs.closeSync(fh);
console.log(`\n[ddp] ${TITRES.length} piste(s) extraite(s) dans album/audio/`);
