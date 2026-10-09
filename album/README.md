# Album

Dépose ici les fichiers sources du disque. Ils ne sont **pas** publiés tels
quels : `npm run album` en fabrique les versions destinées au web.

```
album/
├── pochette.jpg                 ← la pochette en pleine résolution
├── jaquette.pdf                 ← le livret, proposé au téléchargement
├── Mon album - complet.mp3      ← l'album en un seul fichier (facultatif)
└── audio/
    ├── 00-Mon intro.mp3         ← 00 = intro, hors numérotation
    ├── 01-Premier titre.mp3
    └── …
```

Un fichier audio posé **à la racine** est compris comme l'album entier et
donne le bouton « Télécharger l'album ». Les pistes séparées, elles, vont
dans `audio/`.

## Nommage des pistes

Le numéro en tête donne l'ordre **et le numéro affiché**, le reste donne le
titre. Le numéro **`00` désigne une intro** : la piste s'affiche « Intro » et
la numérotation des morceaux repart à 1 juste après.

| Fichier | Affiché sur le site |
|---|---|
| `00-Arx Memoriae.mp3` | Intro · Arx Memoriae |
| `01-Arrow of Justice.mp3` | 01 · Arrow of Justice |
| `02-Sous les cendres.mp3` | 02 · Sous les cendres |

Tu contrôles donc entièrement l'ordre et la numérotation en renommant les
fichiers, sans jamais toucher au code.

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
