# v3.458.4 — Lot 7b : parcours plus courts (audit C1, C3, C4, C6, C9, C14)

Report dans le jeu de l'atelier `atelier/lot7.html`, validé par Seb (réclamation d'office ; « Ce que tu portes » sans icône pour l'instant).

## C1 — Une seule fenêtre à la fin d'une quête d'Histoire
- Quand une quête d'aventure termine l'étape d'Histoire qui lui est liée, l'étape se réclame d'office : une seule fenêtre, avec le récit de l'étape et toutes les récompenses (celles de la quête comprises). Avant : « Quête terminée ! », puis « Réclamer » au Camp, puis une seconde fenêtre.
- Code : `openQuestCompletePopup` (`quests-view.js`) appelle `StoryQuestManager.claimStep`, sans modifier le système de quêtes.

## C3 — Quêtes › Histoire
- Le chapitre en cours vient en tête ; un chapitre terminé tient sur une ligne repliée en dessous (son texte de fin, puis ses étapes d'un toucher).
- Les quêtes des autres mondes ne s'annoncent plus que dans leur catégorie (`MissionBoard.hiddenByWorld(kinds)`).

## C4 — Mémoire
- Un niveau déjà choisi se replie sur son choix ; « Changer › » le rouvre. Avec 8 niveaux choisis, l'écran passe de 4 291 à 3 305 px.
- Une phrase explique Garder, Donner et le jalon.

## C6 — Les effets des choix restent visibles
- « Ce que tu portes » (Héros › Résumé) liste tous les effets durables des choix d'Histoire, seulement la branche prise : 14 effets possibles, liste sans icône pour l'instant (décision Seb).
- La Palissade dit à part la part des choix dans le frein : « frein 31 % sur l'échec (dont 10 % par tes choix) ».

## C9 — Manger depuis l'écran de retour
- Bouton « Manger » : la plus petite ration qui remet à plein, sinon la plus grande.
- Au passage : le petit texte des boutons clairs de l'écran de retour (« Livrer ») était crème sur crème ; il passe en brun.

## C14 — Préparation de sortie
- Restent visibles : la menace, le mode et l'équipe. Règles, cible, potions automatiques, comportement des compagnons, « comme la dernière fois », objets et potions passent sous « Réglages », résumés sur une ligne (règles, objets, potions de soin, potions à boire). L'ordre de v3.446.1 est gardé.
- Mesuré : 1 131 → 471 px (tient sans défiler), 19 → 5 contrôles, 165 → 52 mots.

## Outils
- `campagne-harness.js` : une étape réclamée d'office compte comme faite. Partie complète au robot (chevalier, combats) : 80 OK, 0 échec, jusqu'à crypte_20.

## Contrôles
- round-harness 4540 OK, 0 échec (deux passes), section [262] ; 13 tests adaptés (étape réclamée d'office au lieu de « prête », réglages ouverts dans les tests de la préparation).
- Boot, création du héros OK ; parcours complets 139 OK, 0 échec ; i18n 100 %, 0 orphelin.
- Aucun fichier protégé, aucun fichier ajouté.
