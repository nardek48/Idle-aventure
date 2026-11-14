# v3.802.0 — Pronostic de la silhouette : combat seul, trait de la classe compté (14/11/2026)

Suite du chantier pronostic (audit de l'Alpha) : après les fausses alertes, le cas inverse, des morts annoncées « Abordable ». La silhouette tuait le Chevalier sous « Abordable » (4 morts sur 12 passages du robot). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic (sonde au moteur, sauvegardes du robot à tour_18, 4 combats par classe)
- **Combat seul** (`solo: true`, v3.630) : le pronostic ajoutait les compagnons (~2 500 PV et leurs dégâts), absents de ce combat.
- **Trait de la classe** : la silhouette prend le trait de ta classe (`TOWER_CLASS_ARCHETYPE`), Enragée face au Chevalier. Coups reçus réels 135 à 148 par round pour 91 estimés : le pronostic n'applique les traits qu'aux élites.
- Durée et dégâts du Chevalier justes (29 à 37 rounds pour 30 prévus) ; soin bien contré par la règle du Grimoire (0 à 1 soin passé sur 4 à 6 annonces) : l'option A (v3.799.0) tient.

## Changement
- `systems/combat-forecast-system.js` :
  - S1 : quête `solo` → aucun compagnon (PV, dégâts, soins) dans le pronostic de la mission ;
  - S2 : boss à phase `copyClass` → ses coups comptent ×`FORECAST_COPYCLASS_DMG_MULT[trait]`, `{ enraged: 1.6 }` (mesuré). Rôdeur (blindée) et Mage (silence) : rien de mesuré, inchangés.
  - `forMission` pose les deux réglages le temps du calcul, puis les retire.

## Mesure
- Sonde, après correction : Chevalier « Très difficile » (35 rounds contre 30), gagné en 31 à 33 rounds avec 44 à 60 % des PV et 2 à 3 potions ; Rôdeur « Abordable », gagné avec 71 à 79 % ; Mage « Abordable » une fois la règle contre le soin posée (« Tout préparer »), « Risqué » sans elle.
- Robot, 6 parties : 0 mort sur 504 sorties ; silhouette du Chevalier « Très difficile » et « Risqué » (gagnée à 57 et 60 %), Mage et Rôdeur « Abordable » ; « Hors de portée » 3, sans mort.
- Banc `forecast-calibration-bench.js` : sortie identique.
- Restent signalés : Seigneur de guerre orc (`aq_forest_depths`, 1 mort de Mage sur plusieurs séries) et Porte-couronne (1 mort), sous « Abordable », non reproduits dans cette série.

## Contrôles
- `round-harness` 7116 OK, 0 échec, sur 2 passes ([513l] : solo sans compagnon, drapeaux remis à zéro, trait ×1,6, autres quêtes intactes).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
