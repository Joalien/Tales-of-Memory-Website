import data from '../data/photos.json';

export type Photo = { id: string; w: number; h: number; credit?: string };
export type GalleryKind = 'concert' | 'press' | 'unsorted';
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

/** Photos promo, utilisables pour la page bio et le dossier de presse. */
export const pressPhotos: Gallery | undefined = galleries.find((g) => g.kind === 'press');

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
