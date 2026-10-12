# Aethervale v3.449.1 — Ménage du code mort

Demande de Seb du 12/10 (« Oui tu peux supprimer et faire la suite »). Aucun changement de jeu visible. S'applique sur la v3.449.0.

## Retiré du jeu (23 fonctions, plus aucun appel)
- `ui/heros-view.js` : l'ancien Résumé du héros (`getHeroSummaryResource`, `buildHeroSummary*` ×6, `getHeroMainStatLabel`, `asHerosFrame`), remplacé en v3.425.0 par `ui/heros-screens-view.js`.
- `ui/grimoire-view.js` : `setGrimoireCombatMode`, `buildGrimoirePotionAutoHTML`, `buildGrimoireTargetHTML`, `setGrimoireTarget`, `setGrimoirePotionAuto` (passés à la préparation de sortie en v3.440.0).
- `ui/companions-view.js` : `buildHerosCompanionsHTML`, `companionSetSetting` (idem).
- `ui/workshop-quest-modal.js` : l'ancien popup d'objectif de l'Atelier (`buildWorkshopStepPopupHTML`, `formatWorkshopStepCondition`, `openWorkshopStepPopup`, `closeWorkshopStepPopup`) ; le fichier reste (fenêtre « étape terminée »).
- `ui/living-map-view.js` : `lmxLocal` ; `ui/settings-view.js` : `toggleAutoSkills` ; `ui/village-building-view.js` : `goToEquipShop`.
- `css/04-panel-construction.css` : `.workshop-step-popup-condition` ; `index.html` : `#workshop-step-modal-root`.
- `lang/en.js` : 18 traductions devenues orphelines.
- `core/constants.js` : commentaire d'en-tête corrigé (`data/quests.js` n'existe plus).

Gardé exprès : l'ancien écran Équipement (`buildEquipHTML`), qu'une vieille sauvegarde peut rouvrir (`activeTab: "equip"`) et dont le détail d'objet sert à la fiche Héros › Objet. Aucun fichier ajouté ni supprimé.

## Outils
- `round-harness.js` : tests des fonctions retirées supprimés ; la bascule de mode passe par `CombatEngine.setCombatMode`.
- `design-audit.js` (vue `w_atelier_obj`) et `pc-captures.js` (sonde `lmxLocal`) : retirés.

## Contrôles
- `node --check` sur chaque JS modifié ; `round-harness` 4265 OK, 0 échec (3 passes) ; boot 4/4, création 44/44, parcours P11 15/15 ; audit i18n : 0 orphelin.
