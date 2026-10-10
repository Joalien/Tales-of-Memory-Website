# Tales of Memory — site officiel

Site vitrine **statique**. Il n'y a aucun serveur applicatif à maintenir : le
site est construit en HTML, CSS et images, puis publié sur Cloudflare Pages.
Node ne sert qu'à la construction, jamais à l'exécution.

## Qui met à jour quoi

| Contenu | Qui | Où |
| --- | --- | --- |
| Dates de concert | tout le groupe | Google Agenda « Concerts » |
| Photos de concert | tout le groupe | page `/envoyer` du site *(phase 2)* |
| Affiches de concert | administrateur | `photos/affiches/` |
| Textes, bio, membres, liens | administrateur | `src/data/site.ts` |
| Articles de la boutique | administrateur | `src/data/site.ts` + `photos/merch/` |
| Identité visuelle | administrateur | `src/styles/global.css`, `public/identite/` |

Le groupe ne peut rien casser : il ajoute du contenu, il ne touche ni au gabarit
ni au style.

## Démarrer en local

```bash
npm install
npm run dev      # http://localhost:4321
```

Sans aucune configuration, le site se construit à partir de
`fixtures/concerts.ics` et d'images de démonstration générées localement. Aucun
compte, aucune clé, aucun accès réseau nécessaire.

```bash
npm run build    # produit dist/
npm run preview  # sert dist/ pour vérification
```

## L'agenda

Deux calendriers distincts sur le compte Google du groupe :

- **« Concerts »** — le seul que le site lit ;
- **« Répétitions »** — le site n'en connaît même pas l'existence.

La séparation est structurelle : aucune convention de nommage à retenir, donc
aucun risque qu'une répétition se retrouve publiée par oubli.

### Saisie d'un concert

| Champ Google Agenda | Usage |
| --- | --- |
| Titre | `Salle — Ville`, le tiret sépare les deux |
| Lieu | adresse complète, sert au lien cartographique |
| Date / heure | affichage, tri, bascule automatique en « déjà joué » |
| `billets: https://…` | bouton Billetterie |
| `prix: 15€` | affiché si présent |
| `avec: …` | première partie / plateau |
| `publier: non` | date confirmée mais gardée hors du site |

**Seules ces clés sont lues.** Tout le reste de la description — cachet, numéros
de téléphone, notes internes — est ignoré et ne peut pas se retrouver en ligne.
Un événement au statut annulé disparaît du site à la construction suivante.

Comme Google met ses flux ICS en cache, une date ajoutée peut mettre un moment à
apparaître. Le site est reconstruit plusieurs fois par jour, et le bouton
« publier maintenant » force la mise à jour le jour d'une annonce.

## Les photos

Trois niveaux, à ne pas confondre :

1. **Originaux** (`photos/`, exclu de Git) — pleine résolution, archivés en
   local, jamais publiés ;
2. **Dérivés web** — 400 / 800 / 1600 px en WebP, EXIF supprimé, stockés sur
   Cloudflare R2 ;
3. **Inventaire** — `manifest.json` maintenu dans le bucket par le Worker
   d'envoi, lu par le build en simple HTTPS.

Conséquence : **aucune clé R2 n'intervient dans la chaîne de déploiement.**

Une photo supprimée depuis le site part dans une corbeille du bucket et reste
restaurable 30 jours avant purge automatique.

## La boutique

La page `/merch` est une vitrine, et une caisse quand on le décide. Le site
reste entièrement statique : c'est un Worker Cloudflare (`worker/`) qui ouvre
une session de paiement Stripe et y redirige l'acheteur.

**Rien de Stripe n'est chargé dans la page.** Le formulaire est un formulaire
HTML qui poste vers `/api/commande` ; le Worker répond par une redirection
vers `checkout.stripe.com`. C'est ce qui permet au site de continuer à
n'embarquer aucun script tiers, aucun cookie et aucun bandeau de consentement —
ce que les mentions légales affirment noir sur blanc. Charger `Stripe.js` sur
`/merch` rendrait cette phrase fausse. La boutique fonctionne d'ailleurs sans
JavaScript du tout.

### Les articles

Ils se décrivent dans `merch` (`src/data/site.ts`), un objet par article.

| Champ | Rôle |
| --- | --- |
| `sku` | identifiant stable, repris dans la commande Stripe. **Jamais réutilisé**, même si l'article disparaît |
| `cents` | le prix en centimes, **seule** source du montant : la fiche l'affiche, Stripe l'encaisse |
| `sizes` | les tailles proposées. Non vide, le choix devient obligatoire à la commande |
| `photo` | nom du fichier déposé dans `photos/merch/`, sans extension |

Le prix n'est écrit qu'une fois. Un champ de prix caché dans la page serait
modifiable en trois clics : le Worker relit donc toujours `cents` dans le
catalogue et ignore ce que le formulaire prétend.

