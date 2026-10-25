# v3.484.1 — Suites du lot S

Trois points validés par Seb après la v3.484.0 (« Oui pour les 3 »).

## Ce qui change en jeu
- **« Le pain d'Aeswyn »** reprend la récompense de la quête retirée « La première mouture ». Elle passe de 200 or + 10 eau à 350 or + 10 eau + 10 blé. Un nouveau joueur ne perd plus rien au début de la chaîne du Village.
- **Feuille d'un bâtiment de production, à 320 px** : quand la place manque, le bouton « Récolter » passe sous la jauge. Avant, le compteur du stock (« 1481 / 4752 ») n'avait que 52 px et débordait sur deux lignes, par-dessus la jauge. À 390 px, rien ne change.

## Images supprimées
Elles ne servaient plus depuis la v3.484.0, et aucun `sw.js` publié ne les précache :
- `images/Icons/resources/flour_icon.webp` ;
- `images/Icons/workshops/grain_mill.webp` ;
- `images/Icons/workshops/drying_rack.webp` ;
- `images/Icons/workshops/purification_station.webp`.

## Code
- `data/village-quests.js` : récompense du Pain.
- `css/04-panel-production.css` : `.prod-sheet-harvest` passe à la ligne ; la colonne de la jauge garde 110 px au moins ; le compteur ne se coupe plus.
- Aucun fichier protégé, aucun fichier ajouté, rien dans la sauvegarde.

## Outils
- `round-harness.js` : section [306] (3 contrôles : récompense, images absentes, règles CSS).

## Contrôles
- Chromium, vrai jeu, Champs et Mine :
  - à 320 px, la jauge fait 222 px de large et le compteur tient sur une ligne ;
  - à 390 px, la mise en page est inchangée.
- round-harness 4904 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK ; i18n 100 %, aucun orphelin ; aucune des 4 images supprimées n'est réclamée par le jeu (missing-icons).
