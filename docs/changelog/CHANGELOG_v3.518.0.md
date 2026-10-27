# v3.518.0 — Correctifs de l'audit, lot 2 : routage de « Partir »

Audit complet du 27/10, lot 2. Le bouton « Partir » d'une étape d'Histoire mène directement à l'action (la quête, la feuille, la Petite Aventure), et non plus à une liste où il fallait chercher et réaccepter. Aucun fichier protégé.

## Ce qui change en jeu
- **Petites Aventures d'Histoire (QUE-1)** : à desert_03 (outre remplie), ruines_06, crypte_06 et montagne_06, « Partir » lance la Petite Aventure (carte vivante ou départ direct), au lieu de Quêtes › Secondaires sous les jalons.
- **La Meute affamée et le Cœur (QUE-2)** :
  - forest_06 ouvre la quête de la Meute (fenêtre « Avant de partir »), sans passer par Quêtes ;
  - sa fin ferme l'étape d'une seule fenêtre ;
  - forest_12 et forest_15 (lien qui dépend de l'avancée) partent eux aussi directement.
- **Donjons d'Histoire (QUE-3)** : les 10 étapes de donjon ouvrent la feuille du donjon du monde (Marques, niveau, Entrer), et non plus la liste.
- **Quêtes › Histoire (QUE-4)** :
  - « Aller à la quête » part comme au Camp, la quête d'aventure ne se réaccepte plus ;
  - pour un choix (« Décider », « Choisir sa voie »…), l'écran défile jusqu'au bouton. Mesuré : « Décider » de crypte_05 passe de y = 747–795, sous le pli à 752, à y = 414–462.
- **L'Outre du Veilleur (QUE-5, desert_07)** : avec une Outre pleine, le Camp propose « Donner l'Outre » et la donne d'une touche. Sans outre, « Aller au Réservoir ».
- **Le bouton dit où il mène (QUE-11)** : « S'équiper », « Voir les talents », « Aller à la boutique », « S'entraîner », « Ouvrir le Grimoire », « Aller au village », ou le libellé des données (« Aller au Réservoir », « Aller aux Ateliers »). Ailleurs : « Partir ». Mesuré à 320 px : tout tient sur 48 px de haut, sans débordement.
- **Tutoriels d'étape (TUT-4, option A)** : après « Partir », un tutoriel jamais vu s'ouvre sur l'écran d'arrivée. Exemples : « Fabriquer une ration » (forest_08) sur l'expédition, « Les compagnons » (Wenna), « À trois », « Deux sur trois / quatre / cinq ». Ceux de Combat et de Scène restent à leur écran.
- **Fil rouge (ERG-8)** : « Récolter » récolte vraiment avant d'ouvrir la Production. Après « Accepter », la bulle reste ouverte sur la suite (« Y aller »). Le bouton reprend le verbe de l'étape.

## Mesures
- `tools/audit/fenetres-quetes.js` (Chromium, 390 px) touche le vrai « Partir » du Camp sur les 95 étapes : aucun « Partir » sans effet, aucun détour par Quêtes ; 53/53 tutoriels d'étape vus, 95/95 fenêtres de fin, 0 erreur de page. Trois étapes ne sont pas jugées : leur donjon est verrouillé par la progression forcée de l'outil.
- Sauvegardes réelles (`audit-v3515/saves`) :
  - montagne_12 ouvre la feuille de la Gueule du volcan ;
  - desert_07 donne l'Outre depuis le Camp ;
  - forest_08 et forest_wenna : le tutoriel s'affiche au premier plan.

## Code
- `systems/mission-board-system.js` :
  - `launchStoryLink` gère `adv_*`, `petite_aventure_*` et le donjon du monde, et évalue un `tab` en fonction ; la conversion `adv_hq_` → `hunt_` est retirée ;
  - nouveau `storyLinkLabel` ;
  - offrande dans `_storyMissions`.
- `ui/quests-view.js` : `openStoryStepActions`, `data-story-actions`, `storyStepClosedBy` (`adv_`). `ui/tutorial-view.js` : `showStepTutorialAfterGo`. `systems/fil-rouge-system.js`.
- `en.js` : 5 libellés. `tools/audit/fenetres-quetes.js` : contrôle de « Partir ». Harnais [339] ; [261] mis à jour. Aucun fichier ajouté.
