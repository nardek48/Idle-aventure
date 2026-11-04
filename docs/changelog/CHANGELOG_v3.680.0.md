# v3.680.0 — Création annulée depuis « Mes héros » : plus d'emplacement fantôme (audit du 04/11, SAVE-1)

- **Bug corrigé** : depuis « Mes héros » (jeu déjà lancé), toucher un emplacement vide ouvre la création. La croix prenait la branche « écran titre » sans recharger le héros d'origine : le joueur restait sur un héros vide, et l'autosauvegarde écrivait l'emplacement vide (même sans croix, pendant la création), qui devenait un héros fantôme proposé par « Continuer ». Accord de Seb (« tous les changements mentionnés »).
- `js/ui/modal-view.js` : `cancelHeroSelection` recharge l'emplacement d'origine quand la création vient du jeu, et remet l'emplacement actif d'origine quand elle vient de l'écran titre. Le rechargement est sorti dans `cancelHeroSelectionRestore(origin)` (corps inchangé).
- `js/systems/save-system.js` **(protégé, accord de Seb)** : `saveGame` n'écrit pas un emplacement qui n'existe pas encore tant qu'aucun héros n'est créé (`game.heroId` vide). Une ligne.
- « Quoi de neuf » : une ligne (FR et en.js).
- `tools/harness/round-harness.js` [445] : croix depuis le jeu, aucune écriture sans héros, écriture normale une fois le héros créé.
- Vérifié dans Chromium à 390 × 844 : héros Zz (777 or) → Mes héros → emplacement 2 → autosauvegarde → croix : retour sur Zz, 777 or, emplacement 2 jamais écrit, « Continuer » ne propose que Zz.

Contrôles : round 6 165 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.
