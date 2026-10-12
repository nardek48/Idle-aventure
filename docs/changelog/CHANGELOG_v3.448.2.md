# Aethervale v3.448.2 — Le Trône de sable redevient franchissable

Constat de l'audit du 11/10 : Nezzam à 0 / 3 / 3 % (Chevalier / Rôdeur / Mage, profil campagne) pour une cible de 75 à 90 %. Décision de Seb : option B (corriger la référence, puis recaler). Accord de Seb pour toucher `progression-system.js`. S'applique sur la v3.448.1.

## La cause
- Banc rejoué sur chaque version depuis la v3.365 : 75 / 85 / 100 % jusqu'à la v3.422, puis 0 / 0 / 10 % dès la v3.423 (point D : les ennemis suivent la force du héros). Le coup spécial avancé (v3.439) et l'initiative (v3.447) ne pèsent presque rien.
- Le Trône est déclaré sur l'**aventure 0** du Désert, alors qu'il clôt le chapitre II (desert_17). Ses ennemis étaient donc ajustés en comparant le héros au héros de **début** de Désert (217 dégâts par round au lieu de 371) : PV et puissance ×1,17 à 1,31. C'était aussi le cas en jeu, pas seulement au banc.

## Ce qui change
- **Référence de quête** : une quête peut déclarer `heroRef`. Le Trône prend `joueurDesert2` (fin du chapitre II). Toutes les autres quêtes gardent la référence de leur aventure.
- **Recalage** : puissance des rencontres ×6,5 → **×6** ; puissance de Nezzam ×1,7 → **×1,4**. PV inchangés.

## Mesure (nezzam-bench, 40 runs par classe)
| | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| Campagne, avant | 0 % | 3 % | 3 % |
| Campagne, référence seule | 13 % | 43 % | 75 % |
| **Campagne, v3.448.2** | **75 %** | **88 %** | **98 %** |
| Fin du Désert, v3.448.2 | 100 % | 100 % | 100 % |

Campagne : 63-68 % de PV à l'arrivée, 27-46 % à la fin, 1,4-2 potions, Nezzam en 23-28 rounds (cibles du document : 60-75 %, 20-40 %, 1-2, 20-30). Plafond-bench (20 runs) : 70 / 98 / 100 % en campagne, 98 / 100 / 100 % en fin de Désert.

## Code
- `js/systems/progression-system.js` (protégé, accord de Seb) : `_heroRefKey`, lu par `getHeroScale`.
- `js/systems/quest-enemy-system.js` : `spawnFor` pose la référence de la quête le temps de la génération, puis la rend.
- `js/data/adventure-quests.js` : `aq_desert_trone` — `heroRef`, `enemyPowerMult` 6, `bossPowerMult` 1,4.
- `tools/harness/round-harness.js` : section [226] (6 contrôles).
- Aucun fichier ajouté, aucun nouvel état sauvegardé.

## À vérifier
- « La nuée » (Désert, aventure 0, milieu de monde) peut avoir le même écart si elle se joue après « La descente ».

## Contrôles
- Round : **4 220 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. Campagne : 59 OK. i18n : 100 %, 0 orphelin.
- `node --check` sur les fichiers modifiés.
