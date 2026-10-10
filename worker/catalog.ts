import { site } from '../src/data/site';

/**
 * Le catalogue tel que la caisse le connaît.
 *
 * RÈGLE UNIQUE DE CE FICHIER : le formulaire ne dit que *ce que* l'acheteur
 * veut, jamais *combien* cela coûte. Quantités et tailles arrivent du
 * navigateur et sont donc suspectes ; le prix, lui, est relu ici dans
 * `site.merch`. Un champ de prix caché dans la page serait modifiable en trois
 * clics, et on vendrait l'album à un centime.
 *
 * C'est le même fichier `site.ts` qui alimente l'affichage et cette
 * vérification : la fiche ne peut pas annoncer un prix que la caisse ignore.
 */

export type Line = {
  sku: string;
  name: string;
  /** Taille choisie, pour les articles qui en ont. */
  size: string | null;
  qty: number;
  /** Prix unitaire en centimes, relu dans le catalogue. */
  cents: number;
};

export type CartError = 'vide' | 'taille' | 'invalide' | 'plafond';

export type Cart =
  | { ok: true; lines: Line[]; total: number }
  | { ok: false; error: CartError };

/** Plafond de panier, en centimes. Au-delà, c'est une erreur ou un abus. */
const MAX_TOTAL = 100_000;

const catalogue = new Map(site.merch.map((item) => [item.sku, item]));

/**
 * Lit le formulaire de /merch.
 *
 * Les champs s'appellent `qte:<sku>` et `taille:<sku>`. Un sku inconnu, une
 * quantité non entière, une taille qui n'existe pas pour l'article : tout cela
 * est refusé plutôt que corrigé en silence. Une commande qu'on ne comprend pas
 * ne doit pas être encaissée à l'approximation.
 */
export function readCart(form: FormData): Cart {
  const lines: Line[] = [];

  for (const [field, raw] of form.entries()) {
    if (!field.startsWith('qte:')) continue;

    const sku = field.slice(4);
    const item = catalogue.get(sku);
    if (!item) return { ok: false, error: 'invalide' };

    // Zéro est la valeur par défaut de chaque sélecteur : l'article n'est pas
    // commandé, ce n'est pas une erreur.
    const qty = Number(String(raw).trim());
    if (!Number.isInteger(qty) || qty < 0) return { ok: false, error: 'invalide' };
    if (qty === 0) continue;
    if (qty > site.shop.maxPerItem) return { ok: false, error: 'invalide' };

    // Un article sans prix n'est pas vendable, même si quelqu'un forge le champ.
    if (item.cents <= 0) return { ok: false, error: 'invalide' };

    let size: string | null = null;
    if (item.sizes.length > 0) {
      const chosen = String(form.get(`taille:${sku}`) ?? '').trim();
      // Faute de JavaScript, le formulaire ne peut pas exiger une taille
      // seulement pour les articles réellement commandés : le sélecteur part
      // donc vide, et l'oubli se rattrape ici. Cas distingué de « invalide »
      // pour que la page puisse dire « choisissez une taille » plutôt que de
      // laisser croire à une panne.
      if (chosen === '') return { ok: false, error: 'taille' };
      if (!item.sizes.includes(chosen as never)) return { ok: false, error: 'invalide' };
      size = chosen;
    }

    lines.push({ sku, name: item.name, size, qty, cents: item.cents });
  }

  if (lines.length === 0) return { ok: false, error: 'vide' };

  const total = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
  if (total > MAX_TOTAL) return { ok: false, error: 'plafond' };

  return { ok: true, lines, total };
}

/**
 * Le panier en une ligne, pour la métadonnée Stripe et l'enregistrement de la
 * commande : « cd-forgotten-chapters×1 ; tshirt-letter (L)×2 ».
 *
 * C'est ce qu'on relira six mois plus tard pour savoir ce qui est parti, sans
 * avoir à recroiser quoi que ce soit. Stripe plafonne une métadonnée à 500
 * caractères, d'où la troncature.
 */
export const summarize = (lines: Line[]): string =>
  lines
    .map((l) => `${l.sku}${l.size ? ` (${l.size})` : ''}×${l.qty}`)
    .join(' ; ')
    .slice(0, 500);
