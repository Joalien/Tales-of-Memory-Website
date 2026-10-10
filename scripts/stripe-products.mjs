/**
 * Crée (ou met à jour) les produits de la boutique dans Stripe.
 *
 *   node scripts/stripe-products.mjs
 *
 * POURQUOI DES PRODUITS, ALORS QUE LA CAISSE N'EN A PAS BESOIN. Le Worker sait
 * ouvrir une session sans eux, en envoyant le libellé à la volée. Mais Stripe
 * regroupe alors ses rapports par chaîne de caractères : le jour où « T-shirt
 * Letter » devient « T-shirt Letter (noir) », les ventes se coupent en deux et
 * plus rien ne se totalise. Un produit donne une identité stable à l'article.
 *
 * L'IDENTIFIANT STRIPE EST LE SKU. C'est volontaire : un `prod_…` engendré par
 * Stripe serait différent en bac à sable et en production, et il aurait fallu
 * le stocker quelque part, par mode. En imposant l'identifiant, le même sku
 * désigne le même article partout, et le Worker n'a rien à mémoriser.
 *
 * UN PRODUIT PAR TAILLE, et non un par article. Quand une session référence un
 * produit, Stripe affiche LE NOM DU PRODUIT sur la page de paiement : avec un
 * seul produit « T-shirt Letter », l'acheteur ne verrait plus la taille qu'il
 * vient de choisir, et le groupe ne la verrait pas davantage sur la ligne de
 * commande. Les variantes font donc « tshirt-letter-L », et le bénéfice est
 * double : la taille reste lisible partout, et les rapports disent enfin
 * quelles tailles partent — ce qu'on veut savoir pour recommander.
 *
 * LE PRIX N'EST PAS ENVOYÉ ICI, ET C'EST LE POINT ESSENTIEL. Stripe ne connaît
 * que le nom et la description ; le montant reste dans `site.ts` et part à
 * chaque session. Créer aussi des Prices donnerait deux sources au même
 * montant, qui divergeraient un jour — et c'est le prix affiché sur la page
 * qui engage le vendeur, pas celui de Stripe.
 *
 * À RELANCER EN MODE PRODUCTION le jour de l'ouverture : les produits d'un
 * mode n'existent pas dans l'autre.
 */

import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

/** La clé, prise dans l'environnement ou dans .dev.vars. */
function key() {
  if (process.env.STRIPE_SECRET_KEY?.trim()) return process.env.STRIPE_SECRET_KEY.trim();
  try {
    const ligne = readFileSync('.dev.vars', 'utf8')
      .split('\n')
      .find((l) => l.startsWith('STRIPE_SECRET_KEY='));
    return ligne?.slice('STRIPE_SECRET_KEY='.length).trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * `site.ts` lu tel quel.
 *
 * Node n'exécute pas le TypeScript sur ce poste, et analyser la source à
 * l'expression régulière casserait au premier commentaire déplacé. esbuild le
 * transpile en un fichier temporaire, qu'on importe normalement.
 */
async function catalogue() {
  const out = join(tmpdir(), `site-${process.pid}.mjs`);
  await build({
    entryPoints: ['src/data/site.ts'],
    outfile: out,
    format: 'esm',
    bundle: false,
    logLevel: 'silent',
  });
  try {
    const { site } = await import(`file://${out}`);
    return site;
  } finally {
    rmSync(out, { force: true });
  }
}

/** Appel d'API, en formulaire encodé comme Stripe l'attend. */
async function stripe(k, chemin, champs, methode = 'POST') {
  const corps = new URLSearchParams();
  for (const [c, v] of Object.entries(champs ?? {})) {
    if (v !== undefined && v !== null && v !== '') corps.set(c, String(v));
  }
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: methode,
    headers: {
      Authorization: `Basic ${Buffer.from(`${k}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: methode === 'GET' ? undefined : corps,
  });
  return { ok: r.ok, data: await r.json() };
}

const k = key();
if (!k) {
  console.error('Aucune clé. Renseigne STRIPE_SECRET_KEY, ou .dev.vars (voir .dev.vars.example).');
  process.exit(1);
}

const mode = k.startsWith('sk_live_') ? 'PRODUCTION' : 'bac à sable';
if (mode === 'PRODUCTION') {
  console.log('\n  ⚠  Clé de PRODUCTION. Les produits créés seront ceux que verront');
  console.log('     les vrais acheteurs. Les prix, eux, restent dans site.ts.\n');
}

const site = await catalogue();

/**
 * Un article sans taille donne un produit ; un article à tailles en donne un
 * par taille. Le libellé reprend exactement celui que le Worker enverrait,
 * pour que la page de paiement dise la même chose dans les deux cas.
 */
const variantes = site.merch
  .filter((a) => a.cents > 0)
  .flatMap((a) =>
    a.sizes.length > 0
      ? a.sizes.map((taille) => ({
          id: `${a.sku}-${taille}`,
          name: `${a.name} — taille ${taille}`,
          taille,
          article: a,
        }))
      : [{ id: a.sku, name: a.name, taille: '', article: a }],
  );

console.log(`Synchronisation de ${variantes.length} référence(s) — mode ${mode}.\n`);

let crees = 0;
let majs = 0;

for (const v of variantes) {
  const a = v.article;
  const champs = {
    name: v.name,
    description: a.text,
    // Des objets physiques : Stripe adapte ses formulaires et ses rapports.
    shippable: 'true',
    'metadata[sku]': a.sku,
    'metadata[kind]': a.kind,
    'metadata[taille]': v.taille,
  };

  // D'abord créer, en imposant l'identifiant. Si l'article existe déjà, Stripe
  // refuse et l'on bascule en mise à jour : le script est ainsi rejouable sans
  // dégât, ce qui est la seule façon d'en faire une étape de routine.
  let r = await stripe(k, 'products', { id: v.id, ...champs });

  if (r.ok) {
    crees++;
    console.log(`  créé    ${v.id.padEnd(30)} ${v.name}`);
    continue;
  }

  if (r.data?.error?.code === 'resource_already_exists') {
    r = await stripe(k, `products/${v.id}`, champs);
    if (r.ok) {
      majs++;
      console.log(`  à jour  ${v.id.padEnd(30)} ${v.name}`);
      continue;
    }
  }

  console.error(`  ÉCHEC   ${v.id.padEnd(30)} ${r.data?.error?.message ?? 'erreur inconnue'}`);
  process.exitCode = 1;
}

console.log(`\n${crees} créé(s), ${majs} mis à jour.`);
if (mode === 'bac à sable') {
  console.log('Pense à relancer ce script avec la clé de production avant l’ouverture.');
}
