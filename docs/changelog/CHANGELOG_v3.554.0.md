# v3.554.0 — Paliers de la Montagne : un Épique de n'importe quel monde

Retour de Seb, point 3 : le set épique de la Montagne était trop long à réunir. Le donjon n'était pas encore ouvert, l'échoppe était hors de prix (810 000 or la pièce), et il fallait farmer en espérant tomber sur le bon emplacement.

## Règle
- **montagne_09** (4 emplacements) et **montagne_13** (7 emplacements) comptent désormais une pièce **Épique ou mieux, de n'importe quel monde** (`STORY_PALIER_MONTAGNE.worldIndex` passe de 4 à 0). Les Épiques gagnés à la Crypte comptent donc tout de suite.
- Les récompenses Épiques des étapes 6, 7, 8 et 11 vont d'abord à un emplacement **sans Épique**, quel qu'en soit le monde (`equipmentFillWorld` retiré).
- C'est aussi le cas des pièces lâchées par les élites des cartes (Montagne, Ruines, Crypte) : elles vont d'abord à un emplacement sans pièce de leur rareté.
- Les textes perdent « de la Montagne » : objectifs, tutoriels, suivi (« Pièces Épiques 3/4 ») et « Ce qui manque » (« Sans pièce Épique : … »). La mention « Compte pour l'Histoire » suit la nouvelle règle.
- Le tutoriel de montagne_09 ne renvoie plus à l'échoppe.

## À relire par Seb
- Un dialogue de montagne_09 dit encore : « Ce qu'on porte, ça vient d'en bas. Ici, ça ne tiendra pas. » (Maddoc). Il n'est plus aligné sur la règle, mais je ne l'ai pas modifié.

## Fichiers
- `js/data/story-quests.js` (accord de Seb sur ce fichier) : palier, textes, récompenses.
- `js/systems/living-map-system.js` : emplacement visé par la pièce d'une élite.
- `js/lang/en.js` : 6 textes remplacés, 1 retiré.
- `tools/harness/round-harness.js` : contrôles [311], [312], [315] et [338] mis à la nouvelle règle.

Campagne (Mage) : 101 étapes réussies, 19,2 h ; montagne_09 0,4 h, montagne_13 1,3 h (le robot achetait déjà ses pièces à l'échoppe, le gain se voit surtout pour un joueur qui ne le fait pas).

Les v3.552.0 et v3.553.0 sont celles de l'autre conversation (fonds de combat, grand écran).

Aucun fichier ajouté.
