# v3.737.0 — La Silhouette face au Rôdeur ; journal des Petites Aventures (07/11/2026)

## Changé
- **La Silhouette (tour_18) face au Rôdeur** (diagnostic `tools/sim/silhouette-rodeur-bench.js`, piste E, puis PV ×3,1 décidés par Seb le 07/11) : « elle se bat comme toi » — le Rôdeur ne se soigne pas, elle non plus : aucun soin ni annonce de soin, et PV ×3,1 au lieu de ×4,25. Chevalier et Mage inchangés. `TOWER_SILHOUETTE_VS_CLASS` et `TowerSystem.copyClassRule` (`js/systems/tower-system.js`), drapeau `noHeal` posé à la création du boss (`quest-enemy-system.js`), seuil de soin du pronostic à 0, pronostic « Ce que tu vas affronter » sans Soin face au Rôdeur. Journal : « Elle se bat comme toi : elle ne se soignera pas. »
  - Cause mesurée : le Rôdeur faisait autant de dégâts que le Chevalier (rapportés aux PV du boss), mais la Silhouette se soignait de 35 % de ses PV (Rafale, son contre du soin, était souvent en recharge).
  - Banc (200 parties, moteur nu) : Rôdeur 0 % → **89 %** ; Chevalier 81 %, Mage 100 % inchangés. (×3,5 sans soin donnait 59 % : au banc, l'annonce fantôme coûtait un tour au boss ; Seb a choisi ×3,1.)

## Outils
- **Journal de test** (`js/main/journal-test.js`) : nouvelle ligne `expedition_fin` (issue : dest, ko, retour, `renonce_prep`, `fuite` ; étape et case), pour comprendre pourquoi une Petite Aventure s'arrête (deux sorties sans secteur libéré à desert_03 dans le journal de Seb).
- **Parcours P7** : un échec intermittent en série complète (« aucune case ouverte » en 6 s, jamais reproduit isolément sur 21 essais, ni par accroche ni par nuit) : attente portée à 10 s et état de la carte décrit en cas d'échec.

## Contrôles
round-harness 7 104 OK, 0 échec (2 passes), dont la section [497] ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
