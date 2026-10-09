/**
 * Inventaire des photos -> src/data/photos.json
 *
 * En production, le Worker d'envoi maintient /manifest.json dans le bucket R2 :
 * le build ne fait qu'une requête HTTPS publique dessus, donc aucune clé
 * d'accès R2 n'intervient dans la chaîne de déploiement.
 *
 * En local, l'inventaire est reconstruit depuis public/demo.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join('src', 'data', 'photos.json');
const DEMO_ROOT = path.join('public', 'demo');
const MEDIA_MANIFEST = path.join('public', 'media', 'manifest.json');
const base = (process.env.PHOTOS_BASE_URL || '').trim().replace(/\/+$/, '');

function write(payload, source) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const total = payload.galleries.reduce((n, g) => n + g.photos.length, 0);
  console.log(`[photos] ${payload.galleries.length} galerie(s), ${total} photo(s) depuis ${source}`);
}

/**
 * Ne garde que les photos dont le dérivé est réellement sur le disque.
 *
 * Le manifeste est produit en local, où tous les originaux sont présents, mais
 * seuls les dérivés de presse sont versionnés. Sur la machine de build, les
 * galeries de concert sont donc listées sans leurs fichiers : sans ce filtre,
 * le site publierait des images cassées.
 */
function withFilesPresent(galleries) {
  const onDisk = (slug, id) =>
    fs.existsSync(path.join('public', 'media', slug, '1600', `${id}.webp`));

  return galleries
    .map((g) => ({ ...g, photos: (g.photos ?? []).filter((p) => onDisk(g.slug, p.id)) }))
    .filter((g) => g.photos.length > 0)
    .map((g) => ({
      ...g,
      cover: g.photos.some((p) => p.id === g.cover) ? g.cover : g.photos[0].id,
    }));
}

function fromDemo() {
  const galleries = [];
  if (fs.existsSync(DEMO_ROOT)) {
    for (const slug of fs.readdirSync(DEMO_ROOT).sort().reverse()) {
      const dir = path.join(DEMO_ROOT, slug, '1600');
      if (!fs.existsSync(dir)) continue;
      const photos = fs.readdirSync(dir)
        .filter((f) => f.endsWith('.webp'))
        .sort()
        .map((f) => ({ id: path.basename(f, '.webp'), w: 1600, h: 1067, credit: '' }));
      if (photos.length) galleries.push({ slug, cover: photos[0].id, photos });
    }
  }
  return { generatedAt: new Date().toISOString(), baseUrl: '/demo', widths: [400, 800, 1600], galleries };
}

async function main() {
  if (!base) {
    // Priorité aux photos réelles ingérées en local, sinon démonstration.
    if (fs.existsSync(MEDIA_MANIFEST)) {
      const local = JSON.parse(fs.readFileSync(MEDIA_MANIFEST, 'utf8'));
      write({
        generatedAt: new Date().toISOString(),
        baseUrl: '/media',
        widths: local.widths ?? [400, 800, 1600],
        galleries: withFilesPresent(local.galleries ?? []),
      }, 'photos locales ingérées');
      return;
    }
    write(fromDemo(), 'images de démonstration');
    return;
  }
  try {
    const res = await fetch(`${base}/manifest.json`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    if (!Array.isArray(manifest.galleries)) throw new Error('manifeste illisible');
    write({
      generatedAt: new Date().toISOString(),
      baseUrl: base,
      widths: manifest.widths ?? [400, 800, 1600],
      galleries: manifest.galleries,
    }, 'bucket R2');
  } catch (err) {
    console.error(`[photos] échec de lecture du manifeste : ${err.message}`);
    if (fs.existsSync(OUT)) {
      console.error('[photos] conservation de l\'inventaire précédent');
      return;
    }
    write({ generatedAt: new Date().toISOString(), baseUrl: base, widths: [400, 800, 1600], galleries: [] }, 'manifeste injoignable');
  }
}

await main();
