# v3.496.0 — Chantier du héros, H4 (partie A) : des compagnons qui comptent

Quatrième lot du chantier du héros (conception `systemes/Aethervale_Conception_Heros_v0_1.md`). Décisions de Seb du 26/10 :
- A puis C ;
- plancher de dégâts à 10 % ;
- atelier `compagnons-ardeur.html` en variante A, avec un bouton de remise à zéro ;
- V1 pour les PV, avec un plancher de menace à 15 %.

La partie C (rangs des compétences des compagnons) et les reliques (3 au plus par compagnon) viendront ensuite.

## Le constat (mesuré)
- **Améliorations sans effet** : à la Montagne, monter tous les compagnons de 0 à 15 paliers (+90 % de stats) ne changeait aucun combat.
- **Dégâts** : une frappe de Wenna valait environ 60 % du coup du héros en Forêt, contre 0,6 % à la Montagne.
- **Coups encaissés** : le héros encaissait 94 à 100 % des coups, si bien que les PV des compagnons ne servaient pas.

## Ce qui change en jeu
- **Plancher de dégâts** : les dégâts d'un compagnon valent au moins 10 % du coup moyen du héros (critiques comprises), multipliés par son entraînement.
  - La Forêt ne bouge pas.
  - Pour Wenna : environ +30 % au Désert et aux Ruines, ×3,6 à la Crypte, ×6 à la Montagne.
- **Entraînement réparti** : chaque palier donne +8 % au choix, en **Ardeur** (dégâts) ou en **Vigueur** (PV).
  - Les paliers déjà achetés, et le cadeau de Maddoc, restent « équilibrés » (+6 % aux deux).
  - La ligne s'allonge de 5 paliers à chaque monde atteint depuis l'arrivée du compagnon : Wenna monte à 25 paliers à la Montagne.
  - Prix : la grille des compagnons du monde qui ouvre le bloc (de 60 à 900 or en Forêt, de 1 920 à 20 000 or à la Montagne). Les 5 premiers paliers gardent leur prix d'avant.
- **« ↺ Répartir de nouveau »** : après confirmation, rend l'or des paliers Ardeur et Vigueur ; les paliers équilibrés restent.
- **Coups encaissés** : chaque compagnon a une part minimale des coups ennemis, égale à 15 % de la menace du héros multipliée par sa menace propre. Chaque palier de Vigueur ajoute +10 % de menace.
  - La Vigueur devient le choix « protéger le héros ».
  - Maddoc « Le tronc » (menace ×1,8) redevient un vrai défenseur.
- **Fiche du compagnon** : une case par palier (or, rouge ou vert, pointillés pour les paliers pas encore ouverts), deux boutons d'achat avec le gain chiffré.
- **« Or à investir »** : suit la nouvelle ligne de paliers.

## Mesures
Banc `montagne-acte3-bench.js`, héros de fin de campagne, 30 runs (Chevalier / Rôdeur / Mage).
- **Plancher de dégâts 10 %** : le Wyrm passe de 58 / 32 / 39 à 53 / 31 / 36 rounds.
- **Coups pris par le héros** :
  - 94 % aujourd'hui, 81 % avec le plancher de menace à 15 % ;
  - 80 % avec 5 paliers de Vigueur par compagnon (plancher à 10 %).
- **Campagne de la Montagne au robot**, depuis la fin de la Crypte : 20 étapes sur 20 pour les trois classes.
  - Chevalier : 20,7 h, 0 mort (3 en v3.493.0).
  - Rôdeur : 19,3 h, 0 mort.
  - Mage : 17,0 h, 2 morts (3 avant).
  - Wenna monte à 25 paliers, Maddoc à 20.
  - Il reste 466 000 à 646 000 or en fin de partie.

## Code
- **Fichier protégé (accord Seb)** : `systems/combat-engine.js`, `pickVictim` ajoute le plancher de menace relatif (`THREAT_REL_FLOOR = 0.15`).
- `data/companions.js` :
  - `COMPANION_HERO_DMG_PCT`, `COMPANION_TRAINING_PCT`, `COMPANION_VIGUEUR_THREAT` ;
  - grille de prix par monde et `COMPANION_JOIN_WORLD` ;
  - `getCompanionTrainingBonus` ;
  - `getCompanionUpgradeCost` sur toute la ligne.
- `systems/companion-system.js` :
  - état `ardeur` et `vigueur`, compris dans `upgrades`, sauvegardés et relus ;
  - `trainingMax`, `nextTrainingCost`, `resetTraining` ;
  - `buyUpgrade(id, kind)` ;
  - `heroDamageFloor` ;
  - menace de l'acteur.
- `ui/companions-view.js` (`buildCompanionTrainingHTML`, `companionResetTraining`), `ui/or-a-investir-view.js`, `css/04-panel-companions.css`.
- `lang/en.js` : 18 textes ajoutés, 3 retirés.
- Aucun fichier ajouté au jeu.

## Outils
- `round-harness.js` : section [325] (plancher, prix, bonus, longueur de ligne, achat au choix, remise à zéro, sauvegarde, plancher de menace).
- `montagne-acte3-bench.js` : options `--comp-upg`, `--comp-pct`, `--victimes`, `--rel-floor`, `--comp-vig`.
- `campagne-harness.js` : le robot suit la nouvelle ligne.
- `atelier/compagnons-ardeur.html` : l'atelier validé (variante A).
