# Visuels de la boutique

Un fichier par article, nommé d'après la valeur `photo` de l'article dans
`src/data/site.ts`. Le rattachement passe par le **nom du fichier**, pas par
l'ordre de la liste : renommer un fichier suffit à corriger une erreur.

| Article | Fichier attendu |
| --- | --- |
| T-shirt Forgotten Chapters | `tshirt-forgotten-chapters.jpg` |
| T-shirt Letter | `tshirt-letter.jpg` |
| Mug Forgotten Chapters | `mug-forgotten-chapters.jpg` |

## Plusieurs vues d'un même article

Un article peut être montré sous plusieurs angles : ajoutez `-2`, `-3`… au nom
du fichier principal. La fiche affiche alors des flèches pour passer de l'une à
l'autre, et un compteur.

```
mug-forgotten-chapters.jpg     la vue d'ouverture
mug-forgotten-chapters-2.jpg   deuxième vue
mug-forgotten-chapters-3.jpg   troisième vue
```

L'ordre est celui des numéros, et le fichier sans numéro passe toujours en
premier : c'est lui qu'on voit dans la grille, donc mettez-y la face la plus
parlante. Le suffixe doit être un nombre — un article nommé `mug-special`
reste bien un article distinct, il n'est pas avalé comme une vue de `mug`.

Sans JavaScript, la première vue s'affiche et les flèches restent masquées.

Le CD n'a pas de fichier à déposer : il porte `album: true` et reprend la
pochette déjà dérivée dans `public/album/cover/`.

Un visuel manquant n'empêche rien : l'article s'affiche avec un cadre
d'attente, et la mise en page ne bouge pas.

## Comment les préparer

Le produit **entier et bien au centre**. La fiche est carrée mais n'ampute
rien : une photo panoramique s'y affiche en entier, avec des bandes au-dessus
et en dessous. Fond uni ou neutre de préférence, l'article doit se détacher.
Pleine résolution, le site fabrique les tailles.

Posez l'objet plutôt que de le tenir, et calez l'appareil : une photo prise à
main levée sort floue, et aucun traitement ne rattrape vraiment la netteté.

```bash
npm run photos    # dérivés web + manifeste
```

Les originaux restent ici en local et ne partent jamais dans Git. Seuls les
dérivés web de cette galerie sont versionnés, pour que la boutique s'affiche
sans dépendre du bucket R2.
