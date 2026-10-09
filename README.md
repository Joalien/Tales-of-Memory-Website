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

Le site est statique : **il ne peut pas encaisser un paiement.** La page
`/merch` est une vitrine, l'argent passe par une plateforme tierce qui tient la
caisse, le port et la TVA.

Les articles se décrivent dans `merch` (`src/data/site.ts`), un objet par
article. Leurs visuels se déposent dans `photos/merch/`, nommés d'après la
valeur `photo` de l'article : c'est le nom du fichier qui fait le rattachement,
comme pour les portraits des membres. Le CD fait exception, il porte
`album: true` et reprend la pochette déjà dérivée.

Trois états, sans aucune bascule à actionner :

| `shop.url` | `url` de l'article | Ce que voit le visiteur |
| --- | --- | --- |
| vide | vide | La fiche, sans bouton, et l'adresse mail pour commander |
| renseignée | vide | Un bouton « Commander » vers l'accueil de la boutique |
| renseignée | renseignée | Un bouton « Commander » vers la fiche produit |

Tant que `shop.url` est vide, la page annonce la vente au stand les soirs de
concert : elle ne promet jamais un bouton qui n'existe pas.

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
└── demo-photos.mjs     images de démonstration hors ligne
```

## Référencement

Le gabarit publie un `MusicGroup` sur toutes les pages et un `MusicEvent` par
date à venir : les concerts peuvent apparaître directement dans les résultats de
recherche. Un flux RSS des prochaines dates est exposé sur `/concerts.xml`.

## Feuille de route

- [x] Site statique, agenda, galeries
- [ ] Worker d'envoi des photos + page `/envoyer`
- [ ] Vue de curation (supprimer, réordonner, couverture, corbeille)
- [ ] Déploiement Cloudflare Pages + Access + cron de reconstruction
- [ ] Polices auto-hébergées (éviter la dépendance à un CDN tiers)
