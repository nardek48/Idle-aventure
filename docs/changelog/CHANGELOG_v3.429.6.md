# Aethervale v3.429.6 — Conseil de préparation pour la Tanière du Basilic

Mesuré pendant la deuxième heure de jeu testée dans Chromium. S'applique sur la v3.429.5.

## Le constat
Un joueur qui suit l'Histoire passe du Grimoire (forest_12) aux Marques (forest_13), puis à la Tanière (forest_14) sans rien qui le renvoie aux deux élites de la Forêt (Quêtes › Aventure) ni au Terrain niveau 4. En jeu : trois échecs contre le Basilic au niveau 6, entraînement 40, équipement de l'échoppe.

Banc `tools/sim/plafond-bench.js --only taniere --runs 40`, potions et Grimoire compris (Chevalier / Rôdeur / Mage) :
- Entraînement 60 + uniques des deux élites (profil prévu) : 100 / 100 / 100 %.
- Entraînement 40 + uniques : 73 / 100 / 85 %.
- Entraînement 60, échoppe sans uniques : 0 / 0 / 0 %.
- Élites à l'entraînement 60 : 93 à 100 %. À l'entraînement 40 : 13 à 68 %.

La difficulté (`difficultyMult` 1,8, décision v3.326) n'est pas touchée : le chemin existe, il n'était pas indiqué.

## Le conseil
« Conseil : les armes des deux élites de la Forêt (Quêtes › Aventure) et un Terrain d'entraînement au niveau 4 sont presque indispensables pour tenir les quinze vagues et le Basilic. »
- Dans Quêtes › Histoire, sous l'objectif de l'étape « La tanière du Basilic ».
- Dans la feuille de lancement de la Tanière, sous l'estimation, tant que le donjon n'a jamais été vaincu.

## Code
- `js/data/dungeon.js` : champ `prepHint` sur le Donjon I.
- `js/data/story-quests.js` : champ `hint` sur forest_14.
- `js/ui/dungeon-view.js`, `js/ui/quests-view.js` : affichage, sur les classes existantes (`dsheet-ticket`, `story-step-unlock`) et l'icône `system/warning.png`.
- `js/lang/data-fields.js` : `*.prepHint` (DUNGEONS) et `*.steps.*.hint` (STORY_QUESTS) déclarés traduisibles. `js/lang/en.js` : une traduction.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages.
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 185 textes, 100 %, 0 orphelin.
- Chromium (390×844) : conseil présent sur la feuille et sur l'étape, absent de la feuille une fois le donjon vaincu. Console sans erreur.
- `node --check` sur tous les fichiers modifiés.
