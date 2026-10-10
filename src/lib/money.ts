/**
 * L'argent, compté en centimes.
 *
 * Un prix ne doit jamais être un flottant — 0,1 + 0,2 ne fait pas 0,3 en
 * binaire — ni une chaîne comme « 12 € », qu'il faudrait reparser pour
 * encaisser. Le catalogue porte donc des entiers de centimes, et l'affichage
 * se dérive d'eux. C'est la même valeur qui s'écrit sur la fiche et qui part
 * chez Stripe : un prix annoncé est opposable au vendeur, et deux sources
 * finissent toujours par diverger.
 */

/** « 12 € », « 4,90 € » — les centimes ne s'écrivent que s'il y en a. */
export const euros = (cents: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
