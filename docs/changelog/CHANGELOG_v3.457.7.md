# v3.457.7 — Feu de camp : une seule règle (audit P10, lot 5)

Le feu de camp soignait différemment selon la façon de revenir : plafond de 50 % (75 % avec Repos du camp) au rechargement de la page, aucun plafond à la reprise après mise en veille. Choix de Seb : **plus de plafond nulle part.**

## Règle
- Hors combat, le feu rend 5 % des PV max par minute (7,5 % avec Repos du camp), au Campement comme pendant l'absence, jusqu'au plein. Compagnons au camp compris.
- Toujours rien pendant un combat ni pendant une sortie (donjon, chasse, quête d'aventure).

## Code
- `camp-system.js` : `CAMP_OFFLINE_REGEN_CAP_PCT` et `getCampOfflineRegenCap` retirés ; `applyRegen(true)` ne garde que le journal « pendant ton absence ».
- `camp-view.js` : l'aide du feu ne parle plus de plafond.

## Textes (FR + EN)
- Repos du camp : « Tu récupères 50 % plus vite au Campement. »
- Tutoriel (correction factuelle) : « …5 % de tes PV max par minute, même hors ligne. »
- Aide du feu : « Hors combat, tes PV remontent seuls au rythme indiqué, même pendant ton absence. Les rations soignent tout de suite. »

## Contrôles
- round-harness 4503 OK, 0 échec (deux passes), section [255] ; boot, création du héros, parcours P11 OK ; i18n 100 %, 0 orphelin.
- Aucun fichier protégé, aucun fichier ajouté.
