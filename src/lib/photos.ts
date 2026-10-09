import data from '../data/photos.json';

export type Photo = { id: string; w: number; h: number; credit?: string; source?: string };
export type GalleryKind = 'concert' | 'press' | 'band' | 'member' | 'merch' | 'poster' | 'unsorted';
export type Gallery = { slug: string; cover: string; photos: Photo[]; kind?: GalleryKind };

export const baseUrl: string = data.baseUrl;
export const widths: number[] = data.widths ?? [400, 800, 1600];
export const galleries: Gallery[] = (data.galleries as Gallery[]) ?? [];

export const src = (gallerySlug: string, id: string, w: number) =>
  `${baseUrl}/${gallerySlug}/${w}/${id}.webp`;

export const srcset = (gallerySlug: string, id: string) =>
  widths.map((w) => `${src(gallerySlug, id, w)} ${w}w`).join(', ');

/** Galeries rattachées à un concert : la presse et le vrac en sont exclus. */
export const concertGalleries: Gallery[] = galleries.filter((g) => (g.kind ?? 'concert') === 'concert');

/** Coulisses et studio : alimentent le carrousel de la page d'accueil. */
export const bandPhotos: Gallery | undefined = galleries.find((g) => g.kind === 'band');

/** Photos promo, utilisables pour la page bio et le dossier de presse. */
export const pressPhotos: Gallery | undefined = galleries.find((g) => g.kind === 'press');

/** Portraits des membres, un fichier par personne. */
export const memberPhotos: Gallery | undefined = galleries.find((g) => g.kind === 'member');

/** Visuels des articles de la boutique, un fichier par article. */
export const merchPhotos: Gallery | undefined = galleries.find((g) => g.kind === 'merch');

/** Affiches de concert, un fichier par date. */
export const posterPhotos: Gallery | undefined = galleries.find((g) => g.kind === 'poster');

/**
 * Une photo d'une galerie, retrouvée par le nom de son fichier source.
 *
 * Le rattachement passe par le nom du fichier déposé et non par l'ordre de la
 * liste : renommer un fichier suffit à corriger une erreur, et une photo
 * absente rend `undefined` plutôt que de décaler les suivantes.
 *
 * `quoi` ne sert qu'à nommer la source dans l'avertissement, pour que le
 * message dise quel dossier ranger.
 */
function photoNamed(
  gallery: Gallery | undefined,
  name: string,
  quoi: { sujet: string; dossier: string },
): { gallery: string; photo: Photo } | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted || !gallery) return undefined;

  const found = gallery.photos.filter(
    (p) => (p.source ?? '').toLowerCase().replace(/\.[^.]+$/, '') === wanted,
  );
  // Deux fichiers de même nom et d'extensions différentes se disputeraient la
  // place en silence, et c'est l'ordre alphabétique qui trancherait. Mieux vaut
  // le dire à la construction que de laisser une photo changer toute seule.
  if (found.length > 1) {
    const noms = found.map((p) => p.source).join(', ');
    console.warn(`[${quoi.sujet}] « ${name} » a ${found.length} images (${noms}) ; ${found[0].source} est retenu. Supprime les autres de ${quoi.dossier}.`);
  }
  return found[0] ? { gallery: gallery.slug, photo: found[0] } : undefined;
}

/**
 * Le portrait d'un membre, retrouvé par le nom de son fichier source.
 *
 * Un portrait absent rend `undefined` et la page bio affiche un cadre
 * d'attente, sans décaler les autres membres.
 */
export const memberPhoto = (name: string) =>
  photoNamed(memberPhotos, name, { sujet: 'membres', dossier: 'photos/membres/' });

/**
 * Les visuels d'un article, dans l'ordre d'affichage.
 *
 * Un article peut être montré sous plusieurs angles : le fichier principal
 * porte le nom de l'article, les suivants y ajoutent `-2`, `-3`… Déposer
 * `mug.jpg`, `mug-2.jpg` et `mug-3.jpg` suffit donc à obtenir trois vues, sans
 * rien changer à la description de l'article.
 *
 * Le suffixe doit être un nombre : un article nommé `mug-special` reste bien
 * un article à part, et n'est pas avalé comme une vue de `mug`.
 *
 * Liste vide si rien n'a été déposé — la page affiche alors un cadre d'attente.
 */
export function merchPhotoSet(name: string): { gallery: string; photo: Photo }[] {
  const wanted = name.trim().toLowerCase();
  if (!wanted || !merchPhotos) return [];

  const rangs = new Map<number, Photo>();
  for (const photo of merchPhotos.photos) {
    const base = (photo.source ?? '').toLowerCase().replace(/\.[^.]+$/, '');
    if (base === wanted) { rangs.set(1, rangs.get(1) ?? photo); continue; }
    const suite = base.startsWith(`${wanted}-`) ? base.slice(wanted.length + 1) : '';
    if (/^\d+$/.test(suite)) {
      const n = Number(suite);
      if (n > 1 && !rangs.has(n)) rangs.set(n, photo);
    }
  }
  return [...rangs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, photo]) => ({ gallery: merchPhotos!.slug, photo }));
}

/** Le visuel principal d'un article. Raccourci sur `merchPhotoSet`. */
export const merchPhoto = (name: string) => merchPhotoSet(name)[0];

/**
 * L'affiche d'un concert, retrouvée par l'identifiant de la date.
 *
 * Le fichier porte le nom du concert tel que l'agenda le calcule
 * (`2026-09-24_ladies-rock.jpg`), le même que son dossier de photos : il n'y a
 * donc pas de second identifiant à tenir à jour. Une date sans affiche rend
 * `undefined` et s'affiche comme avant.
 */
export const posterFor = (showSlug: string) =>
  photoNamed(posterPhotos, showSlug, { sujet: 'affiches', dossier: 'photos/affiches/' });

/**
 * Adresse complète d'une image, pour les endroits qui ne tolèrent pas un
 * chemin relatif : données structurées et flux RSS, lus hors du site.
 */
export const absoluteSrc = (gallerySlug: string, id: string, w: number, domain: string) => {
  const path = src(gallerySlug, id, w);
  return /^https?:\/\//i.test(path) ? path : `${domain.replace(/\/+$/, '')}${path}`;
};

export const galleryFor = (showSlug: string) => concertGalleries.find((g) => g.slug === showSlug);

/** Les N photos les plus récentes, toutes galeries confondues. */
export function latestPhotos(limit: number) {
  const out: { gallery: string; photo: Photo }[] = [];
  for (const g of concertGalleries) {
    for (const photo of g.photos) {
      out.push({ gallery: g.slug, photo });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
