import Stripe from 'stripe';
import { site } from '../src/data/site';
import { readCart, summarize, type Line } from './catalog';

/**
 * La caisse.
 *
 * Le site reste entièrement statique : ce Worker ne sert que `/api/*`, tout le
 * reste passe directement par les fichiers produits par Astro (voir
 * `run_worker_first` dans wrangler.jsonc). Le paiement lui-même se déroule sur
 * checkout.stripe.com, où l'on redirige l'acheteur — aucun script de Stripe
 * n'est chargé par le site, ce qui est exactement ce qui lui permet de
 * n'avoir ni cookie ni bandeau de consentement.
 *
 * CE QUI N'EST PAS FAIT ICI, ET POURQUOI : aucune commande n'est recopiée dans
 * un stockage à nous. Stripe détient déjà la commande, le nom et l'adresse de
 * livraison, et son tableau de bord est l'endroit où le groupe les lit pour
 * expédier. En garder une seconde copie créerait un second fichier de données
 * personnelles à sécuriser, à purger et à déclarer, sans rien apporter. Le
 * webhook ci-dessous ne journalise donc que le strict nécessaire au dépannage,
 * sans nom ni adresse.
 */

/**
 * Les quelques types de la plateforme Workers dont on a besoin, déclarés ici
 * plutôt qu'importés de `@cloudflare/workers-types` : ce paquet redéfinit
 * `Response`, `Request` et `fetch` d'une manière qui entre en conflit avec les
 * types du DOM, dont tout le reste du site dépend.
 */
type Fetcher = { fetch(request: Request): Promise<Response> };

export type Env = {
  /** Les fichiers statiques du site, liés par wrangler.jsonc. */
  ASSETS: Fetcher;
  /** Clé secrète Stripe. `sk_test_…` en bac à sable, `sk_live_…` en production. */
  STRIPE_SECRET_KEY?: string;
  /** Secret de signature du webhook, `whsec_…`. */
  STRIPE_WEBHOOK_SECRET?: string;
  /** Garde-fou : « true » autorise une clé de production. Voir `refuseLive`. */
  SHOP_LIVE?: string;
  /** « true » exige la case d'acceptation des CGV. Voir le README. */
  STRIPE_TOS_CONSENT?: string;
};

/**
 * Stripe, côté Workers.
 *
 * Aucun `httpClient` ni `cryptoProvider` à passer : en v23, la variante
 * `workerd` du paquet installe d'office le client `fetch` et le fournisseur
 * SubtleCrypto. Les exemples qui passent `Stripe.createFetchHttpClient()`
 * datent d'avant — c'est désormais superflu, pas faux.
 *
 * La version d'API est épinglée pour que Stripe ne change pas la forme des
 * réponses sous nos pieds : une montée de version doit être un acte délibéré,
 * relu, pas un matin où la caisse répond autrement.
 */
const client = (key: string) =>
  new Stripe(key, { apiVersion: '2026-09-30.endive' });

/**
 * Retour vers la boutique, ancre à l'appui.
 *
 * Le formulaire de /merch fonctionne sans JavaScript : les erreurs ne peuvent
 * donc pas s'afficher par script. La page porte des messages masqués que le
 * fragment révèle en CSS (`:target`), et il suffit de renvoyer l'acheteur sur
 * la bonne ancre. Pas de page d'erreur nue, pas de 500 au visage.
 */
const back = (origin: string, anchor: string) =>
  new Response(null, { status: 303, headers: { Location: `${origin}/merch#${anchor}` } });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * Refuse-t-on cette clé ?
 *
 * Les frais de port de `site.shop.shipping` sont encore des valeurs d'essai et
 * plusieurs mentions légales restent à remplir. Tant que le groupe n'a pas
 * explicitement posé SHOP_LIVE=true, une clé de production est traitée comme
 * une erreur de configuration : mieux vaut une boutique qui refuse de vendre
 * qu'une boutique qui encaisse de vrais paiements sur des tarifs faux.
 */
const refuseLive = (key: string, env: Env) =>
  key.startsWith('sk_live_') && env.SHOP_LIVE !== 'true';

/**
 * Le produit Stripe correspondant à une ligne : un par taille.
 *
 * Référencer un produit plutôt que de décrire l'article à la volée donne à
 * Stripe une identité stable, et donc des rapports qui se totalisent d'une
 * saison à l'autre même si l'on renomme l'article. Les produits sont créés
 * par `npm run stripe:produits`, qui impose ces identifiants.
 */
const produit = (line: Line) => (line.size ? `${line.sku}-${line.size}` : line.sku);

/** Le libellé affiché. Identique au nom du produit Stripe, volontairement. */
const libelle = (line: Line) => (line.size ? `${line.name} — taille ${line.size}` : line.name);

