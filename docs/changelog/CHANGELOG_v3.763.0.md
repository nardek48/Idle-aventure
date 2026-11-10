# v3.763.0 — Équilibre des classes en un seul tableau (10/11/2026)

Décision de Seb (10/11, équilibrage propre, option B ; accord pour `combat-engine.js`).

## Ce qui change
- **Un seul réglage par classe** : `balance` de `js/data/classes.js` porte `damageMult` (dégâts infligés), `damageTakenMult` (dégâts reçus, nouveau) et `hpPct` (PV). Lecture unique par `getHeroClassBalance(clé)` (classes.js), utilisée par le moteur, les pronostics, la Veine et les talents.
- **Moteur** (`combat-engine.js`, protégé, accord de Seb) : les dégâts reçus de la classe s'appliquent juste après la défense, et dans l'alerte « Deux frappes ! ».
- **Pronostics** (`combat-forecast-system.js`) : `getEnemyDamagePerRound` compte les dégâts reçus de la classe, comme le moteur.
- **Retirés côté ennemis** : `classEhpGabarit` (Chevalier ÷1,3) et `classPowerGabarit` (Mage ÷1,2) de `WORLD_HERO_SCALING` (`worlds.js`), leur lecture dans `getHeroScale` et `QuestEnemyManager.getPowerMult`, `getClassGabarit`, `getClassPowerMult`, et l'exception du Dragon (`classPowerMult: { mage: 0.8 }`). Les ennemis sont les mêmes pour les trois classes.

## Valeurs (trois essais au banc)
| Classe | dégâts infligés | dégâts reçus | PV |
|---|---|---|---|
| Chevalier | ×1,15 | ×0,77 | — |
| Rôdeur | ×0,85 | ×0,9 | — |
| Mage | ×1 | ×0,85 | +5 % |

## Mesures
- `plafond-bench` (20 runs) : Cité engloutie (profil campagne) Rôdeur 30 → 60 %, Mage 60 → 80 % ; Trône de sable Rôdeur 65 → 90 % ; Seigneur orc Rôdeur 70 → 80 %, Mage 80 → 85 %.
- Robot, campagne entière, 6 parties par classe (`campagne-lot --combats --joueur --n 6`), avant → après : morts Chevalier 15 → 1, Rôdeur 6 → 1, Mage 12 → 5 (29 → 8). Temps simulé médian 31,0 → 31,2 h.
- Restent à voir dans C (courbe de référence) : Seigneur orc (forest_15) face au Mage, Porte-couronne (élite de la Crypte).

## Contrôles
- `round-harness` 7285 OK sur 3 passes ([231], [252], [344], [465], [492] mis à jour ; [514] nouveau) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; audit i18n sans texte en dur.
- Quoi de neuf : une ligne (FR + EN).
- Aucun fichier ajouté.
