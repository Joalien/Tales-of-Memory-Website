import data from '../data/photos.json';

export type Photo = { id: string; w: number; h: number; credit?: string; source?: string };
export type GalleryKind = 'concert' | 'press' | 'band' | 'member' | 'unsorted';
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

/**
 * Le portrait d'un membre, retrouvé par le nom de son fichier source.
 *
 * Le rattachement passe par le nom du fichier déposé dans `photos/membres/` et
 * non par l'ordre de la liste : un portrait absent rend `undefined` et la page
 * bio affiche un cadre d'attente, sans décaler les autres membres.
 */
export function memberPhoto(name: string): { gallery: string; photo: Photo } | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted || !memberPhotos) return undefined;

  const found = memberPhotos.photos.filter(
    (p) => (p.source ?? '').toLowerCase().replace(/\.[^.]+$/, '') === wanted,
  );
  // Deux fichiers de même nom et d'extensions différentes se disputeraient la
  // place en silence, et c'est l'ordre alphabétique qui trancherait. Mieux vaut
  // le dire à la construction que de laisser une photo changer toute seule.
  if (found.length > 1) {
    const noms = found.map((p) => p.source).join(', ');
    console.warn(`[membres] « ${name} » a ${found.length} portraits (${noms}) ; ${found[0].source} est retenu. Supprime les autres de photos/membres/.`);
  }
  return found[0] ? { gallery: memberPhotos.slug, photo: found[0] } : undefined;
}

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
