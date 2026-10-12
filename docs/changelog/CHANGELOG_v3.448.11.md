# Aethervale v3.448.11 — Les objets de combat rejoignent les potions, dans le Sac

Idée de Seb : ranger le Baume froid, l'Encens amer et les autres au même endroit que les potions. Option A validée : affichage seulement, le stockage ne change pas. S'applique sur la v3.448.10.

## Ce qui change
- **Héros › Équipement › Sac** : le filtre « Potions » devient **« Consommables »**. Il montre les potions et les objets de combat en stock (aussi dans « Tout »). Le titre de section suit.
- **Fiche d'un objet de combat** : ce qu'il contre, son stock, « Se prépare à l'Apothicaire. S'emporte au départ, dans la préparation de sortie. »
- **Entrepôt** : les objets de combat n'y sont plus listés (ni dans « Ma sélection »).
- Journal : la Fiole noire non utilisée est « rangée dans le Sac » (au lieu de « à l'Entrepôt »).
- Icônes des objets toujours à dessiner : le chemin est gardé, l'icône générique s'affiche.

## Ce qui ne change pas
- Le stock reste tenu par l'Entrepôt en coulisse : l'Apothicaire y dépose, la préparation de sortie y prend. Aucun nouvel état sauvegardé, aucun fichier protégé.

## Code
- `js/ui/heros-screens-view.js` : filtre et liste du Sac.
- `js/ui/equipment-view.js` : entrées et fiche (panneau partagé par la feuille « Objet »).
- `js/ui/warehouse-view.js` : `warehouseListedKeys()`.
- `js/systems/combat-item-system.js` : message de la Fiole.
- `js/lang/en.js` : 4 textes, 1 orphelin retiré.
- `tools/harness/round-harness.js` : section [235] (4 contrôles).

## Contrôles
- Chromium (390 × 844) : trois objets en stock → visibles dans le Sac (Consommables), fiche du Baume froid complète, absents de l'Entrepôt.
- Round : **4 268 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 100 %, 0 orphelin.
- Aucun fichier ajouté.