### Les produits côté Stripe

La caisse sait vendre sans qu'aucun produit n'existe dans Stripe : le Worker
décrit l'article à la volée. Mais Stripe regroupe alors ses rapports par
**chaîne de caractères** — renommer un article coupe ses ventes en deux, et
plus rien ne se totalise d'une saison à l'autre.

```bash
npm run stripe:produits
```

Crée un produit **par taille** : douze références pour quatre articles. Un
produit par article aurait suffi aux rapports, mais Stripe affiche le nom du
produit sur la page de paiement, et l'acheteur n'y verrait plus la taille
qu'il vient de choisir. Les variantes règlent les deux d'un coup, et les
rapports disent enfin quelles tailles partent — ce qu'on veut savoir pour
recommander.

L'identifiant Stripe **est** le sku (`tshirt-letter-L`) et non un `prod_…`
engendré par Stripe : le même identifiant désigne le même article en bac à
sable et en production, donc le Worker n'a rien à mémoriser.

Le script n'envoie **aucun prix**. Stripe ne connaît que le nom et la
description ; le montant reste dans `site.ts` et part à chaque session. Créer
aussi des Prices donnerait deux sources au même montant — et c'est le prix
affiché sur la page qui engage le vendeur.

Le script est rejouable sans dégât : il crée ce qui manque et met à jour le
reste. **À relancer avec la clé de production avant l'ouverture**, les produits
d'un mode n'existant pas dans l'autre. Si on l'oublie, la vente passe quand
même : le Worker retombe sur les libellés à la volée et écrit dans le journal
ce qu'il faut faire. Seuls les rapports en souffrent.

### Trois états

| `shop.url` | `shop.checkout` | Ce que voit le visiteur |
| --- | --- | --- |
| vide | `false` | La fiche, sans bouton, et l'adresse mail pour commander |
| vide | `true` | Le formulaire de commande et le bouton « Acheter » |
| renseignée | *indifférent* | Un bouton « Commander » vers la plateforme externe |

Une boutique externe l'emporte toujours : on ne tient pas deux caisses pour le
même article, sous peine de vendre deux fois le dernier t-shirt.

### Essayer en local

```bash
cp .dev.vars.example .dev.vars   # puis y coller la clé sk_test_ du bac à sable
npm run shop                     # construit le site et sert le tout sur :8788
```

Les clés se prennent dans Stripe > Développeurs > Clés d'API, **en mode bac à
sable**. Carte de test : `4242 4242 4242 4242`, n'importe quelle date future,
n'importe quel code.

`wrangler dev` fige la liste des fichiers au démarrage : après un `npm run
build` lancé pendant qu'il tourne, il répond 404 sur les pages reconstruites.
Le relancer suffit — c'est ce que fait `npm run shop`, qui construit d'abord.

Pour voir passer les webhooks, dans un second terminal :

```bash
stripe listen --forward-to http://localhost:8788/api/stripe/webhook
```

La commande affiche un secret `whsec_…` à coller dans `.dev.vars`. Sans lui,
le Worker refuse les webhooks plutôt que de croire n'importe quel appelant
annonçant un paiement.

### Mettre en production

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Puis déclarer le point de terminaison dans Stripe > Développeurs > Webhooks :
`https://www.talesofmemory.com/api/stripe/webhook`, abonné à
`checkout.session.completed`, `checkout.session.async_payment_succeeded` et
`checkout.session.async_payment_failed`.

**Le Worker refuse toute clé `sk_live_` tant que `SHOP_LIVE` ne vaut pas
`true`.** C'est délibéré : les frais de port de `site.ts` sont encore des
valeurs d'essai et plusieurs mentions légales restent à remplir. Mieux vaut une
boutique qui refuse de vendre qu'une boutique qui encaisse pour de vrai sur des
tarifs faux.

### Ce qui reste à trancher avant d'encaisser

- [ ] **Les prix et les frais de port** (`merch` et `shop.shipping`) — valeurs
      d'essai, et un montant annoncé est opposable au vendeur
- [ ] **L'identité de l'association** dans `legal` — les `À REMPLACER` sont
      visibles sur les deux pages légales
- [ ] **Le délai d'expédition** (`legal.shipping.delay`)
- [ ] **L'adhésion à un médiateur de la consommation**, obligatoire et payante
      à l'année dès qu'on vend à des particuliers
- [ ] `npm run stripe:produits` relancé avec la clé de production
- [ ] **Une relecture juridique** des deux pages légales
- [ ] `SHOP_LIVE=true` et la clé de production, une fois tout le reste fait

### Ce que le site ne fait pas

- **Aucun suivi de stock.** Rien n'empêche de vendre trois fois le dernier
  t-shirt ; `shop.maxPerItem` ne fait que plafonner une commande.
