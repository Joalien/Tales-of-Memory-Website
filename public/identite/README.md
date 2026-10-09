# Identité visuelle

Le nom stylisé et l'emblème, détourés sur fond transparent.

| Fichier | Usage |
| --- | --- |
| `nom.png` | Le nom stylisé, pleine résolution, fond transparent — la source |
| `nom-400.webp` / `nom-800.webp` | Les deux tailles servies par le bandeau d'accueil |
| `embleme.png` | L'emblème, pleine résolution, fond transparent — la source |
| `embleme-bandeau.webp` | L'emblème réduit pour l'en-tête du site |
| `../favicon.png` | L'emblème sur fond sombre, icône d'onglet |

## Le détourage

Les fichiers d'origine étaient des captures d'écran, dessin blanc sur fond
noir. La luminance y vaut l'opacité : elle a été reprise telle quelle comme
canal de transparence, et le dessin repeint en blanc pur. Les bords lissés sont
donc du blanc translucide, et non une frange grise qui trahirait le détourage
sur un fond clair.

**Le dessin est blanc** : il disparaît sur un fond clair. Tout le site étant
sombre, la question ne se pose pas aujourd'hui — mais une affiche ou un
document sur fond blanc demandera une version sombre.

## Limite à connaître

Les sources sont des captures d'écran de 523 × 284 et 352 × 377 pixels, pas des
fichiers vectoriels. Le nom n'est donc jamais affiché au-delà de 400 pixels de
large : plus grand, son tracé se déliterait. **Si le groupe retrouve les
fichiers d'origine du graphiste (SVG, AI, EPS, ou un PNG de 2000 pixels et
plus), ils remplaceront avantageusement ceux-ci** et lèveront cette contrainte.
