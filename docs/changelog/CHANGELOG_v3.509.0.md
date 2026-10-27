# v3.509.0 — Jalons du village et du héros (onglet Secondaires)

Décisions de Seb du 27/10 : option A (jalons par monde), liste validée, récompense ≈ 10 % du revenu du monde, variante B de l'atelier `atelier/jalons-village-heros.html` (bloc en tête de l'onglet « Secondaires »).

## Ce qui change en jeu
- **6 jalons par monde** (3 village, 3 héros), 30 en tout, visibles dès que le monde est atteint. Chacun se réclame une fois.
- **Récompense** par monde : Forêt 250 or + 1 Résine durcie · Désert 600 + 1 Verre trempé · Ruines 1 500 + 1 Clé de voûte · Crypte 4 000 + 1 Cire consacrée · Montagne 12 000 + 1 Obsidienne taillée.
- Chaque ligne : progression, récompense, « Réclamer » ou « J'y vais » (ouvre le bon écran : production, bâtiment, sort le moins monté, compagnon, entraînement).
- **« Comment ça marche »** sur le premier jalon de chaque système : rangs des sorts, entraînement d'un compagnon, patrouilles et reliques, Apothicaire, compétence d'un compagnon, caravanes.
- Le bloc montre le monde où tu es ; une ligne par autre monde qui a encore des jalons ouverts.
- La pastille de l'onglet Secondaires s'allume quand un jalon est à réclamer.

## Code
- `data/village-quests.js` : `MILESTONE_REWARD_BY_WORLD`, `VILLAGE_MILESTONES`, `MILESTONE_BOOKS`.
- `systems/village-quest-system.js` : `MilestoneManager` (mesure, réclamation). Réclamations dans `explorationProgression.villageQuests.milestones`, déjà sauvegardé en bloc : aucun nouvel état persistant.
- Nouveaux compteurs de hauts faits : `apothecaryCrafts` (Apothicaire), `caravansBack` (Halle marchande).
- `ui/quests-view.js`, `css/04-panel-quests.css` : bloc, lignes, fiche.
- `lang/en.js`, `lang/data-fields.js` : textes anglais, champs techniques des jalons hors registre.
- Harnais [331]. Vérifié dans Chromium à 320 et 390 px (aucun débordement, réclamer +12 k, fiche, « J'y vais »).
- Aucun fichier ajouté, aucun fichier protégé.
