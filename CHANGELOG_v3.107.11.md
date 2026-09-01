# v3.107.11 — Icônes dédiées pour les rations (3/3, complet)

## Contexte

Suite de la v3.107.10 : le chemin `images/Icons/resources/petite_ration_icon.png` était déjà câblé dans les données, en attente de l'image. Fournie par Seb — les 3 rations ont maintenant chacune leur propre icône illustrée, aucune modification de code nécessaire (fichier image seul).

## Icônes complètes

- **Petite ration** → pain, fruit séché, os (fourni)
- **Ration moyenne** → pains, fruits secs, cuillère
- **Grande ration** → pain, légumineuses, saucisson, cannelle

## Fichiers modifiés

- `images/Icons/resources/petite_ration_icon.png` — nouveau fichier
- `sw.js` — `CACHE_VERSION` 3.107.11 (force le rechargement du cache pour afficher la nouvelle image)

## Tests

Harnais principal étendu à **371 assertions, 0 échec.** Section [64] complétée : les 3 rations ont chacune un chemin d'icône distinct, aucun partage résiduel.
