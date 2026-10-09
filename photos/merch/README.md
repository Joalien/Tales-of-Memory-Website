# Visuels de la boutique

Un fichier par article, nommé d'après la valeur `photo` de l'article dans
`src/data/site.ts`. Le rattachement passe par le **nom du fichier**, pas par
l'ordre de la liste : renommer un fichier suffit à corriger une erreur.

| Article | Fichier attendu |
| --- | --- |
| T-shirt logo | `tshirt-logo.jpg` |
| T-shirt Forgotten Chapters | `tshirt-album.jpg` |
| Tote bag | `tote-bag.jpg` |
| Poster | `poster.jpg` |

Le CD n'a pas de fichier à déposer : il porte `album: true` et reprend la
pochette déjà dérivée dans `public/album/cover/`.

Un visuel manquant n'empêche rien : l'article s'affiche avec un cadre
d'attente, et la mise en page ne bouge pas.

## Comment les préparer

Cadrage **carré**, le produit bien au centre : la page recadre en carré, donc
une photo panoramique perdrait ses bords. Fond uni ou neutre de préférence,
l'article doit se détacher. Pleine résolution, le site fabrique les tailles.

```bash
npm run photos    # dérivés web + manifeste
```

Les originaux restent ici en local et ne partent jamais dans Git. Seuls les
dérivés web de cette galerie sont versionnés, pour que la boutique s'affiche
sans dépendre du bucket R2.
