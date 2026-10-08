# Aethervale v3.429.10 — Finitions de la première heure

Relevées pendant la première heure de jeu testée dans Chromium. S'applique sur la v3.429.9.

## Textes
- Classe du Rôdeur : la fiche Héros affichait « Archer · Niveau N ». Le libellé de classe est maintenant « Rôdeur », comme à la création du héros.
- Potions : « Potion de soin mineur / majeur » devient « Potion de soin mineure / majeure ».
- Bandeaux d'entraînement : « AMELIORATION DE CELERITE » et les quatre autres prennent leurs accents (« AMÉLIORATION DE CÉLÉRITÉ »…).
- Équipement : « +15 dégâts/tap » devient « +15 dégâts par coup ».

## Popups
- « Quête terminée ! » n'est plus écrit deux fois : le sous-titre ne répète plus le titre.
- Fin de quête sur un boss : la carte « Victoire / Nouveau trophée » passe d'abord, et la fin de quête s'ouvre à sa fermeture (toucher, ou fermeture automatique en mode Grimoire) au lieu de s'empiler dessous.

Non traité : un bandeau de notification peut encore chevaucher les bulles de raccourci en bas à droite.

## Code
- `js/data/classes.js`, `js/data/potions.js`, `js/data/upgrades.js`, `js/ui/equipment-view.js` : textes.
- `js/ui/quests-view.js` : sous-titre sans doublon, fin de quête différée (`flushPendingQuestComplete`).
- `js/ui/boss-moment-view.js` : `closeBossFinal` ouvre la fin de quête en attente.
- `js/lang/en.js` : clés mises à jour, « Archer » retiré (orphelin).
- `tools/harness/round-harness.js` : trois contrôles suivent les nouveaux libellés (potion mineure, « dégâts par coup »).
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 184 textes, 100 %, 0 orphelin.
- Chromium (390×844) : « Rôdeur · Niveau 1 » sur la fiche ; potions, améliorations et « +15 dégâts par coup » ; fin de quête absente tant que le trophée est affiché, puis seule et sans doublon. Console sans erreur.
- `node --check` sur tous les fichiers modifiés.
