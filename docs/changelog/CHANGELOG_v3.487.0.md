# v3.487.0 — Montagne, lot M-1 : les veines

Identité de combat de la Montagne (MT2, validée par Seb le 25/10/2026 après l'atelier `veines.html`). Seb a donné son accord pour modifier `combat-engine.js`. Rien ne change ailleurs qu'à la Montagne, que l'on n'atteint pas encore.

## La règle
- Dans chaque combat de la Montagne, **une veine affleure**. Ce n'est pas un ennemi : ton camp ne la vise jamais.
- **Tailler remplace le coup du héros** :
  - +1 Cendre vive au butin du combat ;
  - la lame du héros frappe **+15 %** jusqu'à la fin du combat, attaque de base et compétences ;
  - **+1 cran de chaleur**.
- **Chaleur** : chaque cran rend les façonnés **10 % plus forts** jusqu'à la fin du combat. Cela vaut pour toutes leurs frappes, sur le héros comme sur les compagnons.
- **Trois tailles au plus.** Laisser la veine, c'est un combat normal.
- **Cendre** :
  - elle est versée à la victoire, et perdue sur défaite ou fuite ;
  - rien en mode libre du donjon (règle de la refonte, comme la Cire) ;
  - chaque taille compte dans un compteur cumulé, qui servira à l'objectif de l'étape 4.
- **Les choix de l'étape 5** (codés au lot M-2) sont déjà lus :
  - « soi » : +20 % de lame par taille ;
  - « aeswyn » (*Le puits chaud*) : une Cendre de plus par taille.
- **Pas de veine dans les donjons.** La Gueule du volcan branchera ses vagues avec l'acte III (lot M-4).
- **Échelle d'équipement de la Montagne : ×6** (×10 avant), décision de Seb après mesure (MT7).

## Grimoire
- Nouvelle condition **« Veine intacte »** : présente et jamais taillée.
- Nouvelle action **« Tailler »**. Elle ne se propose dans l'éditeur qu'une fois la Montagne atteinte.
- La règle « Veine intacte → Tailler » fait **une taille par combat**, au premier tour. Tailler plus reste un choix manuel.

## À l'écran
- **La veine au sol**, devant les ennemis, au rendu **A « Fissure »** : une lézarde bleue qui bat.
  - En mode Tactique, la toucher la taille ; elle est inactive pendant le tour des autres et en mode Grimoire.
  - Son étiquette dit « Tailler la veine », puis « Tailler · encore n », puis « Veine épuisée ».
  - Une pastille indique la chaleur et la lame, par exemple « Chaleur +10 % · lame +15 % ».
- **Les façonnés rougeoient**, un cran par taille.
- Icônes à générer (icône générique en attendant) : action « Tailler » (`images/Icons/combat_actions/vein_cut.webp`), condition « Veine intacte » (`images/Icons/combat_status/vein_intact.webp`).

## Code
- **Fichier ajouté : `js/systems/vein-system.js`**. Il est chargé par `index.html` et précaché par `sw.js`, dans le même commit.
- `js/systems/combat-engine.js` (protégé, accord du 25/10) : cinq lignes de garde :
  - l'action `vein` ;
  - l'ouverture du combat ;
  - la lame sur l'attaque de base ;
  - la chaleur sur la frappe ennemie ;
  - la Cendre à la victoire.
- `js/systems/class-combat-system.js` : la lame sur les compétences, la pseudo-action « Tailler », le contexte du Grimoire.
- Grimoire : `grimoire-conditions.js`, `combat-auto-policy-system.js`, `grimoire-view.js`.
- `js/ui/combat-screen-view.js` et `css/03-combat-screen.css` : la veine et la chaleur.
- `js/data/equipment.js` : `EQUIP_WORLD_SCALE[4]` = 6.
- `lang/en.js` : 15 textes ajoutés.
- Rien dans la sauvegarde : la veine vit le temps d'un combat, et le compteur passe par les Hauts faits.

## Reste au lot M-2
- La **durée et le coût des combats** se calent au banc sur les vraies rencontres de l'acte I, qui portent les multiplicateurs. C'est la même démarche qu'à la Crypte.
- Le tutoriel « Les veines » (étape 2), Sarkel et *Coup de pioche*, et les choix de l'étape 5.

## Outils
- `round-harness.js` : nouvelle section [309] (20 contrôles :
  - hors de la Montagne ;
  - veine intacte ;
  - action lisible ;
  - taille ;
  - lame +15 % mesurée ;
  - chaleur ;
  - compteur ;
  - frappe ennemie ;
  - trois tailles ;
  - victoire ;
  - combat quitté ;
  - choix « soi » et « aeswyn » ;
  - mode libre ;
  - Grimoire (règle, condition, une taille par combat) ;
  - échelle ×6 ;
  - précache.)

## Contrôles
- `node --check` sur chaque JS modifié ou ajouté.
- round-harness 4942 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
- i18n : 100 %, aucun orphelin.
- Chromium, vrai écran de combat, à 390 et 320 px, sur une sauvegarde de fin de Crypte arrivée à la Montagne :
  - la veine au sol se taille d'un toucher ;
  - l'étiquette passe à « Tailler · encore 2 », la pastille affiche « Chaleur +10 % · lame +15 % » ;
  - les façonnés rougeoient ;
  - aucune erreur.
