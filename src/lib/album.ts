import data from '../data/album.json';

export type Cover = { widths: number[]; w: number; h: number } | null;
export type Booklet = { file: string; bytes: number } | null;
export type Track = {
  /** Numéro affiché, repris du nom de fichier. 0 désigne une intro. */
  n: number;
  intro: boolean;
  file: string;
  title: string;
  bytes: number;
  type: string;
};

export const cover = (data.cover ?? null) as Cover;
export const booklet = (data.booklet ?? null) as Booklet;
/** L'album en un seul fichier, pour le téléchargement intégral. */
export const fullAlbum = (data.full ?? null) as { file: string; bytes: number } | null;
export const tracks: Track[] = (data.tracks as Track[]) ?? [];

export const coverSrc = (w: number) => `/album/cover/${w}.webp`;
export const coverSrcset = () => (cover?.widths ?? []).map((w) => `${coverSrc(w)} ${w}w`).join(', ');
export const trackSrc = (file: string) => `/album/audio/${encodeURIComponent(file)}`;
export const bookletHref = booklet ? `/album/${booklet.file}` : null;
export const fullAlbumHref = fullAlbum ? `/album/${encodeURIComponent(fullAlbum.file)}` : null;

/** Poids lisible, pour prévenir avant un téléchargement. */
export function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** « 01 » pour une piste numérotée, « Intro » pour une ouverture. */
export const trackLabel = (track: Track) =>
  track.intro ? 'Intro' : String(track.n).padStart(2, '0');
