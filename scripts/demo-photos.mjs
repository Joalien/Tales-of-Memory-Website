/**
 * Images de démonstration pour travailler le rendu hors ligne.
 *
 * Ne fait rien dès que PHOTOS_BASE_URL est renseigné : en production, les
 * photos viennent du bucket R2, jamais d'ici.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const WIDTHS = [400, 800, 1600];
const BASE_W = 1600;
const BASE_H = 1067;
const OUT_ROOT = path.join('public', 'demo');

if ((process.env.PHOTOS_BASE_URL || '').trim()) {
  console.log('[demo] PHOTOS_BASE_URL défini, génération ignorée');
  process.exit(0);
}

// Dès que de vraies photos sont ingérées, les images bouchon ne sont plus
// référencées nulle part : les produire ne ferait qu'alourdir le déploiement.
if (fs.existsSync(path.join('public', 'media', 'manifest.json'))) {
  console.log('[demo] photos réelles présentes, génération ignorée');
  process.exit(0);
}

/** Générateur pseudo-aléatoire déterministe : mêmes images à chaque build. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Faux cliché de scène : dégradé sombre, halos de projecteurs, grain. */
function stagePhoto(seed) {
  const rand = rng(seed);
  const beams = Array.from({ length: 3 }, () => ({
    x: rand() * BASE_W,
    y: rand() * BASE_H * 0.7,
    r: (0.25 + rand() * 0.45) * BASE_W,
    rgb: rand() < 0.5 ? [200, 137, 74] : [96, 124, 168],
    power: 0.5 + rand() * 0.7,
  }));

  const buf = Buffer.allocUnsafe(BASE_W * BASE_H * 3);
  let i = 0;
  for (let y = 0; y < BASE_H; y++) {
    const vertical = 1 - y / BASE_H;
    for (let x = 0; x < BASE_W; x++) {
      let r = 8 + vertical * 10;
      let g = 9 + vertical * 11;
      let b = 13 + vertical * 16;
      for (const beam of beams) {
        const dx = x - beam.x;
        const dy = (y - beam.y) * 1.6;
        const d = Math.sqrt(dx * dx + dy * dy) / beam.r;
        if (d >= 1) continue;
        const f = (1 - d) ** 2.4 * beam.power;
        r += beam.rgb[0] * f;
        g += beam.rgb[1] * f;
        b += beam.rgb[2] * f;
      }
      const grain = (rand() - 0.5) * 16;
      buf[i++] = Math.max(0, Math.min(255, r + grain));
      buf[i++] = Math.max(0, Math.min(255, g + grain));
      buf[i++] = Math.max(0, Math.min(255, b + grain));
    }
  }
  return buf;
}

const showsPath = path.join('src', 'data', 'shows.json');
if (!fs.existsSync(showsPath)) {
  console.log('[demo] shows.json absent, rien à illustrer');
  process.exit(0);
}

const { shows } = JSON.parse(fs.readFileSync(showsPath, 'utf8'));
const now = Date.now();
const past = shows.filter((s) => Date.parse(s.overAt) < now).reverse();

let created = 0;
for (const [gIndex, show] of past.entries()) {
  const count = 5 + ((gIndex * 3) % 4);
  for (let p = 0; p < count; p++) {
    const id = `p${String(p + 1).padStart(2, '0')}`;
    const target = path.join(OUT_ROOT, show.slug, String(WIDTHS[0]), `${id}.webp`);
    if (fs.existsSync(target)) continue;
    const raw = sharp(stagePhoto(gIndex * 1000 + p * 17 + 7), {
      raw: { width: BASE_W, height: BASE_H, channels: 3 },
    });
    for (const w of WIDTHS) {
      const dir = path.join(OUT_ROOT, show.slug, String(w));
      fs.mkdirSync(dir, { recursive: true });
      await raw.clone().resize({ width: w }).webp({ quality: 72 }).toFile(path.join(dir, `${id}.webp`));
    }
    created++;
  }
}
console.log(created ? `[demo] ${created} photo(s) de démonstration générée(s)` : '[demo] images déjà présentes');
