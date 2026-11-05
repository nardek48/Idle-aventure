# v3.688.0 — Écran de retour, hors ligne et boucle allégée (audit du 04/11, lots I9 et I10)

L'écran de retour dit enfin ce que l'absence a coûté (consommations et pertes des ateliers, surplus versé au Grand Ouvrage, PV de reprise), et la boucle de jeu tourne nettement plus légère au Camp comme en combat. Aucun chiffre d'équilibrage changé.

Mesures (Chromium, 390×844 @3x, CPU ×4, partie de fin de Chevalier, 20 s par scénario, sans profileur ; deux relevés avant, deux après) :

| Scénario | Avant (script ms/s) | Après (script ms/s) |
|---|---|---|
| Arrêt sur le Camp | 85,4 / 77,7 | **45,0 / 47,0** (−44 %) |
| Combat ×1 | 226,5 / 217,5 | 183,0 / 197,2 |
| Combat ×4 | 242,9 / 247,2 | 205,5 / 209,1 |

Combat ×4 : 50,2-50,8 → 53,7-54,8 images/s ; tâches longues en 20 s 31-32 → 9-12 ; recalculs de mise en page 51-53 → 41-43/s. Au Camp, d'après les compteurs : `FilRouge.all` + `MissionBoard.list` 50,6 → 9,6 ms/s, `ProductionManager.tick` 22,3 → 2,6 ms/s, `renderHudBand` 13,8 → 3,6 ms/s.
Voile du premier lancement après un rechargement forcé : 6 470 → 445 ms ; premier lancement sans bridage : 1 344 → 1 202 ms.

- **PERF-2** : `FilRouge.all()` lit le tableau des missions une seule fois par passage (il le reconstruisait 4 fois) ; `FIL_ROUGE_CACHE_MS` 1 000 → 2 000 (`invalidate()` rafraîchit déjà après chaque action). `js/systems/fil-rouge-system.js`.
- **PERF-5** : la production avance à 4 Hz, `dt` cumulé jusqu'à 0,25 s (rien n'est perdu). `js/main/game-loop.js` **(protégé)**.
- **PERF-17** : `isBlockingModalOpen` lit `firstChild` au lieu de sérialiser `innerHTML` 60 fois par seconde. `js/main/game-loop.js` **(protégé, une ligne)**.
- **PERF-15** : bandeau du HUD : clé brute (or, PV, XP, niveau, langue) posée sur le bandeau ; rien n'est formaté quand rien ne bouge. Un bandeau remonté est réécrit en entier. `js/ui/hud-view.js`.
- **PERF-1** : en combat, le repère de `#cbx` est lu une fois par image ; les animations (`flash`, ligne du Grimoire) repartent deux images plus tard au lieu de forcer un recalcul par `offsetWidth` (ES5). `js/ui/combat-screen-view.js`.
- **PERF-6** : la surcharge de `renderHeroHp` ne redessine plus l'Équipe, déjà redessinée par `renderFrame` à chaque image. `js/ui/combat-screen-view.js`.
- **PERF-8, PERF-V1** : voile du premier lancement levé au plus 1,5 s après l'écran titre, et tout de suite quand un service worker actif ne reprendra pas la main (rechargement forcé). Le plafond de 6 s reste en dernier recours. `js/main/pwa.js`.
- **PERF-16** : pouls du monde actuel sur la carte : disque derrière le cercle animé en `transform` et `opacity` au lieu d'un `box-shadow` repeint. Même halo (1,19 × le cercle, 1,7 s). `css/06-map.css`.
- **PERF-3** : « Continuer » profite de PERF-2 (le reste vient de PERF-4, laissé).
- **CPL1-1** : relevé du rattrapage des ateliers (`WorkshopsSystem.beginOfflineLedger` / `takeOfflineLedger`) ; ligne « Entrepôt plein, sorties perdues : … » à l'écran de retour. `js/systems/workshops-system.js`, `js/systems/offline-system.js`, `js/systems/resume-system.js`, `js/systems/return-system.js`, `js/ui/return-view.js`.
- **CPL1-3** : les ateliers sont comptés en brut (un Lingot coulé puis consommé apparaît) et une ligne « Pris par les ateliers : −390 Blé, … » dit ce que le chaînage a pris. Mêmes fichiers ; chargement et reprise de la PWA passent tous deux par `applyOfflineLedger`.
- **CPL1-4** : après « Tout récolter », « Surplus versé au Grand Ouvrage : +638 points ». `js/ui/return-view.js`.
- **CPL1-5** : en reprise de la PWA, la régénération du feu est appliquée avant le bilan : la rubrique Héros affiche les PV rendus. `js/systems/resume-system.js`.
- **CPL1-9** : liens de l'écran de retour (« Prendre le butin », « Lire son récit », « Repartir ») à 44 px de haut (mesuré : 94×44). `css/04-panel-evolutions.css`.
- `js/lang/en.js` : 3 textes nouveaux traduits. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [453] : 20 contrôles.

Vérifié dans Chromium à 390×844 : écran de retour (lignes « Pris par les ateliers », « Entrepôt plein », « Surplus versé… +638 points », lien à 44 px), halo de la carte (animation sur `::before`, plus rien sur le cercle), voile au premier lancement, au démarrage à chaud et au rechargement forcé ; aucune erreur.

Laissés :
- CPL1-2 : rubrique « Caravanes » à l'écran de retour, extension de R2 [D], atelier d'abord.
- CPL1-6 : résumé en attente gardé au rechargement (stockage local), décision de Seb [D].
- CPL1-7 : rattrapage d'ateliers séquentiel (3,9 % passager), accepter ou tranches de 60 s : choix de Seb.
- PERF-4 : `ensure*` ciblés dans les fichiers de quêtes [D].
- PERF-7 : retrait des commentaires de la copie publiée, à trancher par Seb ; pas de regroupement (O6).
- PERF-9 à PERF-14 : images et précache, lot A3.
- PERF-18 : `loading="lazy"` sur les listes, gain seulement estimé, à cibler avec le lot images A3.
- PERF-19 : commentaires faux, lot documentation A1 (ARCH-12).
- Déjà corrigé : CPL1-8 (v3.686.0). Réfuté : PERF-20.

Aucun fichier ajouté.

Contrôles : round 6 326 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % (0 orphelin).
