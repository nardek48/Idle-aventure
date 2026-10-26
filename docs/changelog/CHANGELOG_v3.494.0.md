# v3.494.0 — Chantier du héros, H2 : les rangs des sorts

Deuxième lot du chantier du héros (conception `systemes/Aethervale_Conception_Heros_v0_1.md`). Décisions de Seb du 26/10 : option A, 5 rangs liés au monde, prix validés, variante A de l'atelier.

## Ce qui change en jeu
- **Rangs des sorts** : les trois techniques et la défense de chaque classe montent du rang 0 au rang 5.
  - Technique : +8 % de dégâts par rang (Frappe lourde : 165 % → 231 % au rang 5).
  - Défense : +2 points d'effet par rang (Garde : 50 → 60 % ; Esquive : 70 → 80 % ; Barrière : 40 → 50 %).
- **Rang ouvert par le monde** : rang 1 à la Forêt, 2 au Désert, 3 aux Ruines, 4 à la Crypte, 5 à la Montagne (plus haut monde atteint).
- **Prix** : or et matériau du monde qui ouvre le rang. Un sort de 0 à 5 coûte 131 000 or, les quatre sorts 524 000 or.

  | Rang | Or | Matériau |
  | --- | --- | --- |
  | 1 | 1 000 | 4 Résines durcies |
  | 2 | 5 000 | 4 Verres trempés |
  | 3 | 15 000 | 3 Clés de voûte |
  | 4 | 30 000 | 4 Cires consacrées |
  | 5 | 80 000 | 3 Obsidiennes taillées |

- **Héros › Capacités** :
  - Les pastilles de rang, inertes jusqu'ici (« à venir »), prennent vie sous le nom de chaque sort.
  - Une flèche verte sur l'icône signale un rang à acheter.
  - La carte dépliée montre le gain (« Dégâts 205 % → 218 % »), le prix, le stock et le bouton « Monter au rang n ».
  - La description du sort donne la valeur classée.
- **Résumé** : la tuile Capacités affiche « Rangs n/20 · n à acheter », avec une pastille.
- Le rang s'applique après les talents : la Garde avec Mur (65 %) passe à 75 % au rang 5. Le Grimoire, l'aperçu du combat et le robot jouent le kit classé.

## Mesures
Banc `montagne-acte3-bench.js --rang`, héros de fin de campagne H1, 30 runs (Chevalier / Rôdeur / Mage) :
- un sort au rang 5 vaut à peu près 50 points d'entraînement ;
- le Wyrm passe de 59 / 32 / 40 rounds à 52 / 28 / 34, contre 51 / 29 / 34 avec un entraînement à 250 au lieu de 200 ;
- le Dragon ancien est gagné à 97 / 100 / 100 %, contre 97 / 93 / 90 % sans rang.

## Code
- **Fichier ajouté** : `js/systems/skill-rank-system.js` (`SkillRanks`, `SKILL_RANK_PRICES`). Il est chargé dans `index.html` après `talent-system.js` et ajouté au précache de `sw.js`.
- **Fichier protégé (accord Seb)** : `systems/save-system.js`, nouvel état `skillRanks` (`buildSaveData`, `restoreBaseState`, `fullResetState`) ; valeur par défaut dans `core/state.js`.
- `data/class-skills.js` : `getClassSkills` applique les rangs après les talents, et `getSkillDescText` donne la valeur classée.
- `ui/heros-view.js` : pastilles, flèche, bloc « rang suivant », `buySkillRank`.
- `ui/heros-screens-view.js` : tuile Capacités.
- `css/04-panel-hero-summary.css` : styles des rangs (l'ancien emplacement réservé `.pc-skill-rank` est retiré).
- `lang/en.js` : 13 textes ajoutés, 1 retiré (« à venir »).

## Outils
- `round-harness.js` : section [323] (valeurs, talents puis rangs, prix, monde, achat, sauvegarde) ; [CAP] et [ENCRE] mis à jour.
- `montagne-acte3-bench.js` : option `--rang N[,dmg,cd,coût]`.
- `atelier/rangs-sorts.html` : l'atelier validé (variante A).
