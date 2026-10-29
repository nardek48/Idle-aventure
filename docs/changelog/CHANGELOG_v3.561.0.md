# v3.561.0 — Le Grand Ouvrage

Retour de Seb, point 9 : depuis les Ruines, les ressources débordent. Le banc des débouchés le confirme : aux Ruines, à la Crypte et à la Montagne, les 6 matières brutes restent au plafond 100 % du temps, avec 2 300 à 7 200 unités perdues par jour. Option E et fiche B choisies dans l'atelier `atelier/grand-ouvrage.html`.

## Ce qui change
- **Le Grand Ouvrage**, en tête des bâtiments du Village dès l'arrivée aux Ruines.
- On y verse **tout type de ressource**. Valeur, en points :
  - matière brute : 1 ;
  - matériau de monde : 25 ;
  - produit : la somme de ses ingrédients, calculée à partir des recettes des ateliers (planche 5, bloc 8, pain 20, acier 21, ration 35, Clé de voûte 85).
- **« Verser le surplus »** prend les matières brutes au-dessus de la moitié du plafond et de la réserve protégée, comme la caravane.
- **« Choisir quoi verser »** déplie la liste de toutes les ressources en stock, avec − / + par pas de 10 % et un bouton « Verser la sélection ».
- **Paliers** : le palier n coûte 2 000 × 1,12^(n−1), sans fin. Chaque palier donne **+1 % d'or**, sur l'or des combats, de la Taverne et des caravanes (option 1).
- **Hauts faits** (Village) aux paliers 5, 10, 15, 20 et 25 : « Première arche », « L'arche tient », « Une voûte au village », « L'Ouvrage d'Edda », « Plus rien ne se perd ». Ils rapportent 500 à 8 000 or.
- La sauvegarde est rangée dans `game.village.grandOuvrage`, déjà sauvegardé tel quel. `save-system.js` n'est pas touché.

## Images à faire (icône générique d'ici là, vrais chemins gardés)
- `images/Icons/village_buildings/grand_ouvrage.webp`
- `images/Icons/achivement/hf_vil_ouvrage_5.webp`, `_10`, `_15`, `_20`, `_25`

## Fichiers
- **Nouveaux** (ajoutés à `index.html` et au précache de `sw.js`) :
  - `js/systems/grand-ouvrage-system.js`
  - `js/ui/grand-ouvrage-view.js`
- `js/systems/stats-system.js` (fichier protégé, accord de Seb) : une ligne, `goldMult += GrandOuvrage.getGoldBonus()`.
- `js/systems/tavern-system.js` : bonus appliqué dans `getPayout`.
- `js/systems/caravan-system.js` : bonus appliqué au déchargement.
- `js/ui/village-view.js` : la carte en tête de la grille.
- `css/04-panel-village.css` : styles `.go-*`.
- `js/data/achievements.js` : 5 hauts faits.
- `js/lang/en.js` : 36 textes.
- `tools/harness/round-harness.js` : contrôle [376] ; [133] compte 79 hauts faits, dont 10 au Village.
