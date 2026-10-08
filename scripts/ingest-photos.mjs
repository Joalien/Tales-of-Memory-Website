/**
 * photos/ (originaux)  ->  public/media/ (dérivés web) + manifeste local
 *
 * Fabrique les seuls fichiers destinés à être publiés : 400 / 800 / 1600 px en
 * WebP, orientation EXIF appliquée puis métadonnées supprimées — y compris les
 * coordonnées GPS, que les téléphones inscrivent par défaut.
 *
 * L'identifiant d'une photo est l'empreinte de son contenu : relancer le script
 * ne duplique rien et ne retraite que les nouveaux fichiers.
 *
 * En phase 2, ces mêmes dérivés seront poussés sur R2 par le Worker d'envoi.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const SRC_ROOT = 'photos';
const OUT_ROOT = path.join('public', 'media');
const WIDTHS = [400, 800, 1600];
const QUALITY = 72;
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);
/** Formats que sharp ne sait pas lire sans build spécifique. */
const UNSUPPORTED_EXT = new Set(['.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.dng']);

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(dir, e.name));
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

/** Les sources à traiter, regroupées par galerie. */
function collectSources() {
  const groups = [];
  for (const slug of listDirs(path.join(SRC_ROOT, 'concerts'))) {
    groups.push({ slug, kind: 'concert', files: listImages(path.join(SRC_ROOT, 'concerts', slug)) });
  }
  if (fs.existsSync(path.join(SRC_ROOT, 'presse'))) {
    groups.push({ slug: 'presse', kind: 'press', files: listImages(path.join(SRC_ROOT, 'presse')) });
  }
  const loose = listImages(SRC_ROOT).filter((f) => path.basename(f).toLowerCase() !== 'readme.md');
  if (loose.length) groups.push({ slug: 'non-classees', kind: 'unsorted', files: loose });
  return groups;
}

const skipped = [];

async function processOne(gallerySlug, file) {
  const ext = path.extname(file).toLowerCase();
  if (UNSUPPORTED_EXT.has(ext)) {
    skipped.push({ file, why: `format ${ext} non lisible — à convertir en JPEG d'abord` });
    return null;
  }
  if (!SOURCE_EXT.has(ext)) return null;

  const bytes = fs.readFileSync(file);
  const id = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);

  let meta;
  try {
    meta = await sharp(bytes).metadata();
  } catch (err) {
    skipped.push({ file, why: `illisible (${err.message.split('\n')[0]})` });
    return null;
  }

  // Dimensions après application de l'orientation EXIF.
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height) {
    skipped.push({ file, why: 'dimensions illisibles' });
    return null;
  }

  const entry = { id, w: width, h: height, credit: '', source: path.basename(file) };

  const done = WIDTHS.every((w) => fs.existsSync(path.join(OUT_ROOT, gallerySlug, String(w), `${id}.webp`)));
  if (done) return { entry, created: false };

  // .rotate() sans argument applique l'orientation EXIF ; sharp ne recopie
  // aucune métadonnée par défaut, le GPS disparaît donc du fichier publié.
  const base = sharp(bytes).rotate();
  for (const w of WIDTHS) {
    const dir = path.join(OUT_ROOT, gallerySlug, String(w));
    fs.mkdirSync(dir, { recursive: true });
    await base
      .clone()
      .resize({ width: Math.min(w, width), withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(path.join(dir, `${id}.webp`));
  }
  return { entry, created: true };
}

const groups = collectSources();
if (groups.length === 0) {
  console.log(`[ingest] rien à traiter dans ${SRC_ROOT}/ — voir ${SRC_ROOT}/README.md pour le rangement`);
  process.exit(0);
}

const galleries = [];
let created = 0;

for (const group of groups) {
  const photos = [];
  for (const file of group.files.sort()) {
    const result = await processOne(group.slug, file);
    if (!result) continue;
    photos.push(result.entry);
    if (result.created) created++;
  }
  if (photos.length) {
    galleries.push({ slug: group.slug, kind: group.kind, cover: photos[0].id, photos });
    console.log(`[ingest] ${group.slug} (${group.kind}) : ${photos.length} photo(s)`);
  }
}

fs.mkdirSync(OUT_ROOT, { recursive: true });
fs.writeFileSync(
  path.join(OUT_ROOT, 'manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), widths: WIDTHS, galleries }, null, 2),
);

console.log(`[ingest] ${created} nouvelle(s) photo(s) traitée(s), ${galleries.length} galerie(s) au total`);
if (skipped.length) {
  console.log(`\n[ingest] ${skipped.length} fichier(s) ignoré(s) :`);
  for (const s of skipped.slice(0, 20)) console.log(`  - ${s.file} : ${s.why}`);
  if (skipped.length > 20) console.log(`  … et ${skipped.length - 20} autre(s)`);
}
