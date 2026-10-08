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
├── presse/                               ← photos promo, pochettes, portraits
└── concerts/
    ├── 2026-09-12_lolympic-nantes/
    └── 2026-05-16_le-molotov-marseille/
```

Le nom du dossier de concert doit correspondre à l'identifiant du concert, qui
est construit automatiquement comme `AAAA-MM-JJ_` suivi du titre de l'événement
d'agenda en minuscules sans accent. En cas de doute, `npm run data` puis
`cat src/data/shows.json` donne la liste exacte des identifiants.

Les photos déposées en vrac à la racine de `photos/` sont traitées comme des
photos non classées : elles seront ingérées mais pas rattachées à un concert.
