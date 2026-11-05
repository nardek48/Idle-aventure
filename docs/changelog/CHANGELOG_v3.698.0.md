# v3.698.0 — Décisions : Dragon ancien, pronostic de mission, Bestiaire (Seb, 05/11, option A partout)

Décisions de Seb du 05/11, appliquées telles quelles. Mesures sur le vrai moteur ; sauvegardes d'entrée de Tour du lot v3.695.0 pour le Dragon.

## Corrigés

- **DRAGON-V2**, option A : Dragon ancien (`aq_montagne_dragon`, `montagne_19`) `bossHpMult` 3,5 → **2,6**, `bossPowerMult` 0,94 → **0,70**. Les rencontres ne changent pas. Fichier : `js/data/adventure-quests.js`.
- **DRAGON-MAGE**, option A : analyse seule, rien de changé au système de faiblesses (voir « Analyse pour Seb »). Le réglage propre au Mage est mesuré et **proposé**, pas appliqué.
- **PRONO-MISSION**, option A : le pronostic de mission ne tire plus d'ennemi au hasard. Il fait la **moyenne sur la réserve d'ennemis possibles** de la quête : `enemyFilter`, ou sinon la réserve de l'aventure. Les fonctions nouvelles sont `getQuestPool`, `spawnEach` et `averageEnemy` :
  - l'usure est la moyenne des usures, une par ennemi possible ;
  - l'ennemi de référence d'une mission sans boss est un ennemi moyen (PV, caractéristiques et approche moyennés). Si les ennemis possibles diffèrent, la ligne « Adversaire annoncé » n'est plus affichée ;
  - rencontres scriptées, boss et élites : rien ne change, ils n'étaient pas tirés.

  Recalage (un seul) : avec l'usure moyenne, le Chevalier sans arme passait à « Hors de portée » pour 57 % d'échec réel. `FORECAST_CLASS_DMG_MULT.knight` passe de 0,7 à **0,75**. Fichier : `js/systems/combat-forecast-system.js`.
- **BESTIAIRE-GOLEM**, option A : une seule fiche « Le Golem » (`golem`). Elle additionne les victoires de `golem`, `golem_tour` et `golem_sanctuaire`, et affiche les lieux des trois. Les fiches `golem_tour` et `golem_sanctuaire` sortent de la liste. C'est de l'affichage seulement : `killCounts` n'est pas touché, une ancienne sauvegarde ouvre la fiche dès qu'un des trois a été vaincu, et les hauts faits restent les mêmes. Les hauts faits « Bestiaire du monde » comptent une fiche, contre trois avant. Fichier : `js/ui/bestiary-view.js` (`BESTIARY_MERGED`). Vu dans Chromium à 390 × 844 : une seule carte Golem aux Ruines, « vaincu 8 fois » (2 + 5 + 1), lieux « Ce que la cité ne finit pas · Le dernier trait · Sanctuaire scellé » (capture en anglais : « What the City Never Finishes · The Last Stroke · Sealed Sanctuary »), aucun défilement horizontal, aucune erreur.
- `js/lang/en.js` : Quoi de neuf (une ligne).
- `tools/harness/round-harness.js` :
  - [463] : réglage du Dragon, boss neutre et ennemi ordinaire ×1,15, réserve de quête, même verdict sur 5 tirages extrêmes, ennemi moyen, coefficient du Chevalier, fiche Golem unique, somme des trois compteurs, ancienne sauvegarde, lieux ;
  - contrôle existant du Dragon : 0,94 → 0,70.

## Mesures

### DRAGON-V2 : `montagne-acte3-bench --quetes aq_montagne_dragon --runs 20 --detail`

| | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| Avant (3,5 / 0,94, relevé v3.696.0) | 95 % | 5 % | 10 % |
| Après (2,6 / 0,70) | **100 %** | **95 %** | **45 %** (58 % sur 40 runs) |
| Rounds par run | 33 | 37 | 28 |

C'est conforme à l'attendu (100 / 95 / 50 %).

### PRONO-MISSION : `forecast-calibration-bench.js .` (80 runs par profil, « Prouver sa valeur »)

| Profil | Échec réel | Avant (un tirage) | Après (moyenne) |
|---|---|---|---|
| Chevalier sans arme, 3 potions | 57 % | Très difficile 1,22 | Très difficile 1,14 |
| Rôdeur sans arme, 3 potions | 100 % | Très difficile 1,21 | Très difficile 1,21 |
| **Mage sans arme, 3 potions** | 90 % | Abordable 0,61 | **Risqué 0,93** |
| Sans rien (3 classes) | 100 % | Hors de portée 3,11 / 3,40 / 4,67 | Hors de portée 2,40 / 2,83 / 2,00 |
| Profils armés (15) | 0 % | 0,09 à 0,47 | 0,09 à 0,38 ; arme +10 « Abordable », le reste « Sans danger », comme avant |

