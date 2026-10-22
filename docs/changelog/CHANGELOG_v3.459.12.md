# v3.459.12 — Lot 10e : régler d'un coup un combat sans danger (audit I4)

## Le constat
80 % des combats sont des combats ordinaires : 2 rounds en médiane, 3 % des PV perdus. Du remplissage, à jouer quand même.

## Ce qui change (atelier `atelier/regler-dun-coup.html`, variante B choisie par Seb)
- Sous la barre de vie de la cible, une puce verte **« ✓ Sans danger · Régler d'un coup »** apparaît quand :
  - chaque ennemi du combat est ordinaire (ni boss, ni élite) et jugé « Sans danger » par la prévision ;
  - l'usure prévue fait au plus **25 %** des PV actuels (la prévision d'un groupe peut doubler en vrai : 110 prévus, ~200 réels sur La Meute) ;
  - aucune alerte n'est affichée ;
  - le combat se joue dans une quête, une chasse ou sur la carte, **pas en donjon** (à discuter : donjon déjà fait plusieurs fois, ou donjons plus durs).
- Un toucher joue tout le combat d'un trait : les vrais tours du moteur, avec les règles du Grimoire. PV perdus, butin, quêtes et victoires sont ceux d'un combat joué. Le mode Tactique ou Grimoire du joueur est rendu tel quel.
- Le combat s'arrête et rend la main si les PV passent sous **30 %**, ou si une fenêtre s'ouvre.

## Code
- `combat-forecast-system.js` : `CombatQuick` (`available`, gardé 500 ms ; `resolve`), seuils `QUICK_FIGHT_MAX_COST` et `QUICK_FIGHT_STOP_PCT`.
- `combat-screen-view.js` : la puce et `cbxQuickFight()` ; `03-combat-screen.css` : `.cbx-chip.is-quick` ; `en.js`.
- Aucun fichier protégé : le moteur est appelé de l'extérieur (`CombatEngine.tickRoundClock`). Aucun fichier ajouté au jeu.

## Contrôles
- Chromium, La Meute affamée : la puce s'affiche, un toucher abat les 2 loups (4 000 → 3 938 PV), la meute suivante arrive, mode Tactique rendu, aucune erreur.
- Harnais [270] (puce, résolution, victoires, mode rendu, élite, donjon, usure, arrêt sous 30 %) ; round-harness 4550 OK, 0 échec (deux passes) ; boot, création du héros, parcours OK ; i18n 100 %, 0 orphelin.
