# Affiches de concert

Une affiche par date, nommée d'après **l'identifiant du concert** : le même que
son dossier dans `photos/concerts/`, calculé depuis l'agenda.

```
photos/affiches/2026-09-24_ladies-rock.jpg
photos/affiches/2026-10-24_saint-piat.jpg
```

Pour connaître les identifiants du moment, lance `npm run photos:dirs` : les
dossiers créés dans `photos/concerts/` portent exactement les noms attendus
ici. Une affiche dont le nom ne correspond à aucune date n'apparaît nulle part
et ne casse rien — c'est le symptôme d'une faute de frappe.

Une date sans affiche s'affiche comme avant : rien à prévoir, rien à désactiver.

## Comment les préparer

Déposez l'affiche telle que le festival ou la salle l'a fournie, en pleine
résolution : le site fabrique les tailles. Le format portrait habituel (A3, A4,
story) convient, la mise en page s'y adapte.

Préférez le fichier d'origine à une capture d'écran ou à une image récupérée
sur un réseau social : le texte d'une affiche devient vite illisible une fois
recompressé.

```bash
npm run photos    # dérivés web + manifeste
```

Les originaux restent ici en local et ne partent jamais dans Git. Seuls les
dérivés web sont versionnés, comme pour la presse, les portraits et la
boutique : une date à venir doit s'illustrer sans dépendre du bucket R2.