/**
 * Les lignes de la session.
 *
 * `avecProduits` à faux décrit chaque article à la volée, sans rien référencer.
 * C'est le repli quand les produits n'existent pas dans le mode Stripe courant
 * — un passage en production où le script de synchronisation a été oublié. La
 * vente se fait quand même, seuls les rapports y perdent.
 *
 * Dans les deux cas le montant vient de `line.cents`, relu dans le catalogue.
 */
const lignes = (lines: Line[], avecProduits: boolean) =>
  lines.map((line) => ({
    quantity: line.qty,
    price_data: {
      currency: 'eur' as const,
      unit_amount: line.cents,
      ...(avecProduits
        ? { product: produit(line) }
        : {
            product_data: {
              name: libelle(line),
              metadata: { sku: line.sku, ...(line.size ? { taille: line.size } : {}) },
            },
          }),
    },
  }));

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { origin, pathname } = url;

    if (pathname === '/api/commande' && request.method === 'POST') {
      return commander(request, env, origin);
    }
    if (pathname === '/api/commande' && request.method === 'GET') {
      return recapituler(url, env);
    }
    if (pathname === '/api/stripe/webhook' && request.method === 'POST') {
      return webhook(request, env);
    }

    // `run_worker_first` ne dirige ici que /api/* : une autre adresse signifie
    // que la configuration a bougé. On repasse la main aux fichiers statiques
    // plutôt que de répondre à côté.
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    return json({ erreur: 'adresse inconnue' }, 404);
  },
};

/** POST /api/commande — ouvre une session de paiement et y redirige. */
async function commander(request: Request, env: Env, origin: string): Promise<Response> {
  // Une boutique externe renseignée a la priorité : la commande directe est
  // alors fermée, et ce point d'entrée ne doit pas la contourner.
  if (!site.shop.checkout || site.shop.url.trim().length > 0) {
    return back(origin, 'erreur-caisse');
  }

  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error('STRIPE_SECRET_KEY absente : la caisse ne peut pas ouvrir.');
    return back(origin, 'erreur-caisse');
  }
  if (refuseLive(key, env)) {
    console.error(
      'Clé sk_live_ refusée : SHOP_LIVE ne vaut pas « true ». ' +
        'Les frais de port et les mentions légales doivent être validés avant ouverture.',
    );
    return back(origin, 'erreur-caisse');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(origin, 'erreur-vide');
  }

  const cart = readCart(form);
  if (!cart.ok) {
    // « vide » et « taille » sont les deux oublis ordinaires, et la page leur
    // répond précisément. « invalide » et « plafond » supposent un formulaire
    // forgé ou un catalogue modifié sous un onglet resté ouvert la semaine
    // dernière : un seul message les couvre, inutile d'en dire plus.
    return back(origin, `erreur-${cart.error === 'plafond' || cart.error === 'invalide' ? 'panier' : cart.error}`);
  }

  const stripe = client(key);
  const tos = env.STRIPE_TOS_CONSENT === 'true';

  const parametres = (avecProduits: boolean): Stripe.Checkout.SessionCreateParams => ({
      mode: 'payment',
      locale: 'fr',

      // Le montant vient toujours du catalogue, jamais du formulaire.
      line_items: lignes(cart.lines, avecProduits),

      shipping_address_collection: {
        allowed_countries: [...site.shop.countries] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection['allowed_countries'],
      },
      shipping_options: site.shop.shipping.map((rate) => ({
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: rate.cents, currency: 'eur' },
          display_name: rate.label,
          delivery_estimate: {
            minimum: { unit: 'business_day', value: rate.days[0] },
            maximum: { unit: 'business_day', value: rate.days[1] },
          },
        },
      })),

      // Le panier, relisible d'un coup d'œil dans le tableau de bord.
      metadata: { panier: summarize(cart.lines) },

      custom_text: {
        // L'exonération doit être portée à la connaissance de l'acheteur avant
        // le paiement, pas seulement sur la page des conditions de vente.
        ...(site.legal.vatExempt
          ? { submit: { message: 'TVA non applicable, article 293 B du code général des impôts.' } }
          : {}),
        ...(tos
          ? {
              terms_of_service_acceptance: {
                message: 'J’accepte les conditions de vente et je renonce à mon droit de rétractation sur les fichiers téléchargeables.',
              },
            }
          : {}),
      },
      ...(tos ? { consent_collection: { terms_of_service: 'required' as const } } : {}),

      success_url: `${origin}/merch/merci?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/merch#commande`,
  });

  try {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(parametres(true));
    } catch (error) {
      // Les produits d'un mode n'existent pas dans l'autre. Plutôt que de
      // refuser la vente, on retombe sur les libellés à la volée et on le dit
      // fort dans les journaux : une boutique qui vend mal vaut mieux qu'une
      // boutique qui ne vend pas.
      if (!(error instanceof Stripe.errors.StripeInvalidRequestError) || error.code !== 'resource_missing') {
        throw error;
      }
      console.error(
        'Produits Stripe absents dans ce mode : repli sur les libellés à la volée. ' +
          'Lance « npm run stripe:produits » avec la clé de ce mode pour rétablir les rapports.',
      );
      session = await stripe.checkout.sessions.create(parametres(false));
    }

    if (!session.url) {
      console.error('Session créée sans URL de paiement :', session.id);
      return back(origin, 'erreur-caisse');
    }

    return new Response(null, { status: 303, headers: { Location: session.url } });
  } catch (error) {
    // Clé révoquée, compte suspendu, Stripe injoignable : l'acheteur n'a pas à
    // lire une trace d'exception. Il revient sur la boutique avec un message
    // et une adresse pour nous écrire.
    console.error('Création de la session de paiement refusée :', error);
    return back(origin, 'erreur-caisse');
  }
}

