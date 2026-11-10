# v3.762.0 — Nettoyage du code inutilisé (Seb 10/11, option B)

Relevé du 10/11 (CSS : `tools/audit/css-dead.js` ; JS : globales et méthodes jamais citées hors de leur définition, `onclick` compris ; images et fichiers vérifiés à la main). Le code était déjà propre (audit du 04/11, ARCH-4 à ARCH-17). Aucun changement visible pour le joueur.

Retiré :
- `js/data/story-quests.js` (fichier protégé, accord de Seb) : le relevé « Ce qui manque » des paliers, inutilisé depuis que les paliers sont devenus des scènes (v3.717.0) : `storyMissingCostLines`, `storyPalierManques`, `storyPalierRuinesRareMissing`, `storyPalierCrypteEpique`, `storyPalierCrypteEpiqueMissing`, `storyPalierCrypteRareMissing`, `storyPalierMontagneMissing`, `storyMontagneTrousTexte`, `storyPalierMontagneCompletMissing`, `storyPalierTourCompletMissing` et leurs exports. Gardés : `storyPalier`, les repères `STORY_PALIER_*` (lus par le pronostic et l'Admin) et la marque « Compte pour l'Histoire ».
- `js/ui/quests-view.js` et `css/04-panel-quests.css` : le bloc « Ce qui manque » de la carte d'étape (plus aucune étape ne définit `missing()`).
- `js/systems/combat-engine.js` (fichier protégé, accord de Seb) : `alliesTurn`, jamais appelée (les compagnons jouent à leur tour d'initiative) ; commentaires de `noteThreat`, `companion-system.js` et `combat-forecast-system.js` mis à jour.
- `js/ui/grimoire-view.js` : `confirmLoadGrimoirePreset` ; `js/ui/or-a-investir-view.js` : `orInvestCanPay` ; `js/ui/map-camera.js` : `refit`.
- CSS : `.pa2-btnrow` (`00-kbtn.css`), `.pa2-p` et `.pa2-cond-head` (`04-panel-pa2.css`), `.forge-row-gain` (`04-panel-village.css`). `css-dead.js` : 0 classe morte.
- `js/lang/en.js` : 16 traductions devenues orphelines.
- `tools/harness/round-harness.js` : contrôles de ces fonctions retirés ou ramenés à ce qui reste ([230], Crypte, Montagne, Tour, EQUI-2).

Gardé exprès : `#kc-sticky` (astuce de spécificité qui garde le détail de l'Équipement collé en bas), `js/lang/data-fields.js` (registre de l'audit i18n), les restes « chasse » de `save-system.js` (remise en ordre des anciennes sauvegardes), les fonctions utilisées seulement par les harnais hors de cette liste, les images à noms construits (vérifiées).

Contrôles : round-harness 7 295 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 9 015 textes, 100 %, 0 orphelin ; parcours 239 OK ; robot Rôdeur jusqu'à desert_06 : 25 OK.
