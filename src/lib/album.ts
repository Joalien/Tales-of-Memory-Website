import data from '../data/album.json';

export type Cover = { widths: number[]; w: number; h: number } | null;
export type Booklet = { file: string; bytes: number; v?: string } | null;
export type Track = {
  /** Numéro affiché, repris du nom de fichier. 0 désigne une intro. */
  n: number;
  intro: boolean;
  file: string;
  title: string;
  bytes: number;
  type: string;
  /** Empreinte du contenu, pour invalider le cache. */
  v?: string;
};

export const cover = (data.cover ?? null) as Cover;
export const booklet = (data.booklet ?? null) as Booklet;
/** L'album en un seul fichier, pour le téléchargement intégral. */
export const fullAlbum = (data.full ?? null) as { file: string; bytes: number; v?: string } | null;
export const tracks: Track[] = (data.tracks as Track[]) ?? [];

/**
 * Base publique des fichiers lourds.
 *
 * Vide, ils sont servis depuis le déploiement — pratique en local. Renseignée,
 * ils viennent de R2, seul moyen de proposer l'album complet : Workers refuse
 * tout fichier de plus de 25 Mio, et celui-ci en pèse 69.
 *
 * La pochette, elle, reste toujours dans le déploiement : elle est légère et
 * c'est la première image affichée.
 */
const mediaBase = (import.meta.env.MEDIA_BASE_URL ?? '').trim().replace(/\/+$/, '');

const mediaUrl = (relative: string, version?: string) => {
  const encoded = relative.split('/').map(encodeURIComponent).join('/');
  if (!mediaBase) return `/album/${encoded}`;
  // L'empreinte du contenu dans l'URL : un fichier remplacé change d'adresse,
  // donc le cache de bordure ne peut pas servir une version périmée.
  return `${mediaBase}/album/${encoded}${version ? `?v=${version}` : ''}`;
};

export const coverSrc = (w: number) => `/album/cover/${w}.webp`;
export const coverSrcset = () => (cover?.widths ?? []).map((w) => `${coverSrc(w)} ${w}w`).join(', ');
export const trackSrc = (track: Track) => mediaUrl(`audio/${track.file}`, track.v);
export const bookletHref = booklet ? mediaUrl(booklet.file, booklet.v) : null;
export const fullAlbumHref = fullAlbum ? mediaUrl(fullAlbum.file, fullAlbum.v) : null;

/** Poids lisible, pour prévenir avant un téléchargement. */
export function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** « 01 » pour une piste numérotée, « Intro » pour une ouverture. */
export const trackLabel = (track: Track) =>
  track.intro ? 'Intro' : String(track.n).padStart(2, '0');