/**
 * GET /api/commande?session=cs_… — ce qui vient d'être commandé.
 *
 * Sert la page de remerciement, qui est statique et ne peut donc rien savoir
 * de la commande par elle-même.
 *
 * Ne renvoie NI nom, NI adresse, NI courriel, bien que la session les
 * contienne : un identifiant de session voyage dans une URL, donc dans les
 * journaux, les historiques et les presse-papiers. Les articles et le montant
 * suffisent à rassurer celui qui vient de payer.
 */
async function recapituler(url: URL, env: Env): Promise<Response> {
  const id = url.searchParams.get('session')?.trim() ?? '';
  // Un identifiant de session Stripe commence toujours ainsi : on écarte les
  // valeurs fantaisistes sans consommer un appel d'API.
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ erreur: 'session invalide' }, 400);

  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) return json({ erreur: 'caisse non configurée' }, 503);
  if (refuseLive(key, env)) return json({ erreur: 'caisse non configurée' }, 503);

  try {
    const session = await client(key).checkout.sessions.retrieve(id, {
      expand: ['line_items'],
    });

    return json({
      payee: session.payment_status === 'paid',
      total: session.amount_total,
      devise: session.currency,
      articles: (session.line_items?.data ?? []).map((l) => ({
        libelle: l.description,
        quantite: l.quantity,
        montant: l.amount_total,
      })),
    });
  } catch (error) {
    console.error('Session introuvable :', id, error);
    return json({ erreur: 'session introuvable' }, 404);
  }
}

/**
 * POST /api/stripe/webhook — la seule preuve fiable qu'un paiement a abouti.
 *
 * `success_url` ne prouve rien : l'acheteur peut fermer l'onglet avant d'y
 * arriver, ou l'ouvrir sans avoir payé. Stripe, lui, appelle ce point d'entrée
 * quoi qu'il advienne — c'est donc ici qu'une commande devient réelle.
 *
 * Aujourd'hui cela se limite à journaliser : l'expédition se prépare depuis le
 * tableau de bord Stripe, qui détient déjà la commande et l'adresse. C'est
 * aussi l'endroit tout prêt où brancher un courriel au groupe le jour où l'on
 * en voudra un.
 */
async function webhook(request: Request, env: Env): Promise<Response> {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  const key = env.STRIPE_SECRET_KEY?.trim();
  const signature = request.headers.get('stripe-signature');

  if (!secret || !key) {
    console.error('Webhook reçu sans configuration : clé ou secret de signature absent.');
    return json({ erreur: 'webhook non configuré' }, 503);
  }
  if (!signature) return json({ erreur: 'signature absente' }, 400);

  // Le corps brut, et non l'objet déjà analysé : la signature porte sur les
  // octets reçus. Le moindre reformatage la casse.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    // La variante asynchrone est obligatoire ici : SubtleCrypto ne sait pas
    // vérifier une signature de façon synchrone.
    event = await client(key).webhooks.constructEventAsync(body, signature, secret);
  } catch (error) {
    // Sans cette vérification, n'importe qui pourrait annoncer un paiement.
    console.error('Signature de webhook rejetée :', error);
    return json({ erreur: 'signature invalide' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object;
      console.log(
        `Commande payée — ${s.id} — ${(s.amount_total ?? 0) / 100} ${s.currency?.toUpperCase()} — ${s.metadata?.panier ?? 'panier inconnu'}`,
      );
      break;
    }
    case 'checkout.session.async_payment_failed': {
      // Virement ou prélèvement refusé après coup : rien n'est dû, mais le
      // groupe doit savoir qu'une commande vue comme passée ne le sera pas.
      const s = event.data.object;
      console.warn(`Paiement différé échoué — ${s.id} — ${s.metadata?.panier ?? ''}`);
      break;
    }
    case 'checkout.session.expired':
      break;
    default:
      // Stripe envoie ce à quoi l'on s'est abonné, et parfois davantage. Un
      // événement inconnu n'est pas une erreur : on l'acquitte.
      break;
  }

  // Toujours 200 après vérification : un autre code fait réessayer Stripe, et
  // un échec de notre côté ne doit pas être interprété comme un doute sur le
  // paiement.
  return json({ recu: true });
}

export type { Line };
