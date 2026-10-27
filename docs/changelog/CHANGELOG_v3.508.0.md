# v3.508.0 — Bulle d'or et fil rouge : les achats et réglages du chantier du héros

Décision de Seb du 27/10 (option C, avant les jalons du village et du héros) : les deux boutons qui guident le joueur ignoraient les rangs, les talents, les reliques et les nouvelles zones.

## Ce qui change en jeu
- **Bulle « Or à investir »** : elle propose aussi
  - les **rangs des sorts** payables (or et matériau du monde en stock) ; « J'y vais » ouvre la fiche Capacités sur la carte du sort, au bouton « Monter au rang n » ;
  - les **rangs de compétence des compagnons** payables ; « J'y vais » ouvre la fiche du compagnon.
  - Ordre : bâtiments, reforges, rangs des sorts, entraînement des compagnons, rangs des compagnons, entraînement du héros (le moins cher d'abord à rang égal).
- **Fil rouge** (« quoi faire »), après les zones pleines et avant les objectifs d'après l'Histoire :
  - **points de talent à dépenser**, quand un talent peut être pris ;
  - **une relique à équiper**, quand une relique libre peut aller dans un emplacement vide d'un compagnon (une par famille) ;
  - **monter une zone de production**, quand une zone peut monter tout de suite avec le stock.

## Contrôles
- Chromium à 320 px : fenêtre de la bulle d'or sans débordement ; « J'y vais » sur un rang ouvre la carte du sort dépliée.
- `round-harness.js` : section [329] (rangs dans la bulle, sans matériau rien, relique à équiper ou déjà portée).

## Code
- `ui/or-a-investir-view.js` : `orInvestSkillRanks`, `orInvestCompanionRanks`, `orInvestGoSkill`.
- `systems/fil-rouge-system.js` : `_talents`, `_relic`, `_zoneUp`.
- `lang/en.js` : 9 textes.
- Aucun fichier ajouté, aucun fichier protégé.
