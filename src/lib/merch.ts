import { site } from '../data/site';
import { merchPhotoSet, src, srcset } from './photos';
import { cover, coverSrc, coverSrcset } from './album';
import { euros } from './money';

/**
 * Les articles de la boutique, prêts à afficher.
 *
 * Toute la logique « où achète-t-on, à quel prix et avec quelle image » est
 * résolue ici pour que la page reste une mise en page. Rien n'est jamais
 * obligatoire : un article sans visuel, sans prix ou sans lien d'achat
 * s'affiche quand même, simplement moins complet.
 */

export type MerchItem = {
  /** Identifiant stable, repris dans la commande Stripe et son enregistrement. */
  sku: string;
  name: string;
  kind: string;
  /** Prix en centimes, source unique du montant. 0 = pas de prix connu. */
  cents: number;
  /** Le même prix, tel qu'il s'écrit sur la fiche. Vide si `cents` vaut 0. */
  price: string;
  text: string;
  sizes: readonly string[];
  /** Lien d'achat externe : celui de l'article, sinon celui de la boutique. */
  href: string | null;
  /** Vues de l'article, dans l'ordre. Vide tant qu'aucun fichier n'est déposé. */
  images: { src: string; srcset: string; w: number; h: number }[];
};

/**
 * Trois états possibles, et un seul à la fois.
 *
 * Une boutique externe renseignée gagne contre la commande directe : on ne
 * tient pas deux caisses pour le même article, sous peine de vendre deux fois
 * le dernier t-shirt. Faute des deux, la page dit simplement où trouver les
 * articles — elle ne promet pas un bouton qui n'existe pas.
 */
export const shopUrl: string = site.shop.url.trim();
/** Une plateforme tierce encaisse. */
export const shopExternal: boolean = shopUrl.length > 0;
/** Le site prend la commande lui-même, Stripe encaisse. */
export const checkoutOpen: boolean = site.shop.checkout && !shopExternal;
/** La boutique vend, d'une manière ou d'une autre. Les pages légales en dépendent. */
export const shopOpen: boolean = shopExternal || checkoutOpen;

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
    sku: item.sku,
    name: item.name,
    kind: item.kind,
    cents: item.cents,
    price: item.cents > 0 ? euros(item.cents) : '',
    text: item.text,
    sizes: item.sizes,
    // Le lien propre à l'article d'abord : une plateforme qui donne une adresse
    // par produit vaut mieux qu'un renvoi vers l'accueil de la boutique.
    // En commande directe, il n'y a pas de lien : c'est le formulaire qui agit.
    href: shopExternal ? own || shopUrl : null,
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

/** Les articles réellement commandables en direct : il leur faut un prix. */
export const orderable: MerchItem[] = checkoutOpen ? items.filter((i) => i.cents > 0) : [];

/** Plafond par article, faute d'un vrai suivi de stock. */
export const maxPerItem: number = site.shop.maxPerItem;

export type ShippingRate = {
  id: string;
  label: string;
  cents: number;
  price: string;
  days: readonly [number, number];
};

export const shipping: ShippingRate[] = site.shop.shipping.map((rate) => ({
  id: rate.id,
  label: rate.label,
  cents: rate.cents,
  price: euros(rate.cents),
  days: [rate.days[0], rate.days[1]] as const,
}));

/**
 * Les frais de port en une phrase, pour les conditions de vente.
 *
 * Dérivée des tarifs réellement facturés par Stripe, et non ressaisie à côté
 * d'eux : une page qui annonce 4 € quand la caisse en prélève 6 engage le
 * vendeur sur le montant annoncé.
 */
export const shippingSummary: string = shipping
  // Zone puis montant, sans préposition : « 5,90 € vers France métropolitaine »
  // demanderait un article qui varie d'une zone à l'autre, et passer les
  // intitulés en minuscules décapitaliserait « France » et « Union européenne ».
  .map((rate) => `${rate.label} ${rate.price}`)
  .join(', ');
