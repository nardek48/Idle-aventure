# v3.473.0 — Combat épuré en Grimoire

Question de Seb : en Grimoire, tout est automatique, on pourrait retirer des informations pour mieux voir les monstres. Atelier `atelier/grimoire-epure.html` (option 1, vue épurée), puis choix de Seb : garder les deux vues, avec un interrupteur dans les Paramètres, allumé par défaut.

## Ce qui change en jeu
- **Paramètres › Jeu : « Combat épuré en Grimoire »**, allumé par défaut. Réglage propre à l'appareil, comme le fil rouge et les mises en scène des boss.
- En Grimoire, avec l'interrupteur allumé :
  - **retirés** : l'ordre d'initiative, les 4 compétences et « Le Grimoire joue pour toute l'équipe », le nom et le niveau du héros, la ligne de célérité, le nom des compagnons ;
  - **compactés** : le héros tient sur une ligne (portrait, jauge de classe, PV) ; en groupe, les compagnons passent dessous, côte à côte (portrait, PV, charges, recharge) ;
  - **gardés** : la barre du haut (lieu, or, vitesse, Fuir), l'ennemi (nom, PV, états), la règle jouée par le Grimoire, les 2 potions (à droite, toujours touchables).
- Le mode Tactique ne change pas. Changer l'interrupteur s'applique dès le retour sur le combat.

## Mesures (Chromium, hauteur de la scène)
| Écran | Complet | Épuré |
| --- | --- | --- |
| 390 px, seul | 457 px | 652 px (+195) |
| 390 px, en groupe | 483 px | 606 px (+123) |
| 320 px, seul | 191 px | 386 px (+195) |
| 320 px, en groupe | 217 px | 340 px (+123) |

À 390 px le monstre garde sa taille (réglée sur la largeur) : on gagne du décor. À 320 px, la scène double et le monstre grandit nettement.

## Code
- `systems/prefs-system.js` : préférence `grimEpure` (vraie par défaut).
- `ui/settings-view.js` : l'interrupteur dans Paramètres › Jeu.
- `ui/combat-screen-view.js` : `applyEpure` pose `is-epure` (et `is-group` en groupe) sur l'écran à chaque image ; `cbxIsEpure` pour le harnais.
- `css/03-combat-screen.css` : section 5, vue épurée.
- `lang/en.js` : 2 textes.
- Aucun fichier protégé, aucun fichier ajouté, rien dans la sauvegarde.

## Outils
- `round-harness.js` :
  - section [294] (8 contrôles : préférence par défaut, Grimoire/Tactique, interrupteur, classe posée à chaque image, CSS) ;
  - [181] : trois interrupteurs dans l'onglet Jeu.

## Contrôles
- Chromium, vrai jeu, 390 et 320 px, seul et en groupe : vue épurée en Grimoire, vue complète interrupteur éteint, Tactique inchangée ; l'interrupteur bascule l'écran au retour sur le combat ; rien ne déborde.
- i18n 100 %, aucun orphelin.
- round-harness 4837 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