- **Aucune copie des commandes.** Stripe détient déjà la commande et l'adresse,
  et son tableau de bord est l'endroit où l'on prépare l'expédition. En garder
  un double créerait un second fichier de données personnelles à sécuriser et
  à purger, sans rien apporter.
- **Aucun courriel au groupe.** Le webhook journalise (`wrangler tail`) ; c'est
  là qu'on branchera un envoi le jour où l'on en voudra un.
- **Aucune case « j'accepte les CGV »**, sauf à poser `STRIPE_TOS_CONSENT=true`
  — ce qui exige d'avoir d'abord renseigné l'adresse des CGV dans Stripe >
  Paramètres > Paiements > Checkout, faute de quoi Stripe refuse la session.

## Le logo

Le nom stylisé et l'emblème vivent dans `public/identite/`, détourés sur fond
transparent — voir le mode d'emploi qui s'y trouve. Le nom ouvre la page
d'accueil, l'emblème accompagne le nom dans le bandeau et sert d'icône
d'onglet.

Les sources sont des captures d'écran et non des fichiers vectoriels : le nom
n'est jamais affiché au-delà de 400 pixels de large, faute de quoi son tracé se
déliterait. Des fichiers d'origine (SVG, AI, EPS) lèveraient cette contrainte.

## Les affiches

Une affiche par date, déposée dans `photos/affiches/` et nommée d'après
l'identifiant du concert : `2026-10-24_saint-piat.jpg`, le même nom que son
dossier dans `photos/concerts/`. Lancez `npm run photos:dirs` pour lire les
identifiants du moment, puis `npm run photos`.

L'affiche illustre alors la date partout où elle a un sens : dans l'agenda du
site et sur la page d'accueil, en tête de la page du concert, dans le flux RSS
et dans les données structurées — c'est l'image que les moteurs de recherche
reprennent pour la vignette d'un événement.

Elle n'est **jamais recadrée**, contrairement aux photos : une affiche porte du
texte, et un recadrage en couperait le lieu ou l'horaire. Le format importe
donc peu. Une date sans affiche s'affiche comme avant.

**Google Agenda n'accepte pas d'illustration.** Un événement n'a pas de champ
image ; seules des pièces jointes Google Drive peuvent lui être rattachées, et
elles s'affichent comme un lien, pas comme une image. L'affiche ne vit donc que
sur le site.

## Configuration

Copier `.env.example` vers `.env` et renseigner :

| Variable | Rôle |
| --- | --- |
| `CALENDAR_ICS_URL` | adresse **secrète** du flux iCal du calendrier « Concerts » |
| `PHOTOS_BASE_URL` | domaine public du bucket R2, ex. `https://img.talesofmemory.com` |

Les clés de la caisse ne sont pas dans `.env` : ce fichier alimente la
construction du site, alors que Stripe tourne dans le Worker. Elles vivent dans
`.dev.vars` en local (modèle : `.dev.vars.example`) et dans les secrets
Cloudflare en production.

Laissées vides, le site retombe sur les données de démonstration. Si un flux est
injoignable au moment de la construction, les données de la construction
précédente sont conservées : une panne côté Google ne publie pas un site sans
dates.

## Structure

```
src/
├── data/site.ts        contenu éditorial (textes, membres, liens, sorties, merch)
├── lib/                accès aux données et mise en forme des dates
├── layouts/            gabarit commun, métadonnées, données structurées
├── components/         en-tête, pied de page, liste de concerts, galerie
├── pages/              une page par route
└── styles/global.css   toute l'identité visuelle
scripts/
├── lib/ics.mjs         lecture du flux iCalendar
├── fetch-shows.mjs     agenda   -> src/data/shows.json
├── fetch-photos.mjs    manifeste -> src/data/photos.json
├── demo-photos.mjs     images de démonstration hors ligne
└── stripe-products.mjs produits et variantes de taille dans Stripe
worker/
├── index.ts            la caisse : /api/commande, /api/stripe/webhook
└── catalog.ts          relecture des prix côté serveur, validation du panier
```

## Référencement

Le gabarit publie un `MusicGroup` sur toutes les pages et un `MusicEvent` par
date à venir : les concerts peuvent apparaître directement dans les résultats de
recherche. Un flux RSS des prochaines dates est exposé sur `/concerts.xml`.

## Feuille de route

- [x] Site statique, agenda, galeries
- [x] Caisse Stripe en bac à sable (formulaire, webhook, page de remerciement)
- [ ] Worker d'envoi des photos + page `/envoyer`
- [ ] Vue de curation (supprimer, réordonner, couverture, corbeille)
- [ ] Déploiement Cloudflare Pages + Access + cron de reconstruction
- [ ] Polices auto-hébergées (éviter la dépendance à un CDN tiers)
