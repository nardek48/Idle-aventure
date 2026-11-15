# v3.808.0 — Rappel « PV bas » dès 70 % des PV (15/11/2026)

Audit de l'Alpha (13/11) : « La meute affamée », première mort d'un nouveau joueur. Option A de Seb (15/11). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Banc (vrai moteur, sauvegardes du robot à forest_06, niveau 3, 6 combats par cas)
| Départ | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| PV pleins, sans potion | 0 mort (42–67 % restants) | 0 mort (63–80 %) | 0 mort (13–56 %) |
| PV pleins, 2 potions | 0 mort | 0 mort | 0 mort |
| 66 % des PV, sans potion | 1 mort sur 6 | 0 mort | 3 morts sur 6 |
| 66 % des PV, 2 potions | 0 mort | 0 mort | 0 mort |
- Robot (84 parties) : 0 mort, il part toujours PV pleins.
- La quête tue quand on part blessé sans boire ; le rappel « PV bas » ne venait que sous 50 %.

## Changement
- `ui/combat-forecast-view.js` : `STORY_LOW_HP_PCT` 0,50 → 0,70, le seuil des autres alertes de PV. Accepter une étape d'Histoire de combat sous 70 % des PV propose d'aller au feu (le repas y est gratuit au début du jeu). Rien de bloquant.
- La quête ne change pas (option B, 16 → 12 loups, écartée).

## Signalé, sans correction
- Le pronostic de cette quête se trompe dans les deux sens : « Sans danger » au Mage à 66 % sans potion, « Hors de portée » au Rôdeur à PV pleins. L'usure prévue est 1,5 à 2 fois trop faible (Chevalier, Mage) et 3 à 5 fois trop forte (Rôdeur) : le rendement de classe, calé sur les duels de boss, s'applique mal aux petits groupes. Option C, chantier d'équilibrage à part.

## Contrôles
- `round-harness` 7131 OK, 0 échec, sur 2 passes ([495] : rappel à 66 %, pas à 75 %).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
