# Photos originales

Ce dossier est **exclu de Git** : les originaux n'entrent jamais dans le dépôt.

Dépose ici les photos en pleine résolution, telles qu'elles sortent du boîtier
ou du téléphone. Elles servent de source : le script d'ingestion en fabrique des
dérivés web légers (400 / 800 / 1600 px en WebP, métadonnées EXIF supprimées)
qui sont les seuls fichiers publiés.

## Rangement

Un sous-dossier par concert, nommé avec la date et la salle :

```
photos/
├── presse/                               ← photos officielles du groupe
├── groupe/                               ← coulisses, studio, informel
└── concerts/
    ├── 2026-10-24_saint-piat/
    └── 2026-05-30_label-tremp/
```

## À quoi sert chaque dossier

**`presse/`** — les photos **officielles**, celles d'un shooting. La première à
l'horizontale sert de fond au bandeau d'accueil et illustre la page bio, donc
n'y mets que des clichés que tu assumes en grand sur la page d'accueil.

**`groupe/`** — tout le reste : studio, coulisses, portraits informels, matériel.
Elles défilent dans le carrousel « En coulisses » de la page d'accueil. Le
format n'a pas d'importance, portrait comme paysage : chaque photo est affichée
entière sur un fond flouté tiré d'elle-même.

**`concerts/<identifiant>/`** — les photos d'une date précise, qui alimentent
la galerie de ce concert.

Le nom du dossier de concert doit correspondre à l'identifiant du concert, qui
est construit automatiquement comme `AAAA-MM-JJ_` suivi du titre de l'événement
d'agenda en minuscules sans accent. En cas de doute, `npm run data` puis
`cat src/data/shows.json` donne la liste exacte des identifiants.

Les photos déposées en vrac à la racine de `photos/` sont traitées comme des
photos non classées : elles seront ingérées mais pas rattachées à un concert.
