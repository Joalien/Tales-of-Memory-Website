# Jeux de données d'agenda

## `concerts.ics` — les vraies dates

Utilisé automatiquement en développement local, tant que `CALENDAR_ICS_URL`
n'est pas défini. **Ce fichier n'est jamais publié** : sur une machine de build,
l'absence de `CALENDAR_ICS_URL` produit un agenda vide plutôt que ces dates.

Il est au format iCalendar standard, donc **importable tel quel dans Google
Agenda** (Paramètres > Importer et exporter > Importer) pour amorcer le
calendrier « Concerts » partagé du groupe.

### À compléter

Les événements sont pour l'instant sur la journée entière et sans lieu, parce
que je n'avais ni l'horaire ni la salle. Pour chacun, il reste à renseigner :

- **l'horaire** : remplacer `DTSTART;VALUE=DATE:20260530` par
  `DTSTART;TZID=Europe/Paris:20260530T203000` et faire de même pour `DTEND` ;
- **le titre** sous la forme `Salle — Ville`, qui alimente l'affichage ;
- **le lieu** via une ligne `LOCATION:` avec l'adresse complète ;
- **la billetterie** via `DESCRIPTION:billets: https://…`.

## `cas-limites.ics` — le jeu de test

Couvre ce qui doit être filtré ou correctement interprété : événement annulé,
date sous embargo, lignes repliées, passage heure d'été / heure d'hiver,
événement sur plusieurs jours, et informations internes (cachet, téléphone de
la régie) qui ne doivent jamais atteindre le site.

Vérifié par `npm test`.
