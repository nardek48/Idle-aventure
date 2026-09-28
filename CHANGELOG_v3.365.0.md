# Aethervale v3.365.0 — Lot J : le Bilan de la partie en tête du Journal

Demande de Seb du 28/09/2026 : les statistiques de la partie avaient disparu depuis la refonte des Hauts faits. Elles étaient repliées tout en bas de l'onglet Collection.

## Ce qui change

- Le bloc **« Bilan de la partie »** passe **en tête du Journal**. Il est **ouvert par défaut** et se replie d'un toucher.
- L'appareil se souvient de l'état replié : nouvelle préférence `logTotals` de `Prefs`, hors sauvegarde.
- Le bloc quitte l'onglet Collection des Hauts faits.
- Trois lignes s'ajoutent, **sans nouveau compteur** :
  - **Hauts faits** : x / 44 ;
  - **Histoire** : « Ch. 2 · 16 / 18 », ou « Ch. 2 terminé » ;
  - **Aether gagné**.

Fichiers : `js/ui/log-view.js`, `js/ui/achievement-view.js` (`buildTotalsStoryLabel`), `js/systems/prefs-system.js`.

## Livraison

`GAME_VERSION` et `CACHE_VERSION` passent à **3.365.0**.

**Aucun fichier JS ou CSS nouveau** dans le jeu, donc aucun ajout au précache. Un fichier nouveau hors jeu : `sim/nezzam-bench.js`.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] v3.287.0 neutralisée) | 0 échec, 2 passages |
| boot-harness.js · hero-creation-harness.js | 4 OK · 44 OK |
| retour-demarrage-bench.js | OK |
| parcours-harness.js (P1 à P12) | **126 OK**, 0 échec |
| campagne-harness.js, option A | 38 / 38 pour chaque classe |
| campagne-lot.js --combats, 12 parties | aucun mur |
| missing-icons.js | 2 icônes à générer (`forme_du_roi`, `puits_du_roi`) |
