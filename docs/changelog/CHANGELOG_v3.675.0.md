# v3.675.0 — forest_04 ne peut plus bloquer l'Histoire (audit du 04/11, NOV-1)

- **Blocage corrigé** : à forest_04 « Le colporteur », un joueur qui avait dépensé son or à l'Entraînement (moins de 150 or, aucune potion) ne pouvait plus jamais avancer, faute d'autre source d'or à ce stade. Décision de Seb : option A.
- `js/systems/potion-system.js` : `PotionManager.isStoryGiftDue(id)`. Vrai seulement si forest_04 est l'étape en cours et acceptée, que le joueur n'a aucune potion et pas l'or de la Mineure. `buyHealingPotion` donne alors la Mineure sans rien prendre, avec une ligne au journal ; l'étape se valide comme un achat normal.
- `js/ui/potion-view.js` : dans ce cas, le bouton de la Mineure affiche « Offerte » et la fiche « Sarkel te la laisse : tu la paieras une autre fois. »
- `js/lang/en.js` : 4 textes. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [441] : cadeau à 1 or, pas pour la Majeure, plus après réception, ni avec assez d'or, ni avant l'acceptation, ni après forest_04.
- Vérifié dans Chromium à 390 × 844 : bouton « Offerte », or inchangé (1), potion en stock, étape prête.

Contrôles : round 6 147 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.
