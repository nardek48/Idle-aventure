# Aethervale v3.437.5 — Textes neutres pour le héros

Relevé au rejeu des 4 premières heures (Rôdeuse « Lyra ») : des textes s'adressaient au héros au masculin. Décision de Seb : option A, des tournures neutres, une seule version pour tous. S'applique sur la v3.437.4.

## Ce qui change
- **Camp** : « Tu es tombé au combat. » → « Tu es à terre. »
- **Retour d'absence** : « Tu es parti 30 min. » → « 30 min d'absence. »
- **Tutoriel des pactes** : « quand tu te sens prêt » → « quand tu t'en sens capable ».
- **Grimoire** : « Je suis blessé » → « Mes PV sont bas » (libellé complet et court).
- **Histoire** :
  - Maddoc (desert_08) : « Tu étais pressé, là-haut. On l'est tous. » → « Tu courais, là-haut. On court tous. »
  - L'outre (desert_03) : « Tu es allé plus loin qu'hier. » → « Tu vas plus loin qu'hier. »
  - La cité (desert_12) : « la rue par laquelle tu es venu » → « la rue par où tu arrives ».
  - Wenna (desert_18) : « Tu as l'air pareil. » → « Tu n'as pas changé. »
  - Brannoc : « petit » retiré de ses 6 répliques (« Vas-y. », « Toi, tu reviens. », « Ça tiendra un toit, ça. »…).
- Traductions anglaises alignées (« lad » retiré).

## Non traité
- `systems/combat-engine.js` (protégé) : « Tu es réduit au silence ! » dans le journal de combat, à reformuler avec l'accord de Seb.

## Code
- `js/ui/camp-view.js`, `js/ui/return-view.js`, `js/ui/tutorial-view.js`, `js/ui/grimoire-view.js`, `js/data/grimoire-conditions.js`, `js/data/story-quests.js`, `js/lang/en.js`.
- `tools/harness/round-harness.js` : le contrôle de la réplique de Maddoc suit le nouveau texte.
- Aucun fichier ajouté.

## Contrôles
- Round : 4 114 OK, 0 échec, sur deux passes. Boot : 4 OK. i18n : 100 %, aucun orphelin.
