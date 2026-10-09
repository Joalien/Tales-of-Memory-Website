/**
 * album/ (sources)  ->  public/album/ (fichiers publiés) + src/data/album.json
 *
 * Idempotent : relancer ne retraite que ce qui a changé.
 *
 * Sur une machine de build, album/ n'existe pas. Le script conserve alors le
 * manifeste versionné et se contente de n'exposer que les fichiers réellement
 * présents sur le disque, pour ne jamais produire de lien mort.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'album';
const OUT = path.join('public', 'album');
const MANIFEST = path.join(OUT, 'manifest.json');
const DATA = path.join('src', 'data', 'album.json');

const COVER_WIDTHS = [400, 800, 1600];
const COVER_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.ogg', '.opus']);
const AUDIO_REFUSED = new Set(['.wav', '.flac', '.aiff', '.aif']);

const warnings = [];

const listFiles = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name)
    : [];

/** « 01-la-derniere-lettre.mp3 » -> « La derniere lettre » */
function titleFromFilename(name) {
  const base = path.basename(name, path.extname(name))
    .replace(/^\s*\d+\s*[-_.]?\s*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : path.basename(name);
}

const mimeFor = (ext) =>
  ({ '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.opus': 'audio/ogg' })[ext] ?? 'audio/mpeg';

async function buildCover() {
  const file = listFiles(SRC).find((f) => COVER_EXT.has(path.extname(f).toLowerCase()));
  if (!file) return null;

  const bytes = fs.readFileSync(path.join(SRC, file));
  const meta = await sharp(bytes).metadata();
  const dir = path.join(OUT, 'cover');
  fs.mkdirSync(dir, { recursive: true });

  for (const w of COVER_WIDTHS) {
    const target = path.join(dir, `${w}.webp`);
    if (fs.existsSync(target)) continue;
    await sharp(bytes).rotate().resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80 }).toFile(target);
  }
  if ((meta.width ?? 0) < 1200) {
    warnings.push(`pochette de ${meta.width}px seulement — vise au moins 1600px de côté`);
  }
  return { widths: COVER_WIDTHS, w: meta.width ?? 0, h: meta.height ?? 0, source: file };
}

function copyIfNeeded(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const src = fs.statSync(from);
  if (fs.existsSync(to) && fs.statSync(to).size === src.size) return src.size;
  fs.copyFileSync(from, to);
  return src.size;
}

function buildBooklet() {
  const file = listFiles(SRC).find((f) => path.extname(f).toLowerCase() === '.pdf');
  if (!file) return null;
  const bytes = copyIfNeeded(path.join(SRC, file), path.join(OUT, 'jaquette.pdf'));
  if (bytes > 10 * 1024 * 1024) {
    warnings.push(`jaquette de ${(bytes / 1024 / 1024).toFixed(1)} Mo — lourd pour un téléchargement`);
  }
  return { file: 'jaquette.pdf', bytes };
}

function buildTracks() {
  const tracks = [];
  let total = 0;

  for (const name of listFiles(path.join(SRC, 'audio')).sort()) {
    const ext = path.extname(name).toLowerCase();
    if (AUDIO_REFUSED.has(ext)) {
      warnings.push(`${name} ignoré : ${ext} est trop lourd pour le web, convertis-le en .mp3`);
      continue;
    }
    if (!AUDIO_EXT.has(ext)) continue;

    const bytes = copyIfNeeded(path.join(SRC, 'audio', name), path.join(OUT, 'audio', name));
    total += bytes;
    tracks.push({ n: tracks.length + 1, file: name, title: titleFromFilename(name), bytes, type: mimeFor(ext) });
  }

  if (total > 40 * 1024 * 1024) {
    warnings.push(
      `${(total / 1024 / 1024).toFixed(0)} Mo d'audio : à ce volume, mieux vaut les servir depuis R2 que depuis le déploiement`,
    );
  }
  return tracks;
}

/** Ne garde que ce qui est réellement sur le disque, pour éviter les liens morts. */
function onlyPresent(manifest) {
  const coverOk = manifest.cover && COVER_WIDTHS.every((w) => fs.existsSync(path.join(OUT, 'cover', `${w}.webp`)));
  return {
    generatedAt: new Date().toISOString(),
    cover: coverOk ? manifest.cover : null,
    booklet: manifest.booklet && fs.existsSync(path.join(OUT, manifest.booklet.file)) ? manifest.booklet : null,
    tracks: (manifest.tracks ?? []).filter((t) => fs.existsSync(path.join(OUT, 'audio', t.file))),
  };
}

const hasSources = fs.existsSync(SRC) && (listFiles(SRC).length > 0 || listFiles(path.join(SRC, 'audio')).length > 0);

let manifest;
if (hasSources) {
  fs.mkdirSync(OUT, { recursive: true });
  manifest = { generatedAt: new Date().toISOString(), cover: await buildCover(), booklet: buildBooklet(), tracks: buildTracks() };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
} else if (fs.existsSync(MANIFEST)) {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
} else {
  manifest = { cover: null, booklet: null, tracks: [] };
}

const published = onlyPresent(manifest);
fs.mkdirSync(path.dirname(DATA), { recursive: true });
fs.writeFileSync(DATA, JSON.stringify(published, null, 2));

const bits = [
  published.cover ? 'pochette' : null,
  published.booklet ? 'jaquette' : null,
  published.tracks.length ? `${published.tracks.length} piste(s)` : null,
].filter(Boolean);
console.log(`[album] ${bits.length ? bits.join(', ') : 'rien à publier — voir album/README.md'}`);
for (const w of warnings) console.log(`[album] attention : ${w}`);
