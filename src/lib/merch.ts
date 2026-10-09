import { site } from '../data/site';
import { merchPhotoSet, src, srcset } from './photos';
import { cover, coverSrc, coverSrcset } from './album';

/**
 * Les articles de la boutique, prêts à afficher.
 *
 * Toute la logique « où achète-t-on, et avec quelle image » est résolue ici
 * pour que la page reste une mise en page. Rien n'est jamais obligatoire : un
 * article sans visuel, sans prix ou sans lien d'achat s'affiche quand même,
 * simplement moins complet.
 */

export type MerchItem = {
  name: string;
  kind: string;
  price: string;
  text: string;
  sizes: readonly string[];
  /** Lien d'achat retenu : celui de l'article, sinon celui de la boutique. */
  href: string | null;
  /** Vues de l'article, dans l'ordre. Vide tant qu'aucun fichier n'est déposé. */
  images: { src: string; srcset: string; w: number; h: number }[];
};

/** La boutique est-elle réellement ouverte ? */
export const shopUrl: string = site.shop.url.trim();
export const shopOpen: boolean = shopUrl.length > 0;

/**
 * Nom de la plateforme pour le bouton, afin qu'on sache où l'on va avant de
 * cliquer. Non renseigné, on retombe sur le domaine du lien — « bandcamp.com »
 * dit déjà l'essentiel — et à défaut sur une formule neutre.
 */
export const shopPlatform: string =
  site.shop.platform.trim() ||
  (() => {
    try {
      return new URL(shopUrl).hostname.replace(/^www\./, '');
    } catch {
      return 'la boutique';
    }
  })();

/**
 * La pochette de l'album, pour les articles marqués `album: true`.
 *
 * Elle est toujours servie depuis le déploiement, jamais depuis R2 : c'est la
 * seule image de la boutique dont on est certain qu'elle existe.
 */
const albumImage = cover
  ? [{ src: coverSrc(800), srcset: coverSrcset(), w: cover.w, h: cover.h }]
  : [];

export const items: MerchItem[] = site.merch.map((item) => {
  const own = item.url.trim();
  const found = item.photo ? merchPhotoSet(item.photo) : [];

  return {
    name: item.name,
    kind: item.kind,
    price: item.price.trim(),
    text: item.text,
    sizes: item.sizes,
    // Le lien propre à l'article d'abord : une plateforme qui donne une adresse
    // par produit vaut mieux qu'un renvoi vers l'accueil de la boutique.
    href: own || (shopOpen ? shopUrl : null),
    images: item.album
      ? albumImage
      : found.map(({ gallery, photo }) => ({
          src: src(gallery, photo.id, 800),
          srcset: srcset(gallery, photo.id),
          w: photo.w,
          h: photo.h,
        })),
  };
});
