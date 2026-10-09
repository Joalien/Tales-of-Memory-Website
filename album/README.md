# Album

Dépose ici les fichiers sources du disque. Ils ne sont **pas** publiés tels
quels : `npm run album` en fabrique les versions destinées au web.

```
album/
├── pochette.jpg        ← la pochette en pleine résolution (.jpg .png .webp .tif)
├── jaquette.pdf        ← le livret / la jaquette, proposé au téléchargement
└── audio/
    ├── 01-premier-titre.mp3
    ├── 02-deuxieme-titre.mp3
    └── …
```

## Nommage des pistes

Le numéro en tête donne l'ordre, le reste donne le titre affiché :

| Fichier | Titre sur le site |
|---|---|
| `01-la-derniere-lettre.mp3` | La derniere lettre |
| `02-Sous les cendres.mp3` | Sous les cendres |

Les accents et les majuscules du nom de fichier sont conservés, donc
`03-Rémanence.mp3` s'affiche « Rémanence ». Renomme simplement tes fichiers
pour corriger un titre.

## Formats

- **Pochette** : n'importe quel format d'image courant. Carré de préférence,
  au moins 1600 px de côté. Convertie en WebP 400 / 800 / 1600 px.
- **Jaquette** : un seul PDF, copié tel quel. Garde-le sous ~10 Mo, c'est un
  téléchargement pour les visiteurs.
- **Audio** : `.mp3`, `.m4a`, `.ogg` ou `.opus`, qui se lisent dans tous les
  navigateurs. Le `.wav` et le `.flac` sont refusés, bien trop lourds — convertis-les
  d'abord, par exemple `ffmpeg -i piste.wav -b:a 192k piste.mp3`.

## Où finissent ces fichiers

La **pochette** est versionnée dans Git : elle est légère et ne change jamais.

Le **PDF** et les **pistes audio** en sont exclus, pour la même raison que les
photos de concert : ils sont lourds et l'historique Git ne se purge pas. Ils
sont servis depuis le déploiement tant qu'on publie à la main, et basculeront
sur le bucket R2 dès qu'il sera exposé sur un domaine.
