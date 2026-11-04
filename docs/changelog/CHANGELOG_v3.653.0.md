# v3.653.0 — Grimoire : le réglage « Varier »

TW2 de la conception de la Tour (condition « Varier » jamais faite). Option B de Seb (03/11), accord pour retoucher `save-system.js`.

## Le réglage
- **Où** : préparation de sortie, avec la Cible et la potion automatique (section des réglages repliée). Visible dès la Tour atteinte, éteint par défaut.
- **Libellé** : « Varier : ne pas refaire la même technique ».
- **Phrase d'aide** : « Si une autre technique est prête, elle passe avant celle d'avant. Contre le miroir de la Tour, tu gardes toute ta force. »
- **Effet**, en combat automatique et pour le conseil du mode Tactique : les techniques à éviter ce round sont sautées, dans les règles du Grimoire comme dans le repli par défaut.
  - Ce sont la technique d'avant et celle que garde le miroir (silhouette, Reflet, Gardien qui répète).
  - La défense et « Tailler » ne sont jamais évitées.
- **Si rien d'autre ne part**, la décision est refaite sans contrainte. Une technique répétée, même à −25 % sous le miroir, vaut mieux que l'attaque de base.

## Code
- `systems/combat-auto-policy-system.js` (moteur pur) : `isGrimoireSlotAvoided`, lu par `chooseAutoAction` et `chooseGrimoireAction` via `combatContext.avoidSlots`.
- `systems/class-combat-system.js` : `chooseRoundAction` enveloppe `_chooseRoundAction` (une passe avec contrainte, puis sans) ; `varierAvoidSlots` lit `game._varier.last` et `game._towerMirror.slot`.
- **Nouvel état `game.grimoireVarier`**, câblé aux 4 points :
  - `core/state.js` ;
  - `save-system.js` (fichier protégé, accord de Seb) : `buildSaveData`, `restoreBaseState` (une ancienne sauvegarde démarre éteinte), `fullResetState`.
- `ui/sortie-prep-view.js` : l'interrupteur, sur le modèle de « Garder la dernière pour le boss ».
- `lang/en.js` : 3 textes.

## Mesure (reprise de la Tour au robot `--joueur`, sauvegardes d'entrée de la Tour, 28 contrôles et 0 échec pour chaque partie)
Part des techniques prises par le miroir, sur celles lancées face à un miroir :

| | Réglage éteint | Réglage allumé |
| --- | --- | --- |
| Chevalier | 38 / 79 (48 %) | 10 / 53 (19 %) |
| Rôdeur | 35 / 93 (38 %) | 4 / 115 (3 %) |
| Mage | 21 / 103 (20 %) | 9 / 87 (10 %) |

- Ce qui reste vient des rounds où une seule technique est prête : elle part quand même.
- Le Mage, limité par son mana, en a le plus.
- Une première série, qui ne comptait pas encore les techniques lancées, donnait 22 → 38 pour le Mage : l'écart venait du nombre de combats, pas du réglage.

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 111 OK, 0 échec, sur deux passes. Section [437] ajoutée, 11 contrôles :
  - technique évitée, ordre habituel sans le réglage, règle du Grimoire sautée ;
  - technique d'avant et miroir, défense jamais évitée ;
  - seule technique prête qui part quand même, réglage éteint qui ne fait qu'une décision ;
  - sauvegarde, ancienne sauvegarde éteinte, rechargement.
- `boot-harness.js` : 4 OK. `hero-creation-harness.js` : 44 OK. `parcours-harness.js` : 212 OK, 0 échec.
- **Mesure à 320 px** (Chromium) : l'interrupteur tient sur une ligne (de 27 à 293 px), l'aide sur 3 lignes, pas de défilement horizontal.

## Outils
`campagne-harness.js` :
- `VARIER=1` allume le réglage ;
- les techniques prises par le miroir et celles lancées face à un miroir sont comptées et affichées en fin de partie.

## Fichiers
- Fichiers modifiés : `core/state.js`, `systems/save-system.js` (protégé, accord de Seb), `systems/combat-auto-policy-system.js`, `systems/class-combat-system.js`, `ui/sortie-prep-view.js`, `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Aucun fichier ajouté.
