# v3.540.0 — Tactique : la veine conseillée à montagne_04 (audit CMP-1, option B)

Décision de Seb : option B, après la mesure du mode Tactique au robot.

## La mesure (v3.539.0, 6 campagnes complètes, `--combats`)
| | Tactique | Grimoire |
|---|---|---|
| Chevalier | 20,3 h · 4 morts | 20,2 h · 3 morts |
| Rôdeur | 19,7 h · 5 morts | 25,0 h · 2 morts |
| Mage | 22,0 h · 8 morts | 20,3 h · 4 morts |

- Pas de mur en Tactique : le blocage de l'audit à montagne_04 venait du robot, qui ne taillait jamais la veine. Il est corrigé dans `tools/sim/campagne-harness.js`.
- On meurt environ deux fois plus en Tactique : montagne_02 pour le Chevalier et le Rôdeur (2 chacun), desert_10 « La nuée » pour le Mage (5). C'est à mesurer à part.
- COM-3 (Chevalier) n'est plus reproduit.

## Ce qui change en jeu
- En mode Tactique, quand l'étape en cours demande de tailler des veines (montagne_04) et que la veine du combat est intacte, le bouton conseillé devient « Tailler la veine ».
  - Le bouton porte l'anneau doré.
  - La ligne de conseil dit « Objectif de l'étape → Tailler la veine ».
- Le Grimoire ne change pas : il ne taille la veine que par ses propres règles (« Veine intacte »).
- Partout ailleurs, la veine n'est jamais conseillée : tailler réchauffe aussi les ennemis.

## Code
- `systems/class-combat-system.js` : `storyWantsVein`, et `chooseRoundAction(false)` (la suggestion) rend « vein ».
- `ui/combat-screen-view.js` : le conseil, et la classe `is-suggested` sur la veine.
- `css/03-combat-screen.css` : l'anneau doré de la veine.
- `en.js` : 1 texte.
- Harnais [358].
- Aucun fichier protégé, aucun état sauvegardé, aucun fichier ajouté.

## Contrôles
- Round : 5 385 OK, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 100 %.
- Chromium à 390 et 320 px, combat de « Ça ne fond pas » (montagne_04 acceptée) : la suggestion est « vein », et la veine porte l'anneau doré. 0 erreur.
- Campagne Tactique (Chevalier) : 101 OK, 0 échec, 20,0 h. 5 veines taillées à montagne_04, en un passage.