Stabilité sur 15 graines de tirage par profil :
- **avant** : Mage sans arme 3 potions, ratio de 0,61 à 1,40 (usure de 45 à 297 PV) et trois verdicts (Abordable, Très difficile, Hors de portée) ; Rôdeur, de 0,81 à 2,43 et trois verdicts ; Chevalier, deux verdicts ;
- **après** : un seul ratio et un seul verdict par profil, pour les 21 profils.

Essai de recalage du Chevalier (0,7 / 0,75 / 0,8) : sans arme 3 potions, 1,47 / 1,14 / 0,96 ; arme +10, 0,42 / 0,38 / 0,35. 0,75 garde les verdicts officiels d'avant.

## Analyse pour Seb : « C'est quoi qui pose problème ? Les faiblesses et forces ont-elles du sens ? »

- **Ce ne sont pas les faiblesses.** Depuis v3.102.0, les boss **et les élites** (toutes `isBoss`) ignorent faiblesses et résistances (`getDamageAffinity`, `combat-engine.js`). Le « faible à la magie » du Dragon n'a **aucun effet** en combat, alors que le Bestiaire l'affiche.
- **Relevé global** : les 10 boss et les 17 élites ont tous une faiblesse et une résistance dans les données. Elles produisent **0 %** d'écart de dégâts. Seuls les 27 ennemis ordinaires (tous avec une faiblesse et une résistance) en ont une : ×1,15 ou ×0,85 sur les coups du héros (ni les compagnons ni les brûlures).
- **Mesuré** (essai de banc, faiblesse forcée sur le Dragon) : les dégâts du Mage contre le Dragon passent de 14 795 à 16 145 par round (+9 %) et ses victoires de 50 à 70 %. Mais le Rôdeur tombe de 95 à 80 % (le Dragon résiste à l'arc : 11 027 → 9 439 par round). Le Chevalier ne bouge pas.
- **Pourquoi le Mage perd quand même** : ce n'est pas un manque de dégâts. Contre le Dragon, il frappe déjà le plus fort (14 795 par round, contre 12 811 pour le Chevalier et 11 027 pour le Rôdeur). C'est sa survie qui manque :
  - à PV (1 676, contre 1 897 et 1 543) et à défense (45 %) comparables, il prend **150 PV par coup**, contre 78 pour le Chevalier et 83 pour le Rôdeur ;
  - les gros frappeurs des rencontres le touchent 9,3 fois par run, contre 6,0 et 5,3 : Ifrit et Démon mineur, qui en plus résistent à la magie et durent donc plus longtemps, et Golem de lave ;
  - il n'a pas d'amorti : 3 % d'esquive contre 8 %, Défense sur 5 % des coups contre 9 %, et le Chevalier a son gabarit ÷1,3 ;
  - ses morts tombent pour moitié dans les rencontres, pour moitié contre le Dragon, surtout sous 25 % (rage et chaleur).
- **Réglage proposé (non appliqué)** : face au Mage seulement, puissance des ennemis de cette quête ×0,8. Mesuré sur 40 runs : Mage **58 → 80 %**. Ce réglage vise la vraie cause (les coups reçus), sans toucher aux faiblesses ni aux autres classes.
- **Les faiblesses ont-elles du sens ?** Sur les ennemis ordinaires, un peu (±15 %). Sur les boss et les élites, non : elles sont décoratives, et c'est sur ces combats que le joueur les lit. Il faut choisir : soit les activer (au risque de ce que montre le Rôdeur ci-dessus), soit les retirer du Bestiaire pour les boss et les élites.

## Repéré (non corrigé)

- Le Bestiaire affiche « Résiste / Faible » pour les boss et les élites alors que le moteur les ignore (voir l'analyse).
- `getDamageAffinity` lit `game.enemy` et non la cible frappée : en groupe, un coup sur une seconde cible prend l'affinité de la première.
- Pronostic : le Mage sans arme reste sous-estimé (« Risqué » 0,93 pour 90 % d'échec réel). Ce n'est plus un effet du tirage. Il faudrait un levier propre au Mage, à décider.

## Laissés

- DRAGON-MAGE : le réglage Mage ×0,8 est seulement proposé, comme demandé.

Contrôles : node --check sur chaque JS modifié · round-harness 6 512 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 454 textes, 100 %, 0 orphelin · parcours 212 OK · Bestiaire vu dans Chromium à 390 × 844. Aucun fichier protégé touché. Aucun fichier ajouté.
