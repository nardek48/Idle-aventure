# v3.781.0 — Tutoriels sur l'écran, lot 1 (13/11/2026)

Décision de Seb (13/11, option A) : les tutoriels de Forêt et Désert qui présentent un écran passent sur l'écran, par lots d'environ 7. Bulle A de l'atelier `tutoriels-ecran.html` (validée le 10/11), sans nouvel atelier ; captures validées par Seb. Aucun fichier protégé modifié, aucun changement de sauvegarde.

## Ce qui change
- **7 tutoriels de plus sur l'écran** (`ui/coach-view.js`, 14 en tout) :

  | Tutoriel | Écran | Bulles |
  |---|---|---|
  | L'Amélioration (forest_03) | Héros, la fiche Stats s'ouvre | la caractéristique principale, l'achat, ce que fait chacune |
  | La Boutique (forest_04) | Potions | les potions, le prix, 2 par sortie |
  | Fabriquer une ration (forest_08) | Village › Ateliers (ouvert par la bulle) | l'onglet, la Cuisine de camp, la recette |
  | Le Donjon (forest_13) | Donjon | la Tanière, la sortie offerte, haltes et niveaux |
  | Les compagnons (forest_wenna) | Héros › Alliés (ouvert par la bulle) | Wenna, ses PV, « Avec toi / Au camp », sa fiche |
  | Les braises (forest_15) | Camp | la Sève, la Ration moyenne, l'offrande |
  | Préparer la sortie | feuille de départ | ce que tu vas affronter, l'équipe, les réglages, Partir / Renoncer |

  Les textes viennent des tutoriels d'origine, raccourcis. Si moins de deux éléments sont à l'écran, la fenêtre d'origine s'ouvre comme avant.
- **Ménage des caravanes** (suite de la v3.780.0) :
  - `js/ui/caravan-view.js` est **supprimé** : la v3.780.0 publiée ne le chargeait ni ne le précachait plus ;
  - ses styles sont retirés (`css/04-panel-village.css`, `04-panel-living-map.css`, `04-panel-expeditions.css`) ;
  - ses entrées sont retirées des listes partagées (`css/00-cartes.css`, `00-kbtn.css`) ;
  - 41 textes orphelins sont retirés de `en.js`.

## Outil
- **`tools/audit/coach-captures.js`** (nouveau, hors jeu) : joue un tutoriel dans son vrai contexte et capture chaque bulle à taille iPhone.
  - Il part d'une sauvegarde du robot arrêtée à l'entrée de l'étape (`--saves`, avec `SAVE_OUT` et `--jusqua` du robot), accepte l'étape et ouvre l'écran.
  - `--dump` liste les éléments visibles, et dit pour chaque bulle si son élément est trouvé, à l'écran et au premier plan.

## Contrôles
- `round-harness` 7130 OK, 0 échec, sur 2 passes ([513] vérifie les 14 tutoriels).
- boot 4 OK ; création du héros 46 OK ; parcours complet 237 OK sur 2 passes. Un échec isolé de P7 avant le ménage ne s'est pas reproduit.
- Captures : 23 bulles sur 23 à l'écran.
- i18n 100 %, 0 orphelin. Accolades CSS équilibrées.
- Quoi de neuf : une ligne (FR + EN).
